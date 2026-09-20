import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class RunCodeRequest(BaseModel):
    question_id: int
    code: str
    language: str  # "python", "cpp", "java"


class PlaygroundTestCase(BaseModel):
    id: Optional[int] = None
    input: str
    expected_output: str


class AdminPlaygroundRunRequest(BaseModel):
    code: str
    language: str
    time_limit_ms: int
    memory_limit_kb: int
    test_cases: List[PlaygroundTestCase]
    title: Optional[str] = None
    question_id: Optional[int] = None
    function_name: Optional[str] = None
    parameters: Optional[List[Dict[str, Any]]] = None
    return_type: Optional[str] = None
    driver_code: Optional[Dict[str, str]] = None


class TestCaseRunResult(BaseModel):
    test_case_id: int
    input: str
    expected_output: str
    actual_output: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    passed: bool
    status: str
    time_ms: Optional[float] = None


class RunCodeResponse(BaseModel):
    question_id: int
    all_passed: bool
    passed_count: int
    total_count: int
    results: List[TestCaseRunResult]
    compile_error: Optional[str] = None


class SubmitCodeRequest(BaseModel):
    exam_id: int
    question_id: int
    code: str
    language: str
    assignment_id: Optional[int] = None


class SubmitCodeResponse(BaseModel):
    submission_id: int
    assignment_id: int
    question_id: int
    status: str
    test_cases_passed: int
    total_test_cases: int
    exec_time_ms: Optional[float] = None
    is_final: bool
    submitted_at: datetime


class SubmissionHistoryItem(BaseModel):
    id: int
    question_id: int
    language: str
    status: str
    test_cases_passed: int
    total_test_cases: int
    exec_time_ms: Optional[float] = None
    is_final: bool
    submitted_at: datetime

    class Config:
        from_attributes = True


class SubmitMCQResponseRequest(BaseModel):
    assignment_id: int
    question_id: int
    selected_option_ids: List[uuid.UUID]


class SubmitMCQResponseResponse(BaseModel):
    assignment_id: int
    question_id: int
    selected_option_ids: List[uuid.UUID]
    answered_at: Optional[datetime] = None
    is_locked: bool = False

    class Config:
        from_attributes = True
