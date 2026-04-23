from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user, require_student

router = APIRouter()

@router.get("/test/protected")
def test_protected(current_user: dict = Depends(get_current_user)):
    return {"message": "token valid", "user": current_user}

@router.get("/test/student-only")
def test_student(current_user: dict = Depends(require_student)):
    return {"message": "student access confirmed", "user_id": current_user["user_id"]}