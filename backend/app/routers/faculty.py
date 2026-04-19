import oracledb
from fastapi import APIRouter, Depends, HTTPException
from app.db.database import get_connection
from app.dependencies.auth import require_faculty

router = APIRouter(prefix="/faculty", tags=["Faculty"])


# ── GET /faculty/stats ───────────────────────────────────────
@router.get("/stats")
def get_latest_stats(current_user: dict = Depends(require_faculty)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT stat_id, week_start, week_end, avg_stress, student_count,
                   trend_label, computed_at
            FROM WEEKLY_SECTION_STATS
            ORDER BY week_start DESC
            FETCH FIRST 1 ROWS ONLY
        """)
        row = cursor.fetchone()
        if not row:
            return {"message": "No stats available yet."}
            
        cols = ["stat_id", "week_start", "week_end", "avg_stress", "student_count", "trend_label", "computed_at"]
        stat = dict(zip(cols, row))
        stat["week_start"] = str(stat["week_start"]) if stat["week_start"] else None
        stat["week_end"] = str(stat["week_end"]) if stat["week_end"] else None
        stat["computed_at"] = str(stat["computed_at"]) if stat["computed_at"] else None
        return {"latest_stats": stat}
    finally:
        cursor.close()
        conn.close()


# ── GET /faculty/stats/history ───────────────────────────────
@router.get("/stats/history")
def get_stats_history(page: int = 1, current_user: dict = Depends(require_faculty)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        offset = (page - 1) * 20
        cursor.execute("""
            SELECT stat_id, week_start, week_end, avg_stress, student_count,
                   trend_label, computed_at
            FROM WEEKLY_SECTION_STATS
            ORDER BY week_start DESC
            OFFSET :1 ROWS FETCH NEXT 20 ROWS ONLY
        """, [offset])
        cols = ["stat_id", "week_start", "week_end", "avg_stress", "student_count", "trend_label", "computed_at"]
        history = []
        for r in cursor.fetchall():
            d = dict(zip(cols, r))
            d["week_start"] = str(d["week_start"]) if d["week_start"] else None
            d["week_end"] = str(d["week_end"]) if d["week_end"] else None
            d["computed_at"] = str(d["computed_at"]) if d["computed_at"] else None
            history.append(d)
            
        return {"page": page, "history": history}
    finally:
        cursor.close()
        conn.close()
