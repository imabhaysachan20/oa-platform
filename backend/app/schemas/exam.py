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
    mcq_weight: float = 2.0
    mcq_count: int = 0
    easy_count: int = 1
    medium_count: int = 2
    hard_count: int = 0
    is_published: bool = True
    target_groups: Optional[List[str]] = []


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
    mcq_weight: Optional[float] = None
    mcq_count: Optional[int] = None
    easy_count: Optional[int] = None
    medium_count: Optional[int] = None
    hard_count: Optional[int] = None
    is_published: Optional[bool] = None
    target_groups: Optional[List[str]] = None
    question_ids: Optional[List[int]] = None


class ExamResponse(ExamBase):
    id: int
    pool_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    assignment_status: Optional[AssignmentStatus] = None
    is_completed: Optional[bool] = False
    is_upcoming: Optional[bool] = False
    is_expired: Optional[bool] = False
    server_time: Optional[datetime] = None

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
    total_score: Optional[float] = None
    raw_score: Optional[float] = None
    max_score: Optional[float] = None
    rank: Optional[int] = None
    submitted_at: Optional[datetime] = None
    question_scores: List[QuestionScoreBreakdown] = []


class MonitoringStudentView(BaseModel):
    assignment_id: int
    user_id: int
    name: str
    email: str
    roll_no: Optional[str] = None
    college: Optional[str] = None
    candidate_group: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    time_remaining_sec: Optional[float] = None
    submissions_count: int = 0
    current_score: Optional[float] = None
    raw_score: Optional[float] = None
    max_score: Optional[float] = None
    flags_count: int = 0
    network_status: str = "online"  # "online" | "unstable" | "offline" | "not_started"
    seconds_since_last_ping: Optional[float] = None
    disconnect_incidents_count: int = 0
    total_offline_seconds: int = 0


# ==================== PROCTORING, NETWORK & CANDIDATE DOSSIER SCHEMAS ====================

class CandidateHeartbeatRequest(BaseModel):
    assignment_id: int
    client_timestamp: Optional[datetime] = None


class CandidateHeartbeatResponse(BaseModel):
    status: str = "ok"
    server_time: datetime
    network_status: str = "online"
    incident_logged: bool = False


class NetworkIncidentItem(BaseModel):
    id: int
    assignment_id: int
    disconnected_at: datetime
    reconnected_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProctoringLogCreate(BaseModel):
    event_type: str
    title: str
    description: str
    occurred_at: datetime
    meta_data: Optional[str] = None


class BatchProctoringLogRequest(BaseModel):
    assignment_id: int
    logs: List[ProctoringLogCreate]


class ProctoringLogItem(BaseModel):
    id: int
    assignment_id: int
    event_type: str
    title: str
    description: str
    occurred_at: datetime
    meta_data: Optional[str] = None

    class Config:
        from_attributes = True


class CandidateQuestionSubmissionDossier(BaseModel):
    question_id: int
    question_title: str
    difficulty: str
    order_index: int
    correctness: float
    difficulty_weight: float
    final_score: float
    time_taken_sec: float
    has_submission: bool
    code: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    test_cases_passed: int = 0
    total_test_cases: int = 0
    exec_time_ms: Optional[float] = None
    submitted_at: Optional[datetime] = None
    question_type: str = "coding"
    description: Optional[str] = None
    mcq_options: Optional[List[dict]] = None
    selected_option_ids: Optional[List[str]] = None
    is_multi_select: bool = False


class CandidateDossierResponse(BaseModel):
    assignment_id: int
    exam_id: int
    exam_title: str
    user_id: int
    student_name: str
    email: str
    roll_no: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    total_time_sec: Optional[float] = None
    total_score: Optional[float] = None
    raw_score: Optional[float] = None
    max_score: Optional[float] = None
    rank: Optional[int] = None
    total_flags: int = 0
    flag_counts_by_type: dict = {}
    integrity_status: str = "Clean"
    proctoring_logs: List[ProctoringLogItem] = []
    questions: List[CandidateQuestionSubmissionDossier] = []
    network_status: str = "online"
    disconnect_incidents_count: int = 0
    total_offline_seconds: int = 0
    network_incidents: List[NetworkIncidentItem] = []

