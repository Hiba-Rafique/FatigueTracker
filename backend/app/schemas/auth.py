from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role_id: int           # kept for future use / frontend compatibility
    first_name: str
    last_name: str
    phone_number: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role_id: str           # procedure returns VARCHAR e.g. "STUDENT", not an int
    username: str