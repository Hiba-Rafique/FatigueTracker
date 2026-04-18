from pydantic import BaseModel
from typing import Optional
from datetime import date

class StressLogRequest(BaseModel):
    stress_level: int        # 1-10
    note: Optional[str] = None
    log_date: Optional[date] = None   # defaults to today in DB

class TaskLogRequest(BaseModel):
    title: str
    effort_hours: Optional[float] = None
    deadline: Optional[date] = None
    priority_weight: Optional[int] = 2  # 1-3 (LOW / MEDIUM / HIGH)

class TaskStatusUpdate(BaseModel):
    status: str   # COMPLETED / DEFERRED / PENDING

class ActivityLogRequest(BaseModel):
    activity_name: str
    category: str       # e.g. GYM, WALK, SPORT
    duration_hours: int
    energy_cost: float       # 0-20
    log_date: Optional[date] = None