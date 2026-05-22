"""Kompakte Auth-Schicht für Demo-Login und 2FA."""

from datetime import UTC, datetime, timedelta
from hashlib import pbkdf2_hmac
from hmac import compare_digest as compare_password_digest
from secrets import compare_digest, token_urlsafe
from typing import Annotated

from fastapi import Header, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr


JWT_SECRET = "change-this-secret-in-production"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30
CHALLENGE_MINUTES = 5
EXPOSE_2FA_CODE_IN_DEV = True
DEMO_PASSWORD_SALT = b"replace-with-per-user-random-salts"


class AuthenticatedUser(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    password_hash: str


def hash_password(password: str) -> str:
    # Prototype-only helper. Production should use Argon2id or bcrypt with per-user salts.
    digest = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        DEMO_PASSWORD_SALT,
        310_000,
    )
    return digest.hex()


def verify_password(password: str, password_hash: str) -> bool:
    return compare_password_digest(hash_password(password), password_hash)


DEMO_USERS: dict[str, AuthenticatedUser] = {
    "doctor@example.com": AuthenticatedUser(
        id="usr_001",
        email="doctor@example.com",
        full_name="Dr. Demo",
        role="physician",
        password_hash=hash_password("ChangeMe!234"),
    )
}

CHALLENGES: dict[str, dict[str, object]] = {}


def public_user(user: AuthenticatedUser) -> dict[str, str]:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
    }


def create_demo_code() -> str:
    return "123456"


def create_challenge(email: str) -> tuple[str, str, datetime]:
    challenge_id = token_urlsafe(24)
    code = create_demo_code()
    expires_at = datetime.now(UTC) + timedelta(minutes=CHALLENGE_MINUTES)
    CHALLENGES[challenge_id] = {
        "email": email,
        "code": code,
        "expires_at": expires_at,
        "attempts": 0,
    }
    return challenge_id, code, expires_at


def create_access_token(user: AuthenticatedUser) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> AuthenticatedUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    email = payload.get("email")
    user = DEMO_USERS.get(email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return user


def verify_challenge(challenge_id: str, code: str) -> AuthenticatedUser:
    challenge = CHALLENGES.get(challenge_id)
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown or expired challenge",
        )

    challenge["attempts"] = int(challenge["attempts"]) + 1
    if int(challenge["attempts"]) > 5:
        CHALLENGES.pop(challenge_id, None)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts",
        )

    if datetime.now(UTC) > challenge["expires_at"]:
        CHALLENGES.pop(challenge_id, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge expired",
        )

    if not compare_digest(code.strip(), str(challenge["code"])):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    user = DEMO_USERS[str(challenge["email"])]
    CHALLENGES.pop(challenge_id, None)
    return user

