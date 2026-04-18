import oracledb
from fastapi import APIRouter, Depends, HTTPException
from app.db.database import get_connection
from app.dependencies.auth import require_admin
from app.schemas.admin import ConfigUpdateRequest, WhitelistEmailRequest

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── GET /admin/users ─────────────────────────────────────────
@router.get("/users")
def get_users(current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, name, email, role, is_active, created_at
            FROM USERS ORDER BY created_at DESC
        """)
        cols = ["user_id", "name", "email", "role", "is_active", "created_at"]
        users = [dict(zip(cols, r)) for r in cursor.fetchall()]
        for u in users:
            if u["created_at"]:
                u["created_at"] = str(u["created_at"])
        return {"users": users}
    finally:
        cursor.close()
        conn.close()


# ── PUT /admin/users/{id}/toggle ─────────────────────────────
@router.put("/users/{user_id}/toggle")
def toggle_user(user_id: int, current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE USERS SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
            WHERE user_id = :1
        """, [user_id])
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        conn.commit()
        return {"message": f"User {user_id} active status toggled"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── POST /admin/whitelist/upload ─────────────────────────────
@router.post("/whitelist/upload")
def upload_whitelist(emails: list[WhitelistEmailRequest], current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    inserted, skipped = 0, 0
    try:
        for item in emails:
            try:
                cursor.execute("""
                    INSERT INTO EMAIL_WHITELIST (email, is_used)
                    VALUES (LOWER(:1), 0)
                """, [item.email])
                inserted += 1
            except oracledb.DatabaseError:
                skipped += 1  # duplicate email, skip silently
        conn.commit()
        return {"inserted": inserted, "skipped_duplicates": skipped}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── GET /admin/config ────────────────────────────────────────
@router.get("/config")
def get_config(current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT max_caseload, bri_watch, bri_warning, bri_critical,
                   unlock_days, allowed_misses, pattern_window_days
            FROM SYSTEM_CONFIG WHERE ROWNUM = 1
        """)
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Config not found")
        cols = ["max_caseload", "bri_watch", "bri_warning", "bri_critical",
                "unlock_days", "allowed_misses", "pattern_window_days"]
        return dict(zip(cols, row))
    finally:
        cursor.close()
        conn.close()


# ── PUT /admin/config ────────────────────────────────────────
@router.put("/config")
def update_config(data: ConfigUpdateRequest, current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.callproc("update_system_config", [
            data.max_caseload, data.bri_watch, data.bri_warning,
            data.bri_critical, data.unlock_days, data.allowed_misses,
            data.pattern_window_days
        ])
        conn.commit()
        return {"message": "System config updated successfully"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── GET /admin/analytics ─────────────────────────────────────
@router.get("/analytics")
def get_analytics(current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # BRI distribution
        cursor.execute("""
            SELECT
                COUNT(CASE WHEN bri_score < 40 THEN 1 END) AS low,
                COUNT(CASE WHEN bri_score BETWEEN 40 AND 64 THEN 1 END) AS watch,
                COUNT(CASE WHEN bri_score BETWEEN 65 AND 84 THEN 1 END) AS warning,
                COUNT(CASE WHEN bri_score >= 85 THEN 1 END) AS critical
            FROM STUDENT_METRICS
        """)
        bri = cursor.fetchone()

        # Open alerts count
        cursor.execute("SELECT COUNT(*) FROM ALERT WHERE status = 'OPEN'")
        open_alerts = cursor.fetchone()[0]

        # Counselor caseload
        cursor.execute("""
            SELECT u.name, COUNT(cs.student_id) AS active_students
            FROM COUNSELOR c
            JOIN USERS u ON c.counselor_id = u.user_id
            LEFT JOIN COUNSELOR_STUDENT cs ON c.counselor_id = cs.counselor_id AND cs.status = 'ACTIVE'
            GROUP BY u.name
        """)
        caseload = [{"counselor": r[0], "active_students": r[1]} for r in cursor.fetchall()]

        return {
            "bri_distribution": {"low": bri[0], "watch": bri[1], "warning": bri[2], "critical": bri[3]},
            "open_alerts": open_alerts,
            "counselor_caseload": caseload
        }
    finally:
        cursor.close()
        conn.close()


# ── GET /admin/audit-log ─────────────────────────────────────
@router.get("/audit-log")
def get_audit_log(page: int = 1, current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        offset = (page - 1) * 20
        cursor.execute("""
            SELECT audit_id, user_id, action, target_table, target_id, action_time
            FROM AUDIT_LOG
            ORDER BY action_time DESC
            OFFSET :1 ROWS FETCH NEXT 20 ROWS ONLY
        """, [offset])
        cols = ["audit_id", "user_id", "action", "target_table", "target_id", "action_time"]
        logs = [dict(zip(cols, r)) for r in cursor.fetchall()]
        for l in logs:
            if l["action_time"]:
                l["action_time"] = str(l["action_time"])
        return {"page": page, "audit_log": logs}
    finally:
        cursor.close()
        conn.close()