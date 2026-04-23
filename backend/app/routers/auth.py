import oracledb
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse  # ✅ NEW
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

        cursor.callproc(
            "register_student",
            [full_name, data.email, data.password, user_id]
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


# ❗ UPDATED LOGIN ENDPOINT (cookie-based auth)
@router.post("/login")
def login(data: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        user_id = cursor.var(oracledb.NUMBER)
        role    = cursor.var(oracledb.DB_TYPE_VARCHAR)
        name    = cursor.var(oracledb.DB_TYPE_VARCHAR)

        cursor.callproc(
            "auth_login",
            [data.email, data.password, user_id, role, name]
        )

        uid = user_id.getvalue()

        if uid is None or int(uid) == -1:
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