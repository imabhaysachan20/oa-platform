from typing import Optional
from pydantic import BaseModel, EmailStr
from backend.app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    roll_no: Optional[str] = None
    role: UserRole

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()
