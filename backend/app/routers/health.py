import oracledb
from fastapi import APIRouter
from app.db.database import get_connection, test_connection

router = APIRouter()


@router.get("/health", tags=["Health"])
def health_check():
    is_connected = test_connection()
    return {
        "status":   "online"     if is_connected else "offline",
        "database": "connected"  if is_connected else "disconnected"
    }


@router.get("/debug/login", tags=["Debug"])
def debug_login(email: str = "saad.test2@students.nust.edu.pk", password: str = "securepass"):
    """
    Quick sanity check — calls login_user procedure directly.
    Open in browser: http://127.0.0.1:8001/debug/login
    Or with custom creds: /debug/login?email=x@y.com&password=abc
    REMOVE THIS ENDPOINT before deploying to production.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        user_id = cursor.var(oracledb.NUMBER)
        role    = cursor.var(oracledb.DB_TYPE_VARCHAR)
        name    = cursor.var(oracledb.DB_TYPE_VARCHAR)

        cursor.callproc("auth_login", [email, password, user_id, role, name])

        uid = user_id.getvalue()
        return {
            "raw_user_id": uid,
            "user_id":     int(uid) if uid is not None else None,
            "role":        role.getvalue(),
            "name":        name.getvalue(),
            "login_ok":    uid is not None and int(uid) != -1
        }
    except oracledb.DatabaseError as e:
        error_obj, = e.args
        return {
            "error":   error_obj.message,
            "code":    error_obj.code,
            "login_ok": False
        }
    finally:
        cursor.close()
        conn.close()


@router.get("/debug/objects", tags=["Debug"])
def debug_db_objects():
    """
    Shows which procedures and triggers are VALID/INVALID in Oracle.
    Open in browser: http://127.0.0.1:8001/debug/objects
    REMOVE THIS ENDPOINT before deploying to production.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT object_name, object_type, status
            FROM   user_objects
            WHERE  object_type IN ('PROCEDURE', 'TRIGGER')
            ORDER  BY object_type, object_name
        """)
        rows = cursor.fetchall()
        return {
            "objects": [
                {"name": r[0], "type": r[1], "status": r[2]}
                for r in rows
            ]
        }
    finally:
        cursor.close()
        conn.close()