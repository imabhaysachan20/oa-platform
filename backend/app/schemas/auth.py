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
    college: Optional[str] = None
    candidate_group: Optional[str] = None
    temp_password: Optional[str] = None

    class Config:
        from_attributes = True


class ImportedCandidateCredential(BaseModel):
    name: str
    email: str
    college: Optional[str] = None
    candidate_group: Optional[str] = None
    roll_no: str
    password: str


class CandidateImportResponse(BaseModel):
    created_count: int
    skipped_count: int
    errors: list[str] = []
    credentials: list[ImportedCandidateCredential] = []


class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    college: Optional[str] = None
    candidate_group: Optional[str] = None
    roll_no: Optional[str] = None
    password: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    college: Optional[str] = None
    candidate_group: Optional[str] = None
    roll_no: Optional[str] = None
    password: Optional[str] = None


TokenResponse.model_rebuild()
