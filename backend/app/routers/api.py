from fastapi import APIRouter

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
