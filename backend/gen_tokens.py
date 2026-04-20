from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "fatigue_tracker_secret_key_2026"
ALGORITHM  = "HS256"

def create_token(user_id, role):
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

print(f"Student 5 Token: Bearer {create_token(5, 'STUDENT')}")
print(f"Counselor 3 Token: Bearer {create_token(3, 'COUNSELOR')}")
print(f"Faculty 4 Token: Bearer {create_token(4, 'FACULTY')}")
