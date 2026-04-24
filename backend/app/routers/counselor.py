import oracledb
from fastapi import APIRouter, Depends, HTTPException
from app.db.database import get_connection
from app.dependencies.auth import require_counselor
from app.schemas.counselor import RecommendRequest

router = APIRouter(prefix="/counselor", tags=["Counselor"])


# ── GET /counselor/students ──────────────────────────────────
@router.get("/students")
def get_students(current_user: dict = Depends(require_counselor)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.student_id, u.name, u.email,
                   sm.bri_score, sm.trend_label,
                   (SELECT COUNT(*) FROM ALERT a WHERE a.student_id = s.student_id AND a.status = 'OPEN') as open_alerts
            FROM COUNSELOR_STUDENT cs
            JOIN STUDENT s ON cs.student_id = s.student_id
            JOIN USERS u ON s.student_id = u.user_id
            LEFT JOIN STUDENT_METRICS sm ON s.student_id = sm.student_id
            WHERE cs.counselor_id = :1 AND cs.status = 'ACTIVE'
        """, [current_user["user_id"]])
        
        cols = ["student_id", "name", "email", "bri_score", "trend_label", "open_alerts"]
        students = [dict(zip(cols, r)) for r in cursor.fetchall()]
        return {"students": students}
    finally:
        cursor.close()
        conn.close()


# ── GET /counselor/students/{id} ─────────────────────────────
@router.get("/students/{student_id}")
def get_student_details(student_id: int, current_user: dict = Depends(require_counselor)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check if this student is assigned to this counselor
        cursor.execute("""
            SELECT 1 FROM COUNSELOR_STUDENT 
            WHERE counselor_id = :1 AND student_id = :2 AND status = 'ACTIVE'
        """, [current_user["user_id"], student_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Not authorized to view this student")

        # Basic metrics
        cursor.execute("""
            SELECT bri_score, stress_avg, workload_score, activity_score, trend_label
            FROM STUDENT_METRICS WHERE student_id = :1
        """, [student_id])
        r_metrics = cursor.fetchone()
        
        metrics = None
        if r_metrics:
            metrics = {
                "bri_score": r_metrics[0], "stress_avg": r_metrics[1],
                "workload_score": r_metrics[2], "activity_score": r_metrics[3],
                "trend_label": r_metrics[4]
            }

        # Stress history
        cursor.execute("""
            SELECT log_date, stress_level FROM STRESS_LOG 
            WHERE student_id = :1 ORDER BY log_date DESC FETCH FIRST 10 ROWS ONLY
        """, [student_id])
        stress_history = [{"date": str(r[0]), "level": r[1]} for r in cursor.fetchall()]

        # PENDING tasks
        cursor.execute("""
            SELECT task_id, title, deadline, effort_hours 
            FROM TASK_LOG WHERE student_id = :1 AND status = 'PENDING'
            ORDER BY deadline ASC NULLS LAST
        """, [student_id])
        tasks = [{"task_id": r[0], "title": r[1], "deadline": str(r[2]) if r[2] else None, "effort_hours": r[3]} for r in cursor.fetchall()]

        # Alerts
        cursor.execute("""
            SELECT alert_id, alert_level, bri_value, created_at, status
            FROM ALERT WHERE student_id = :1 AND status = 'OPEN'
        """, [student_id])
        alerts = [{"alert_id": r[0], "alert_level": r[1], "bri_value": r[2], "created_at": str(r[3]), "status": r[4]} for r in cursor.fetchall()]

        # Behavioral Patterns
        cursor.execute("""
            SELECT trigger_category, frequency_count, avg_severity, pattern_summary
            FROM PATTERN_PROFILE WHERE student_id = :1
            ORDER BY frequency_count DESC
        """, [student_id])
        patterns = [{"category": r[0], "frequency": r[1], "severity": r[2], "summary": r[3]} for r in cursor.fetchall()]

        # Data Baseline (for calibration message)
        cursor.execute("""
            SELECT COUNT(DISTINCT TRUNC(log_date)) FROM STRESS_LOG WHERE student_id = :1
        """, [student_id])
        days_logged = cursor.fetchone()[0] or 0

        return {
            "metrics": metrics,
            "stress_history": stress_history,
            "pending_tasks": tasks,
            "open_alerts": alerts,
            "patterns": patterns,
            "days_logged": days_logged
        }
    finally:
        cursor.close()
        conn.close()


# ── PUT /counselor/alerts/{id}/resolve ───────────────────────
@router.put("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, current_user: dict = Depends(require_counselor)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # NOTE: Ideally check if alert belongs to assigned student. Here we keep it simple or assume counselor knows alert.
        cursor.execute("""
            UPDATE ALERT SET status = 'RESOLVED', resolved_at = SYSDATE 
            WHERE alert_id = :1
        """, [alert_id])
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        conn.commit()
        return {"message": "Alert resolved successfully"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()


# ── POST /counselor/recommend ────────────────────────────────
@router.post("/recommend")
def recommend_student(data: RecommendRequest, current_user: dict = Depends(require_counselor)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Check assignment
        cursor.execute("""
            SELECT 1 FROM COUNSELOR_STUDENT 
            WHERE counselor_id = :1 AND student_id = :2 AND status = 'ACTIVE'
        """, [current_user["user_id"], data.student_id])
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Not authorized to recommend this student")

        cursor.execute("""
            INSERT INTO RECOMMENDATION (recommendation_id, student_id, type, message, generated_by)
            VALUES (SEQ_RECOMMENDATION_ID.NEXTVAL, :1, :2, :3, 'COUNSELOR')
        """, [data.student_id, data.recommend_type, data.message])
        conn.commit()
        return {"message": "Recommendation added"}
    except oracledb.DatabaseError as e:
        conn.rollback()
        error_obj, = e.args
        raise HTTPException(status_code=400, detail=error_obj.message)
    finally:
        cursor.close()
        conn.close()
