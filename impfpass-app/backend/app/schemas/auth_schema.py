"""Schemas für Login und Zwei-Faktor-Prüfung."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    challenge_id: str
    two_factor_required: bool = True
    expires_at: datetime
    dev_code: str | None = None


class VerifyTwoFactorRequest(BaseModel):
    challenge_id: str
    code: str


class AuthUser(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser

