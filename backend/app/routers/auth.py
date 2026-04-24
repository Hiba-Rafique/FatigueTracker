import oracledb
import bcrypt
from jose import jwt
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.db.database import get_connection
from app.dependencies.auth import create_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(data: RegisterRequest):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        user_id = cursor.var(oracledb.NUMBER)
        full_name = f"{data.first_name} {data.last_name}".strip()
        
        # Hash the password using bcrypt directly
        # bcrypt requires bytes, so we encode to utf-8
        pwd_bytes = data.password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

        cursor.callproc(
            "register_student",
            [full_name, data.email, hashed_password, user_id]
        )
        conn.commit()

        return {
            "user_id": int(user_id.getvalue()),
            "message": "User registered successfully"
        }

    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


@router.post("/login")
def login(data: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        user_id  = cursor.var(oracledb.NUMBER)
        role     = cursor.var(oracledb.DB_TYPE_VARCHAR)
        name     = cursor.var(oracledb.DB_TYPE_VARCHAR)
        pwd_hash = cursor.var(oracledb.DB_TYPE_VARCHAR)

        # Call procedure to get user info + stored hash
        cursor.callproc(
            "auth_login",
            [data.email, user_id, role, name, pwd_hash]
        )

        uid = user_id.getvalue()
        stored_hash = pwd_hash.getvalue()

        # 1. Check if user exists
        if uid is None or int(uid) == -1 or stored_hash is None:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # 2. Verify password against hash
        # bcrypt requires bytes for both the password and the hash
        user_pwd_bytes = data.password.encode('utf-8')
        stored_hash_bytes = stored_hash.encode('utf-8')

        if not bcrypt.checkpw(user_pwd_bytes, stored_hash_bytes):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_token({
            "user_id": int(uid),
            "role": role.getvalue()
        })

        # ✅ NEW: return response with httpOnly cookie
        response = JSONResponse(content={
            "user_id":  int(uid),
            "role_id":  role.getvalue(),
            "username": name.getvalue()
        })

        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,       # 🔐 JS cannot access
            secure=False,        # ⚠️ change to True in production (HTTPS)
            samesite="lax",
            max_age=60 * 60 * 24 * 7  # 1 week
        )

        return response

    except HTTPException:
        raise
    except oracledb.DatabaseError as e:
        error_obj, = e.args
        raise HTTPException(status_code=500, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ✅ NEW: logout endpoint
@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}