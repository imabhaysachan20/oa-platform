from typing import Optional, List, Dict
from pydantic import BaseModel
from backend.app.models.question import QuestionDifficulty


class TestCaseBase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False
    weight: float = 1.0


class TestCaseCreate(TestCaseBase):
    pass


class TestCaseResponse(TestCaseBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True


class QuestionBase(BaseModel):
    title: str
    description: str
    difficulty: QuestionDifficulty
    time_limit_ms: int = 2000
    memory_limit_kb: int = 128000
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None


class QuestionCreate(QuestionBase):
    test_cases: Optional[List[TestCaseCreate]] = None


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[QuestionDifficulty] = None
    time_limit_ms: Optional[int] = None
    memory_limit_kb: Optional[int] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None


class QuestionResponse(QuestionBase):
    id: int
    test_cases: Optional[List[TestCaseResponse]] = None

    class Config:
        from_attributes = True


class StudentQuestionView(BaseModel):
    id: int
    title: str
    description: str
    difficulty: QuestionDifficulty
    time_limit_ms: int
    memory_limit_kb: int
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    order_index: int
    last_code: Optional[str] = None
    last_language: Optional[str] = None
    starter_code: Optional[Dict[str, str]] = None
    function_signature: Optional[str] = None
    status: Optional[str] = None  # "unattempted", "submitted"

    class Config:
        from_attributes = True
