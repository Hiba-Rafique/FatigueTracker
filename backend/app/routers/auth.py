import oracledb
from fastapi import APIRouter, HTTPException
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

        # Procedure signature: register_student(p_name, p_email, p_password_hash, p_user_id OUT)
        # NOTE: The SQL procedure only accepts name, email, password — not role/first_name/etc.
        # We concatenate first+last name to match p_name. Extend the procedure if you need more fields.
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


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Use DB_TYPE_VARCHAR (not oracledb.STRING) for OUT string vars
        user_id = cursor.var(oracledb.NUMBER)
        role    = cursor.var(oracledb.DB_TYPE_VARCHAR)
        name    = cursor.var(oracledb.DB_TYPE_VARCHAR)

        cursor.callproc(
            "auth_login",  # renamed - SYS has built-in LOGIN_USER
            [data.email, data.password, user_id, role, name]
        )

        uid = user_id.getvalue()

        if uid is None or int(uid) == -1:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_token({
            "user_id": int(uid),
            "role": role.getvalue()
        })

        return {
            "access_token": token,
            "token_type":   "bearer",
            "user_id":      int(uid),
            "role_id":      role.getvalue(),   # returns e.g. "STUDENT"
            "username":     name.getvalue()
        }

    except HTTPException:
        raise
    except oracledb.DatabaseError as e:
        error_obj, = e.args
        raise HTTPException(status_code=500, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()