import oracledb
from fastapi import APIRouter, Depends, HTTPException
from app.db.database import get_connection
from app.dependencies.auth import require_admin
from app.schemas.admin import ConfigUpdateRequest, WhitelistEmailRequest, StaffCreateRequest

router = APIRouter(prefix="/admin", tags=["Admin"])

def _audit(cursor, *, user_id: int, action: str, target_table: str | None = None, target_id: int | None = None):
    cursor.execute(
        """
        INSERT INTO AUDIT_LOG (audit_id, user_id, action, target_table, target_id, action_time)
        VALUES (SEQ_AUDIT_ID.NEXTVAL, :1, :2, :3, :4, SYSTIMESTAMP)
        """,
        [user_id, action, target_table, target_id],
    )


@router.post("/staff")
def create_staff_account(data: StaffCreateRequest, current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        role = (data.role or "").strip().upper()
        if role not in ("COUNSELOR", "FACULTY"):
            raise HTTPException(status_code=400, detail="Role must be COUNSELOR or FACULTY")

        user_id_var = cursor.var(oracledb.NUMBER)
        cursor.execute("""
            INSERT INTO USERS (user_id, name, email, password_hash, role, is_active)
            VALUES (SEQ_USER_ID.NEXTVAL, :1, LOWER(:2), :3, :4, 1)
            RETURNING user_id INTO :5
        """, [data.name.strip(), data.email, data.password, role, user_id_var])
        staff_user_id = int(user_id_var.getvalue()[0])

        if role == "COUNSELOR":
            max_caseload = data.max_caseload if data.max_caseload and data.max_caseload > 0 else 10
            cursor.execute("""
                INSERT INTO COUNSELOR (counselor_id, specialization, max_caseload)
                VALUES (:1, :2, :3)
            """, [staff_user_id, data.specialization, max_caseload])
        else:
            cursor.execute("""
                INSERT INTO FACULTY (faculty_id, department)
                VALUES (:1, :2)
            """, [staff_user_id, data.department])

        _audit(
            cursor,
            user_id=current_user["user_id"],
            action=f"CREATE_STAFF_{role}",
            target_table="USERS",
            target_id=staff_user_id,
        )
        conn.commit()
        return {"message": f"{role.title()} account created successfully", "user_id": staff_user_id, "role": role}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        if getattr(error_obj, "code", None) == 1:
            raise HTTPException(status_code=400, detail="Email already exists")
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


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
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action="TOGGLE_USER_ACTIVE",
            target_table="USERS",
            target_id=user_id,
        )
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
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action=f"UPLOAD_WHITELIST inserted={inserted} skipped={skipped}",
            target_table="EMAIL_WHITELIST",
            target_id=None,
        )
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
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action="UPDATE_SYSTEM_CONFIG",
            target_table="SYSTEM_CONFIG",
            target_id=None,
        )
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
            SELECT c.counselor_id, u.name, u.email, COUNT(cs.student_id) AS active_students
            FROM COUNSELOR c
            JOIN USERS u ON c.counselor_id = u.user_id
            LEFT JOIN COUNSELOR_STUDENT cs ON c.counselor_id = cs.counselor_id AND cs.status = 'ACTIVE'
            GROUP BY c.counselor_id, u.name, u.email
        """)
        caseload = [{"counselor_id": int(r[0]), "counselor": r[1], "email": r[2], "active_students": r[3]} for r in cursor.fetchall()]

        return {
            "bri_distribution": {"low": bri[0], "watch": bri[1], "warning": bri[2], "critical": bri[3]},
            "open_alerts": open_alerts,
            "counselor_caseload": caseload
        }
    finally:
        cursor.close()
        conn.close()


@router.get("/analytics/students")
def get_students_by_risk(band: str, current_user: dict = Depends(require_admin)):
    band = (band or "").strip().lower()
    if band not in ("low", "watch", "warning", "critical", "alerts"):
        raise HTTPException(status_code=400, detail="band must be one of: low, watch, warning, critical, alerts")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        where_clause = ""
        params = []
        if band == "low":
            where_clause = "sm.bri_score < 40"
        elif band == "watch":
            where_clause = "sm.bri_score BETWEEN 40 AND 64"
        elif band == "warning":
            where_clause = "sm.bri_score BETWEEN 65 AND 84"
        elif band == "critical":
            where_clause = "sm.bri_score >= 85"
        elif band == "alerts":
            where_clause = "EXISTS (SELECT 1 FROM ALERT a WHERE a.student_id = sm.student_id AND a.status = 'OPEN')"

        cursor.execute(f"""
            SELECT
                sm.student_id,
                u.name,
                u.email,
                sm.bri_score,
                sm.trend_label,
                (SELECT COUNT(*) FROM ALERT a WHERE a.student_id = sm.student_id AND a.status = 'OPEN') AS open_alerts
            FROM STUDENT_METRICS sm
            JOIN USERS u ON u.user_id = sm.student_id
            WHERE {where_clause}
            ORDER BY sm.bri_score DESC, open_alerts DESC, u.name ASC
        """, params)

        cols = ["student_id", "name", "email", "bri_score", "trend_label", "open_alerts"]
        students = [dict(zip(cols, r)) for r in cursor.fetchall()]
        for s in students:
            s["student_id"] = int(s["student_id"])
            s["open_alerts"] = int(s["open_alerts"] or 0)
        return {"band": band, "students": students}
    finally:
        cursor.close()
        conn.close()


@router.get("/counselors/{counselor_id}/students")
def get_counselor_students(counselor_id: int, current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM COUNSELOR WHERE counselor_id = :1", [counselor_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Counselor not found")

        cursor.execute("""
            SELECT
                cs.student_id,
                u.name,
                u.email,
                sm.bri_score,
                sm.trend_label,
                (SELECT COUNT(*) FROM ALERT a WHERE a.student_id = cs.student_id AND a.status = 'OPEN') AS open_alerts
            FROM COUNSELOR_STUDENT cs
            JOIN USERS u ON u.user_id = cs.student_id
            LEFT JOIN STUDENT_METRICS sm ON sm.student_id = cs.student_id
            WHERE cs.counselor_id = :1 AND cs.status = 'ACTIVE'
            ORDER BY NVL(sm.bri_score, 0) DESC, open_alerts DESC, u.name ASC
        """, [counselor_id])

        cols = ["student_id", "name", "email", "bri_score", "trend_label", "open_alerts"]
        students = [dict(zip(cols, r)) for r in cursor.fetchall()]
        for s in students:
            s["student_id"] = int(s["student_id"])
            s["open_alerts"] = int(s["open_alerts"] or 0)
        return {"counselor_id": counselor_id, "students": students}
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

@router.get("/whitelist")
def get_whitelist(current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT email, is_used
            FROM EMAIL_WHITELIST
            ORDER BY email
        """)
        rows = cursor.fetchall()
        return {
            "whitelist": [
                {"email": r[0], "is_used": r[1]}
                for r in rows
            ]
        }
    finally:
        cursor.close()
        conn.close()

@router.delete("/whitelist/{email}")
def delete_whitelist(email: str, current_user: dict = Depends(require_admin)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM EMAIL_WHITELIST
            WHERE LOWER(email) = LOWER(:1)
        """, [email])

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Email not found")

        _audit(
            cursor,
            user_id=current_user["user_id"],
            action=f"DELETE_WHITELIST_EMAIL {email.lower()}",
            target_table="EMAIL_WHITELIST",
            target_id=None,
        )
        conn.commit()
        return {"message": "Email removed from whitelist"}
    finally:
        cursor.close()
        conn.close()