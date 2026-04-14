from fastapi import APIRouter
from app.db.database import test_connection

router = APIRouter()

@router.get("/health", tags=["Health"])
def health_check():
    is_connected = test_connection()
    return {
        "status": "online" if is_connected else "offline",
        "database": "connected" if is_connected else "disconnected"
    }
