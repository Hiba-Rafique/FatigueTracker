from pydantic import BaseModel, EmailStr
from typing import Optional

class WhitelistEmailRequest(BaseModel):
    email: EmailStr

class ConfigUpdateRequest(BaseModel):
    max_caseload: int
    bri_watch: int
    bri_warning: int
    bri_critical: int
    unlock_days: int
    allowed_misses: int
    pattern_window_days: int