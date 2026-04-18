from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user, require_student
# Base router for roles
router = APIRouter()

@router.get("/student/dashboard", tags=["Student"])
def get_student_dashboard():
    return {"message": "Placeholder for student dashboard"}

@router.get("/counselor/dashboard", tags=["Counselor"])
def get_counselor_dashboard():
    return {"message": "Placeholder for counselor dashboard"}

@router.get("/faculty/dashboard", tags=["Faculty"])
def get_faculty_dashboard():
    return {"message": "Placeholder for faculty dashboard"}

@router.get("/admin/dashboard", tags=["Admin"])
def get_admin_dashboard():
    return {"message": "Placeholder for admin dashboard"}

@router.get("/test/protected")
def test_protected(current_user: dict = Depends(get_current_user)):
    return {"message": "token valid", "user": current_user}

@router.get("/test/student-only")
def test_student(current_user: dict = Depends(require_student)):
    return {"message": "student access confirmed", "user_id": current_user["user_id"]}