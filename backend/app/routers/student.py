import oracledb
from fastapi import APIRouter, Depends, HTTPException
from app.db.database import get_connection
from app.dependencies.auth import require_student
from app.schemas.logs import StressLogRequest, TaskLogRequest, TaskStatusUpdate, ActivityLogRequest

router = APIRouter(prefix="/student", tags=["Student"])


# ── POST /student/logs/stress ────────────────────────────────
@router.post("/logs/stress")
def log_stress(data: StressLogRequest, current_user: dict = Depends(require_student)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO STRESS_LOG (student_id, stress_level, note, log_date, is_primary)
            VALUES (:1, :2, :3, NVL(:4, TRUNC(SYSDATE)), 1)
        """, [current_user["user_id"], data.stress_level, data.note, data.log_date])
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
        cursor.execute("""
            INSERT INTO TASK_LOG (task_id, student_id, title, effort_hours, deadline, priority_weight, status)
            VALUES (SEQ_TASK_ID.NEXTVAL, :1, :2, :3, :4, :5, 'PENDING')
        """, [current_user["user_id"], data.title, data.effort_hours, data.deadline, data.priority_weight])
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
        cursor.execute("""
            INSERT INTO ACTIVITY_LOG (activity_id, student_id, activity_name, category, duration_hours, energy_cost, log_date)
            VALUES (SEQ_ACTIVITY_ID.NEXTVAL, :1, :2, :3, :4, :5, NVL(:6, TRUNC(SYSDATE)))
        """, [current_user["user_id"], data.activity_name, data.category, data.duration_hours, data.energy_cost, data.log_date])
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
            SELECT bri_score, stress_avg, workload_score, activity_score,
                   consecutive_high_days, log_streak, last_log_date,
                   trend_label, recommendation_status
            FROM STUDENT_METRICS WHERE student_id = :1
        """, [current_user["user_id"]])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Student metrics not found")

        metrics = {
            "bri_score": row[0], "stress_avg": row[1],
            "workload_score": row[2], "activity_score": row[3],
            "consecutive_high_days": row[4], "log_streak": row[5],
            "last_log_date": str(row[6]) if row[6] else None,
            "trend_label": row[7], "recommendation_status": row[8]
        }

        # Upcoming tasks
        cursor.execute("""
            SELECT task_id, title, deadline, priority, status, effort_hours
            FROM TASK_LOG
            WHERE student_id = :1 AND status = 'PENDING'
            ORDER BY deadline ASC NULLS LAST
            FETCH FIRST 5 ROWS ONLY
        """, [current_user["user_id"]])
        cols = ["task_id", "title", "deadline", "priority", "status", "effort_hours"]
        tasks = [dict(zip(cols, r)) for r in cursor.fetchall()]
        for t in tasks:
            if t["deadline"]:
                t["deadline"] = str(t["deadline"])

        return {"metrics": metrics, "upcoming_tasks": tasks}
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
        if cursor.rowcount == 0:
            return {"message": "Counselor already requested or assigned"}
        conn.commit()
        return {"message": "Counselor request submitted. T8 trigger will assign one automatically."}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
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
        if not row or row[0] != '14C':
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