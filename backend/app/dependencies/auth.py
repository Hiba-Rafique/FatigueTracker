import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, Request, status

SECRET_KEY = os.getenv("SECRET_KEY", "fatigue_tracker_secret_key_2026")
ALGORITHM  = os.getenv("ALGORITHM",  "HS256")


def create_token(data: dict) -> str:
    """Generate a signed JWT valid for 24 hours."""
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(request: Request) -> dict:
    """
    Read JWT from the httpOnly cookie set at login and decode it.
    Raises 401 if the cookie is missing, expired, or tampered with.
    Usage:  current_user: dict = Depends(get_current_user)
    Payload contains: { "user_id": int, "role": str, "exp": int }
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        role    = payload.get("role")

        if user_id is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user_id or role",
            )
        return payload

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ── Role guard helpers ───────────────────────────────────────
def _require_role(required_role: str):
    def guard(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    return guard


require_student   = _require_role("STUDENT")
require_counselor = _require_role("COUNSELOR")
require_faculty   = _require_role("FACULTY")
require_admin     = _require_role("ADMIN")