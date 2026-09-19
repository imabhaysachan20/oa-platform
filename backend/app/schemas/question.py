import uuid
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, model_validator, field_validator
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


class MCQOptionBase(BaseModel):
    option_text: str
    is_correct: bool = False
    order_index: int = 0


class MCQOptionCreate(MCQOptionBase):
    pass


class MCQOptionResponse(MCQOptionBase):
    id: uuid.UUID
    question_id: int

    class Config:
        from_attributes = True


class StudentMCQOptionView(BaseModel):
    """
    Dedicated schema for student-facing MCQ options.
    Structurally excludes `is_correct` so it cannot leak to students.
    """
    id: uuid.UUID
    option_text: str
    order_index: int

    class Config:
        from_attributes = True


class QuestionBase(BaseModel):
    title: str
    description: str
    difficulty: QuestionDifficulty = QuestionDifficulty.EASY
    time_limit_ms: int = 2000
    memory_limit_kb: int = 128000
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    input_format: Optional[str] = None

    # MCQ Fields
    question_type: str = "coding"  # "coding" or "mcq"
    marks: Optional[float] = None
    mcq_time_limit_seconds: Optional[int] = None
    is_multi_select: bool = False

    # LeetCode Signature & Driver Fields
    function_name: Optional[str] = None
    function_signature: Optional[str] = None
    parameters: Optional[List[Dict[str, Any]]] = None
    return_type: Optional[str] = None
    starter_code: Optional[Dict[str, str]] = None
    driver_code: Optional[Dict[str, str]] = None

    @field_validator("function_name")
    @classmethod
    def validate_function_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            v = v.strip()
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", v):
                raise ValueError(
                    f"Invalid function name '{v}'. Function name must be a valid programming identifier with no spaces (e.g. isAnagram, twoSum)."
                )
        return v

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, v: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        if v is not None:
            for p in v:
                p_name = p.get("name", "").strip() if isinstance(p, dict) and "name" in p else ""
                if p_name and not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", p_name):
                    raise ValueError(
                        f"Invalid parameter name '{p_name}'. Parameter names must be valid identifiers without spaces (e.g. nums, target)."
                    )
        return v


class QuestionCreate(QuestionBase):
    test_cases: Optional[List[TestCaseCreate]] = None
    options: Optional[List[MCQOptionCreate]] = None

    @model_validator(mode="after")
    def validate_mcq_fields(self) -> "QuestionCreate":
        if self.question_type == "mcq":
            if not self.options or len(self.options) < 2:
                raise ValueError("MCQ questions require at least 2 options.")
            correct_count = sum(1 for o in self.options if o.is_correct)
            if not self.is_multi_select and correct_count != 1:
                raise ValueError("Single-select MCQ must have exactly one correct option.")
            if self.is_multi_select and correct_count < 1:
                raise ValueError("Multi-select MCQ must have at least one correct option.")
            if self.marks is None or self.marks <= 0:
                raise ValueError("MCQ marks must be greater than 0.")
            if self.mcq_time_limit_seconds is not None and self.mcq_time_limit_seconds <= 0:
                raise ValueError("MCQ time limit seconds must be greater than 0.")
        return self


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[QuestionDifficulty] = None
    time_limit_ms: Optional[int] = None
    memory_limit_kb: Optional[int] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    input_format: Optional[str] = None

    question_type: Optional[str] = None
    marks: Optional[float] = None
    mcq_time_limit_seconds: Optional[int] = None
    is_multi_select: Optional[bool] = None

    function_name: Optional[str] = None
    function_signature: Optional[str] = None
    parameters: Optional[List[Dict[str, Any]]] = None
    return_type: Optional[str] = None
    starter_code: Optional[Dict[str, str]] = None
    driver_code: Optional[Dict[str, str]] = None

    test_cases: Optional[List[TestCaseCreate]] = None
    options: Optional[List[MCQOptionCreate]] = None

    @field_validator("function_name")
    @classmethod
    def validate_update_function_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            v = v.strip()
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", v):
                raise ValueError(
                    f"Invalid function name '{v}'. Function name must be a valid programming identifier with no spaces (e.g. isAnagram, twoSum)."
                )
        return v

    @field_validator("parameters")
    @classmethod
    def validate_update_parameters(cls, v: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        if v is not None:
            for p in v:
                p_name = p.get("name", "").strip() if isinstance(p, dict) and "name" in p else ""
                if p_name and not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", p_name):
                    raise ValueError(
                        f"Invalid parameter name '{p_name}'. Parameter names must be valid identifiers without spaces (e.g. nums, target)."
                    )
        return v


class QuestionResponse(QuestionBase):
    id: int
    test_cases: Optional[List[TestCaseResponse]] = None
    mcq_options: Optional[List[MCQOptionResponse]] = None

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
    input_format: Optional[str] = None
    order_index: int
    last_code: Optional[str] = None
    last_language: Optional[str] = None
    starter_code: Optional[Dict[str, str]] = None
    function_signature: Optional[str] = None
    status: Optional[str] = None  # "unattempted", "submitted"

    # MCQ additions
    question_type: str = "coding"
    marks: Optional[float] = None
    mcq_time_limit_seconds: Optional[int] = None
    is_multi_select: bool = False
    question_started_at: Optional[datetime] = None
    question_deadline_at: Optional[datetime] = None
    mcq_options: Optional[List[StudentMCQOptionView]] = None
    selected_option_ids: Optional[List[uuid.UUID]] = None
    is_mcq_locked: bool = False

    class Config:
        from_attributes = True
