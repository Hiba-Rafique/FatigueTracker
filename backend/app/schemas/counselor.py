from pydantic import BaseModel

class RecommendRequest(BaseModel):
    student_id: int
    recommend_type: str
    message: str
