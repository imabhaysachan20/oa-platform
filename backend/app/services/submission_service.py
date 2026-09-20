from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from backend.app.core.judge0 import (
    judge0_client,
    get_language_id,
    JUDGE0_STATUS_DESCRIPTIONS
)
from backend.app.models.exam import ExamAssignment, AssignmentStatus
from backend.app.models.question import Question, TestCase
from backend.app.models.submission import Submission
from backend.app.schemas.submission import (
    RunCodeResponse,
    TestCaseRunResult,
    SubmitCodeResponse
)
from backend.app.services.question_templates import wrap_code_with_driver
from backend.app.services.output_comparator import normalize_output, compare_outputs

_normalize_output = normalize_output


def get_execution_limits(language: str, time_limit_ms: Optional[int], memory_limit_kb: Optional[int]) -> tuple[float, int]:
    """
    Computes language-aware CPU time and memory limits for Judge0 sandbox.
    Prevents virtual memory starvation for JVM and Node.js runtimes in isolate.
    """
    lang = (language or "").lower().strip()
    base_cpu = float(time_limit_ms) / 1000.0 if time_limit_ms else 2.0
    base_mem = int(memory_limit_kb) if memory_limit_kb else 128000

    if lang in ["java"]:
        cpu_limit = max(base_cpu * 2.0, 4.0)
        mem_limit = max(base_mem, 1048576)
    elif lang in ["javascript", "js", "node", "nodejs"]:
        cpu_limit = max(base_cpu * 2.0, 3.0)
        mem_limit = max(base_mem, 1048576)
    elif lang in ["python", "python3", "py"]:
        cpu_limit = max(base_cpu * 1.5, 2.5)
        mem_limit = max(base_mem, 512000)
    else:
        cpu_limit = max(base_cpu, 2.0)
        mem_limit = max(base_mem, 256000)

    return cpu_limit, mem_limit


async def execute_judge0_test_cases(
    test_cases: List[Any],
    code: str,
    language: str,
    cpu_limit: float,
    mem_limit: int,
    question_id: int = 0
) -> RunCodeResponse:
    """
    Core function to execute code against a list of test cases (duck-typed to have id, input, expected_output).
    Returns a RunCodeResponse with the result.
    """
    # Enforce language-safe execution limits
    cpu_limit, mem_limit = get_execution_limits(language, int(cpu_limit * 1000.0), mem_limit)
    lang_id = get_language_id(language)
    results: List[TestCaseRunResult] = []
    compile_error: Optional[str] = None
    passed_count = 0

    for tc in test_cases:
        try:
            judge_res = await judge0_client.execute(
                source_code=code,
                language_id=lang_id,
                stdin=tc.input,
                expected_output=tc.expected_output,
                cpu_time_limit=cpu_limit,
                memory_limit_kb=mem_limit,
            )
        except Exception as exc:
            # Judge0 communication error
            results.append(TestCaseRunResult(
                test_case_id=tc.id or 0,
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output=None,
                stderr=str(exc),
                compile_output=None,
                passed=False,
                status="Execution Server Error",
                time_ms=None
            ))
            continue

        status_info = judge_res.get("status", {})
        status_id = status_info.get("id", 0)
        status_desc = status_info.get("description") or JUDGE0_STATUS_DESCRIPTIONS.get(status_id, "Unknown")

        raw_stdout = judge_res.get("stdout") or ""
        raw_stderr = judge_res.get("stderr") or ""
        raw_compile = judge_res.get("compile_output") or ""
        exec_time = judge_res.get("time")
        exec_time_ms = float(exec_time) * 1000.0 if exec_time is not None else None

        if status_id == 6 or raw_compile:  # Compilation Error
            compile_error = raw_compile or raw_stderr or "Compilation Error"
            results.append(TestCaseRunResult(
                test_case_id=tc.id or 0,
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output="",
                stderr=raw_stderr,
                compile_output=compile_error,
                passed=False,
                status="Compilation Error",
                time_ms=exec_time_ms
            ))
            break  # No need to run further test cases on compilation error

        norm_actual = _normalize_output(raw_stdout)
        norm_expected = _normalize_output(tc.expected_output)

        is_passed = (status_id == 3) or (
            status_id not in [5, 6, 7, 8, 9, 10, 11, 12]
            and not raw_stderr
            and compare_outputs(raw_stdout, tc.expected_output)
        )
        if is_passed:
            passed_count += 1
            status_desc = "Accepted"
        elif status_id not in [5, 6, 7, 8, 9, 10, 11, 12]:
            status_desc = "Wrong Answer"

        results.append(TestCaseRunResult(
            test_case_id=tc.id or 0,
            input=tc.input,
            expected_output=tc.expected_output,
            actual_output=raw_stdout,
            stderr=raw_stderr,
            compile_output=raw_compile,
            passed=is_passed,
            status=status_desc,
            time_ms=exec_time_ms
        ))

    total = len(test_cases)
    return RunCodeResponse(
        question_id=question_id,
        all_passed=(passed_count == total and total > 0),
        passed_count=passed_count,
        total_count=total,
        results=results,
        compile_error=compile_error
    )


