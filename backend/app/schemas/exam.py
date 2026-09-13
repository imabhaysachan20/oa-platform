from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from backend.app.models.exam import AssignmentStatus
from backend.app.schemas.question import StudentQuestionView, QuestionResponse


class ExamBase(BaseModel):
    title: str
    duration_minutes: int = 60
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    easy_weight: float = 10.0
    medium_weight: float = 20.0
    hard_weight: float = 30.0
    is_published: bool = True


class ExamCreate(ExamBase):
    question_ids: Optional[List[int]] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    duration_minutes: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    easy_weight: Optional[float] = None
    medium_weight: Optional[float] = None
    hard_weight: Optional[float] = None
    is_published: Optional[bool] = None
    question_ids: Optional[List[int]] = None


class ExamResponse(ExamBase):
    id: int
    pool_count: Optional[int] = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExamStartResponse(BaseModel):
    assignment_id: int
    exam_id: int
    status: AssignmentStatus
    started_at: datetime
    deadline_at: datetime
    duration_minutes: int
    questions: List[StudentQuestionView]


class MyQuestionsResponse(BaseModel):
    assignment_id: int
    exam_id: int
    exam_title: str
    status: AssignmentStatus
    started_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None
    duration_minutes: int
    server_time: datetime
    questions: List[StudentQuestionView]


class LeaderboardEntry(BaseModel):
    rank: int
    student_name: str
    roll_no: Optional[str] = None
    total_score: float
    status: str
    submitted_at: Optional[datetime] = None


class QuestionScoreBreakdown(BaseModel):
    question_id: int
    question_title: str
    difficulty: str
    correctness: float
    time_taken_sec: float
    difficulty_weight: float
    time_bonus: float
    final_score: float


class ExamResultDetail(BaseModel):
    assignment_id: int
    exam_id: int
    exam_title: str
    student_name: str
    roll_no: Optional[str] = None
    status: str
    total_score: float
    rank: Optional[int] = None
    question_scores: List[QuestionScoreBreakdown]


class MonitoringStudentView(BaseModel):
    assignment_id: int
    user_id: int
    name: str
    email: str
    roll_no: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    time_remaining_sec: Optional[float] = None
    submissions_count: int
    current_score: Optional[float] = None
