import oracledb
from fastapi import APIRouter, Depends, HTTPException
from app.db.database import get_connection
from app.dependencies.auth import require_student
from app.schemas.logs import StressLogRequest, TaskLogRequest, TaskStatusUpdate, ActivityLogRequest

router = APIRouter(prefix="/student", tags=["Student"])

def _audit(cursor, *, user_id: int, action: str, target_table: str | None = None, target_id: int | None = None):
    cursor.execute(
        """
        INSERT INTO AUDIT_LOG (audit_id, user_id, action, target_table, target_id, action_time)
        VALUES (SEQ_AUDIT_ID.NEXTVAL, :1, :2, :3, :4, SYSTIMESTAMP)
        """,
        [user_id, action, target_table, target_id],
    )


# ── POST /student/logs/stress ────────────────────────────────
@router.post("/logs/stress")
def log_stress(data: StressLogRequest, current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        stress_id_var = cursor.var(oracledb.NUMBER)
        cursor.execute("""
            INSERT INTO STRESS_LOG (student_id, stress_level, note, log_date, is_primary)
            VALUES (:1, :2, :3, NVL(:4, TRUNC(SYSDATE)), 1)
            RETURNING stress_id INTO :5
        """, [current_user["user_id"], data.stress_level, data.note, data.log_date, stress_id_var])
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action="INSERT_STRESS_LOG",
            target_table="STRESS_LOG",
            target_id=int(stress_id_var.getvalue()),
        )
        conn.commit()
        return {"message": "Stress log added successfully"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── POST /student/logs/task ──────────────────────────────────
@router.post("/logs/task")
def log_task(data: TaskLogRequest, current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        task_id_var = cursor.var(oracledb.NUMBER)
        cursor.execute("""
            INSERT INTO TASK_LOG (task_id, student_id, title, effort_hours, deadline, priority_weight, status)
            VALUES (SEQ_TASK_ID.NEXTVAL, :1, :2, :3, :4, :5, 'PENDING')
            RETURNING task_id INTO :6
        """, [current_user["user_id"], data.title, data.effort_hours, data.deadline, data.priority_weight, task_id_var])
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action="INSERT_TASK_LOG",
            target_table="TASK_LOG",
            target_id=int(task_id_var.getvalue()),
        )
        conn.commit()
        return {"message": "Task added successfully"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── PUT /student/logs/task/{id} ──────────────────────────────
@router.put("/logs/task/{task_id}")
def update_task(task_id: int, data: TaskStatusUpdate, current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE TASK_LOG SET status = :1
            WHERE task_id = :2 AND student_id = :3
        """, [data.status, task_id, current_user["user_id"]])
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action=f"UPDATE_TASK_STATUS {data.status}",
            target_table="TASK_LOG",
            target_id=task_id,
        )
        conn.commit()
        return {"message": f"Task status updated to {data.status}"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── POST /student/logs/activity ──────────────────────────────
@router.post("/logs/activity")
def log_activity(data: ActivityLogRequest, current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        category_map = {
            "GYM": "FITNESS",
            "WALK": "FITNESS",
            "YOGA": "FITNESS",
            "CYCLE": "FITNESS",
            "SPORT": "SPORTS",
            "SPORTS": "SPORTS",
            "SWIM": "SPORTS",
            "FITNESS": "FITNESS",
            "SOCIAL": "SOCIAL",
            "ENTERTAINMENT": "ENTERTAINMENT",
            "OTHER": "OTHER",
        }
        normalized_category = category_map.get((data.category or "").strip().upper())
        if not normalized_category:
            raise HTTPException(
                status_code=400,
                detail="Invalid activity category. Use FITNESS, SPORTS, ENTERTAINMENT, SOCIAL, or OTHER."
            )
        if data.energy_cost is None or data.energy_cost < 1 or data.energy_cost > 5:
            raise HTTPException(status_code=400, detail="energy_cost must be between 1 and 5")

        activity_id_var = cursor.var(oracledb.NUMBER)
        cursor.execute("""
            INSERT INTO ACTIVITY_LOG (activity_id, student_id, activity_name, category, duration_hours, energy_cost, log_date)
            VALUES (SEQ_ACTIVITY_ID.NEXTVAL, :1, :2, :3, :4, :5, NVL(:6, TRUNC(SYSDATE)))
            RETURNING activity_id INTO :7
        """, [current_user["user_id"], data.activity_name, normalized_category, data.duration_hours, data.energy_cost, data.log_date, activity_id_var])
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action="INSERT_ACTIVITY_LOG",
            target_table="ACTIVITY_LOG",
            target_id=int(activity_id_var.getvalue()),
        )
        conn.commit()
        return {"message": "Activity logged successfully"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── GET /student/dashboard ───────────────────────────────────
@router.get("/dashboard")
def get_dashboard(current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Metrics
        cursor.execute("""
            SELECT NVL(bri_score, 0), NVL(stress_avg, 0), NVL(workload_score, 0), NVL(activity_score, 0),
                   NVL(consecutive_high_days, 0), NVL(log_streak, 0), last_log_date,
                   trend_label, recommendation_status
            FROM STUDENT_METRICS
            WHERE student_id = :1
        """, [current_user["user_id"]])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Student metrics not found")

        metrics = {
            "bri_score": float(row[0]) if row[0] is not None else 0,
            "stress_avg": float(row[1]) if row[1] is not None else 0,
            "workload_score": float(row[2]) if row[2] is not None else 0,
            "activity_score": float(row[3]) if row[3] is not None else 0,
            "consecutive_high_days": int(row[4]) if row[4] is not None else 0,
            "log_streak": int(row[5]) if row[5] is not None else 0,
            "last_log_date": str(row[6]) if row[6] else None,
            "trend_label": row[7], "recommendation_status": row[8]
        }

        # Upcoming tasks
        cursor.execute("""
            SELECT task_id, title, deadline, priority_weight, status, effort_hours
            FROM TASK_LOG
            WHERE student_id = :1
              AND status = 'PENDING'
              AND (deadline IS NULL OR deadline >= TRUNC(SYSDATE))
            ORDER BY deadline ASC NULLS LAST
            FETCH FIRST 5 ROWS ONLY
        """, [current_user["user_id"]])
        cols = ["task_id", "title", "deadline", "priority_weight", "status", "effort_hours"]
        tasks = [dict(zip(cols, r)) for r in cursor.fetchall()]
        for t in tasks:
            if t["deadline"]:
                t["deadline"] = str(t["deadline"])

        return {"metrics": metrics, "upcoming_tasks": tasks}
    finally:
        cursor.close()
        conn.close()


# ── GET /student/tasks ────────────────────────────────────────
@router.get("/tasks")
def get_tasks(current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT task_id, title, deadline, priority_weight, status, effort_hours, created_at
            FROM TASK_LOG
            WHERE student_id = :1
            ORDER BY
                CASE status WHEN 'PENDING' THEN 0 WHEN 'DEFERRED' THEN 1 ELSE 2 END,
                deadline ASC NULLS LAST,
                created_at DESC
        """, [current_user["user_id"]])

        cols = ["task_id", "title", "deadline", "priority_weight", "status", "effort_hours", "created_at"]
        tasks = []
        for r in cursor.fetchall():
            d = dict(zip(cols, r))
            d["deadline"] = str(d["deadline"]) if d["deadline"] else None
            d["created_at"] = str(d["created_at"]) if d["created_at"] else None
            tasks.append(d)

        return {"tasks": tasks}
    finally:
        cursor.close()
        conn.close()


# ── GET /student/activities ───────────────────────────────────
@router.get("/activities")
def get_activities(limit: int = 30, current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        limit = max(1, min(int(limit), 200))
        cursor.execute("""
            SELECT activity_id, activity_name, category, duration_hours, energy_cost, log_date
            FROM ACTIVITY_LOG
            WHERE student_id = :1
            ORDER BY log_date DESC, activity_id DESC
            FETCH FIRST :2 ROWS ONLY
        """, [current_user["user_id"], limit])

        cols = ["activity_id", "activity_name", "category", "duration_hours", "energy_cost", "log_date"]
        activities = []
        for r in cursor.fetchall():
            d = dict(zip(cols, r))
            d["log_date"] = str(d["log_date"]) if d["log_date"] else None
            activities.append(d)

        return {"activities": activities}
    finally:
        cursor.close()
        conn.close()


# ── GET /student/recommendations ─────────────────────────────
@router.get("/recommendations")
def get_recommendations(current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check if unlocked first
        cursor.execute("""
            SELECT recommendation_status FROM STUDENT_METRICS
            WHERE student_id = :1
        """, [current_user["user_id"]])
        row = cursor.fetchone()
        if not row or row[0] != 'UNLOCKED':
            return {"status": "LOCKED", "message": "Log consistently for more days to unlock recommendations", "recommendations": []}

        cursor.execute("""
            SELECT recommendation_id, type, message, generated_by, created_at
            FROM RECOMMENDATION
            WHERE student_id = :1 AND is_active = 1
            ORDER BY created_at DESC
        """, [current_user["user_id"]])
        cols = ["recommendation_id", "type", "message", "generated_by", "created_at"]
        recs = [dict(zip(cols, r)) for r in cursor.fetchall()]
        for r in recs:
            if r["created_at"]:
                r["created_at"] = str(r["created_at"])
        return {"status": "UNLOCKED", "recommendations": recs}
    finally:
        cursor.close()
        conn.close()


# ── POST /student/request-counselor ─────────────────────────
@router.post("/request-counselor")
def request_counselor(current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE STUDENT SET counselor_requested = 1, request_date = TRUNC(SYSDATE)
            WHERE student_id = :1 AND counselor_requested = 0
        """, [current_user["user_id"]])
        _audit(
            cursor,
            user_id=current_user["user_id"],
            action="REQUEST_COUNSELOR",
            target_table="STUDENT",
            target_id=current_user["user_id"],
        )
        conn.commit()

        # After commit, T8 trigger may have assigned a counselor already.
        cursor.execute("""
            SELECT cs.counselor_id, u.name, u.email, cs.assigned_date
            FROM COUNSELOR_STUDENT cs
            JOIN USERS u ON u.user_id = cs.counselor_id
            WHERE cs.student_id = :1 AND cs.status = 'ACTIVE'
            ORDER BY cs.assigned_date DESC
            FETCH FIRST 1 ROWS ONLY
        """, [current_user["user_id"]])
        row = cursor.fetchone()

        if row:
            return {
                "status": "ASSIGNED",
                "message": f"Counselor assigned: {row[1]}",
                "counselor": {
                    "counselor_id": int(row[0]),
                    "name": row[1],
                    "email": row[2],
                    "assigned_date": str(row[3]) if row[3] else None,
                }
            }

        # If not assigned yet, confirm request state.
        cursor.execute("""
            SELECT counselor_requested, request_date
            FROM STUDENT
            WHERE student_id = :1
        """, [current_user["user_id"]])
        srow = cursor.fetchone()
        requested = int(srow[0]) == 1 if srow else False

        return {
            "status": "REQUESTED" if requested else "UNKNOWN",
            "message": "Counselor request submitted. You’ll be assigned automatically when a counselor is available.",
            "request_date": str(srow[1]) if srow and srow[1] else None,
        }
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── GET /student/counselor-status ─────────────────────────────
@router.get("/counselor-status")
def counselor_status(current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT counselor_requested, request_date
            FROM STUDENT
            WHERE student_id = :1
        """, [current_user["user_id"]])
        srow = cursor.fetchone()
        requested = int(srow[0]) == 1 if srow else False
        request_date = str(srow[1]) if srow and srow[1] else None

        cursor.execute("""
            SELECT cs.counselor_id, u.name, u.email, cs.assigned_date
            FROM COUNSELOR_STUDENT cs
            JOIN USERS u ON u.user_id = cs.counselor_id
            WHERE cs.student_id = :1 AND cs.status = 'ACTIVE'
            ORDER BY cs.assigned_date DESC
            FETCH FIRST 1 ROWS ONLY
        """, [current_user["user_id"]])
        row = cursor.fetchone()

        if row:
            return {
                "status": "ASSIGNED",
                "requested": requested,
                "request_date": request_date,
                "counselor": {
                    "counselor_id": int(row[0]),
                    "name": row[1],
                    "email": row[2],
                    "assigned_date": str(row[3]) if row[3] else None,
                }
            }

        return {
            "status": "REQUESTED" if requested else "NOT_REQUESTED",
            "requested": requested,
            "request_date": request_date,
            "counselor": None,
        }
    finally:
        cursor.close()
        conn.close()


# ── GET /student/benchmarking ────────────────────────────────
@router.get("/benchmarking")
def get_benchmarking(current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check student is 14C
        cursor.execute("""
            SELECT student_type FROM STUDENT WHERE student_id = :1
        """, [current_user["user_id"]])
        row = cursor.fetchone()
        student_type = str(row[0]).strip().upper() if row and row[0] is not None else None
        if student_type != '14C':
            raise HTTPException(status_code=403, detail="Benchmarking is only available for 14C students")

        cursor.execute("""
            SELECT
                sm.bri_score,
                sm.stress_avg,
                ROUND(PERCENT_RANK() OVER (ORDER BY sm.bri_score) * 100, 1) AS bri_percentile,
                ROUND(PERCENT_RANK() OVER (ORDER BY sm.stress_avg) * 100, 1) AS stress_percentile
            FROM STUDENT_METRICS sm
            JOIN STUDENT s ON sm.student_id = s.student_id
            WHERE s.student_type = '14C' AND sm.student_id = :1
        """, [current_user["user_id"]])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No metrics found")
        return {
            "bri_score": row[0],
            "stress_avg": row[1],
            "bri_percentile": row[2],
            "stress_percentile": row[3],
            "note": "Lower percentile = less fatigued than peers"
        }
    finally:
        cursor.close()
        conn.close()


# ── GET /student/notifications ───────────────────────────────
@router.get("/notifications")
def get_notifications(current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT notification_id, type, message, is_read, sent_at
            FROM NOTIFICATION_LOG
            WHERE user_id = :1
            ORDER BY sent_at DESC
        """, [current_user["user_id"]])
        
        cols = ["notification_id", "type", "message", "is_read", "sent_at"]
        notifications = []
        for r in cursor.fetchall():
            d = dict(zip(cols, r))
            d["sent_at"] = str(d["sent_at"]) if d["sent_at"] else None
            notifications.append(d)
            
        return {"notifications": notifications}
    finally:
        cursor.close()
        conn.close()