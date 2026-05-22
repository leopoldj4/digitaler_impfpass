"""FastAPI Router für Login und Zwei-Faktor-Authentifizierung."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    DEMO_USERS,
    EXPOSE_2FA_CODE_IN_DEV,
    AuthenticatedUser,
    create_access_token,
    create_challenge,
    get_current_user,
    public_user,
    verify_challenge,
    verify_password,
)
from app.schemas.auth_schema import AuthUser, LoginRequest, LoginResponse, TokenResponse, VerifyTwoFactorRequest

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    user = DEMO_USERS.get(payload.email.lower())
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    challenge_id, code, expires_at = create_challenge(user.email)
    return LoginResponse(
        challenge_id=challenge_id,
        expires_at=expires_at,
        dev_code=code if EXPOSE_2FA_CODE_IN_DEV else None,
    )


@router.post("/verify-2fa", response_model=TokenResponse)
def verify_two_factor(payload: VerifyTwoFactorRequest) -> TokenResponse:
    user = verify_challenge(payload.challenge_id, payload.code)
    return TokenResponse(
        access_token=create_access_token(user),
        user=AuthUser(**public_user(user)),
    )


@router.get("/me", response_model=AuthUser)
def me(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthUser:
    return AuthUser(**public_user(current_user))