async def run_code_samples(
    db: AsyncSession,
    question_id: int,
    code: str,
    language: str
) -> RunCodeResponse:
    """
    Execute student code against visible sample test cases synchronously via Judge0.
    Returns stdout, stderr, compile errors, and pass/fail inline.
    """
    # 1. Fetch question
    stmt_q = select(Question).where(Question.id == question_id)
    question = (await db.execute(stmt_q)).scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # 2. Fetch visible test cases
    stmt_tc = (
        select(TestCase)
        .where(TestCase.question_id == question_id, TestCase.is_hidden == False)
        .order_by(TestCase.id)
    )
    test_cases = (await db.execute(stmt_tc)).scalars().all()

    # Fallback to question sample_input/sample_output if no explicit visible test case exists
    if not test_cases and (question.sample_input is not None or question.sample_output is not None):
        mock_tc = TestCase(
            id=0,
            question_id=question.id,
            input=question.sample_input or "",
            expected_output=question.sample_output or "",
            is_hidden=False,
            weight=1.0
        )
        test_cases = [mock_tc]

    cpu_limit = float(question.time_limit_ms) / 1000.0
    mem_limit = question.memory_limit_kb

    code_to_run = wrap_code_with_driver(question.title, code, language, question=question)

    return await execute_judge0_test_cases(
        test_cases=test_cases,
        code=code_to_run,
        language=language,
        cpu_limit=cpu_limit,
        mem_limit=mem_limit,
        question_id=question_id
    )


async def submit_code_solution(
    db: AsyncSession,
    user_id: int,
    exam_id: int,
    question_id: int,
    code: str,
    language: str
) -> SubmitCodeResponse:
    """
    Submits code to Judge0 against ALL test cases (visible + hidden).
    Stores submission with is_final=True.
    """
    # 1. Verify active exam assignment
    now = datetime.now(timezone.utc)
    stmt_assign = (
        select(ExamAssignment)
        .where(ExamAssignment.exam_id == exam_id, ExamAssignment.user_id == user_id)
    )
    assignment = (await db.execute(stmt_assign)).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Exam assignment not found. Please start the exam first.")

    if assignment.status != AssignmentStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit: exam assignment is {assignment.status.value}"
        )

    if assignment.deadline_at and now > assignment.deadline_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam deadline has passed. Submissions are closed."
        )

    # 2. Fetch question and ALL test cases
    stmt_q = select(Question).where(Question.id == question_id)
    question = (await db.execute(stmt_q)).scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    stmt_tc = (
        select(TestCase)
        .where(TestCase.question_id == question_id)
        .order_by(TestCase.id)
    )
    test_cases = (await db.execute(stmt_tc)).scalars().all()

    if not test_cases:
        # Fallback if question has no test cases configured yet
        mock_tc = TestCase(
            id=0,
            question_id=question.id,
            input=question.sample_input or "",
            expected_output=question.sample_output or "",
            is_hidden=False,
            weight=1.0
        )
        test_cases = [mock_tc]

    lang_id = get_language_id(language)
    cpu_limit, mem_limit = get_execution_limits(language, question.time_limit_ms, question.memory_limit_kb)

    code_to_run = wrap_code_with_driver(question.title, code, language, question=question)

    passed_count = 0
    total_test_cases = len(test_cases)
    overall_status = "Accepted"
    max_exec_time_ms = 0.0
    first_token: Optional[str] = None

    for tc in test_cases:
        try:
            judge_res = await judge0_client.execute(
                source_code=code_to_run,
                language_id=lang_id,
                stdin=tc.input,
                expected_output=tc.expected_output,
                cpu_time_limit=cpu_limit,
                memory_limit_kb=mem_limit,
            )
        except Exception as exc:
            overall_status = "Server Error"
            break

        if not first_token and "token" in judge_res:
            first_token = judge_res["token"]

        status_info = judge_res.get("status", {})
        status_id = status_info.get("id", 0)
        status_desc = status_info.get("description") or JUDGE0_STATUS_DESCRIPTIONS.get(status_id, "Unknown")

        exec_time = judge_res.get("time")
        if exec_time is not None:
            time_ms = float(exec_time) * 1000.0
            if time_ms > max_exec_time_ms:
                max_exec_time_ms = time_ms

        raw_stdout = judge_res.get("stdout") or ""
        raw_stderr = judge_res.get("stderr") or ""
        raw_compile = judge_res.get("compile_output") or ""
        norm_actual = _normalize_output(raw_stdout)
        norm_expected = _normalize_output(tc.expected_output)

        is_passed = (status_id == 3) or (
            status_id not in [5, 6, 7, 8, 9, 10, 11, 12]
            and not raw_stderr
            and compare_outputs(raw_stdout, tc.expected_output)
        )
        if is_passed:
            passed_count += 1
        else:
            if overall_status == "Accepted":
                if status_id == 6 or raw_compile:
                    overall_status = "Compilation Error"
                    break
                elif status_id == 5:
                    overall_status = "Time Limit Exceeded"
                elif status_id in [7, 8, 9, 10, 11, 12]:
                    overall_status = "Runtime Error"
                else:
                    overall_status = "Wrong Answer"

    # 3. Mark previous submissions for this question as not final
    stmt_prev = (
        select(Submission)
        .where(
            Submission.assignment_id == assignment.id,
            Submission.question_id == question_id,
            Submission.is_final == True
        )
    )
    prev_subs = (await db.execute(stmt_prev)).scalars().all()
    for ps in prev_subs:
        ps.is_final = False

    # 4. Create new final submission
    new_submission = Submission(
        assignment_id=assignment.id,
        question_id=question_id,
        code=code,
        language=language,
        judge0_token=first_token,
        status=overall_status,
        test_cases_passed=passed_count,
        total_test_cases=total_test_cases,
        exec_time_ms=max_exec_time_ms,
        is_final=True,
        submitted_at=now,
    )
    db.add(new_submission)
    await db.commit()
    await db.refresh(new_submission)

    return SubmitCodeResponse(
        submission_id=new_submission.id,
        assignment_id=assignment.id,
        question_id=question_id,
        status=new_submission.status,
        test_cases_passed=new_submission.test_cases_passed,
        total_test_cases=new_submission.total_test_cases,
        exec_time_ms=new_submission.exec_time_ms,
        is_final=new_submission.is_final,
        submitted_at=new_submission.submitted_at,
    )
