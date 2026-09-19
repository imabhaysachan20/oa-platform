import pytest
import uuid
import json
from datetime import datetime, timezone
from fastapi import HTTPException
from jose import jwt

from backend.app.core.config import settings
from backend.app.core.security import create_access_token, get_current_user
from backend.app.models.user import User, UserRole
from backend.app.schemas.exam import DeviceTelemetryPayload, ResumeExamResponse


def test_token_contains_session_id():
    token = create_access_token(data={"sub": "123", "role": "student"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert "session_id" in payload
    assert len(payload["session_id"]) > 10


def test_token_preserves_explicit_session_id():
    custom_session = "custom-session-uuid-999"
    token = create_access_token(data={"sub": "123", "role": "student", "session_id": custom_session})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["session_id"] == custom_session


class FakeRedis:
    def __init__(self):
        self.store = {}

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, value, ex=None):
        self.store[key] = str(value)
        return True


class FakeDB:
    def __init__(self, user):
        self.user = user

    async def execute(self, stmt):
        class Result:
            def __init__(self, val):
                self.val = val

            def scalar_one_or_none(self):
                return self.val
        return Result(self.user)


@pytest.mark.asyncio
async def test_student_session_superseded(monkeypatch):
    student = User(
        id=42,
        email="candidate@usefulbi.com",
        name="Candidate Test",
        password_hash="test_hash",
        role=UserRole.STUDENT
    )

    fake_redis = FakeRedis()
    monkeypatch.setattr("backend.app.core.redis.get_redis_client", lambda: fake_redis)

    session_1 = "device-1-session"
    session_2 = "device-2-session"

    token_device_1 = create_access_token(
        data={"sub": str(student.id), "role": student.role.value, "session_id": session_1}
    )

    fake_db = FakeDB(student)

    # Initial session 1: Redis is populated
    await fake_redis.set(f"active_session:{student.id}", session_1)
    authenticated_user = await get_current_user(token=token_device_1, db=fake_db)
    assert authenticated_user.id == 42

    # Now, Candidate logs in from Device 2 -> Redis is updated with session 2
    await fake_redis.set(f"active_session:{student.id}", session_2)

    # Subsequent request from Device 1 must be rejected with 401 SESSION_SUPERSEDED
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token=token_device_1, db=fake_db)

    assert exc_info.value.status_code == 401
    assert "SESSION_SUPERSEDED" in exc_info.value.detail
    assert exc_info.value.headers.get("X-Session-Status") == "concurrent_session_terminated"


@pytest.mark.asyncio
async def test_admin_concurrent_logins_allowed(monkeypatch):
    admin = User(
        id=1,
        email="admin@usefulbi.com",
        name="System Admin",
        password_hash="test_hash",
        role=UserRole.ADMIN
    )

    fake_redis = FakeRedis()
    monkeypatch.setattr("backend.app.core.redis.get_redis_client", lambda: fake_redis)

    token_1 = create_access_token(
        data={"sub": str(admin.id), "role": admin.role.value, "session_id": "admin-tab-1"}
    )
    token_2 = create_access_token(
        data={"sub": str(admin.id), "role": admin.role.value, "session_id": "admin-tab-2"}
    )

    fake_db = FakeDB(admin)

    # Both tokens must validate successfully without interfering with each other
    user_1 = await get_current_user(token=token_1, db=fake_db)
    user_2 = await get_current_user(token=token_2, db=fake_db)
    assert user_1.id == 1
    assert user_2.id == 1


def test_device_telemetry_payload():
    telemetry = DeviceTelemetryPayload(
        browser="Chrome 128.0",
        os="Windows 11",
        device_type="Desktop",
        screen_resolution="1920x1080",
        device_fingerprint="fp_abc123xyz",
        latitude=28.6139,
        longitude=77.2090,
        accuracy=15.5,
        location_status="granted"
    )

    assert telemetry.browser == "Chrome 128.0"
    assert telemetry.latitude == 28.6139
    assert telemetry.accuracy == 15.5
    assert telemetry.location_status == "granted"

    # Test denied / fallback scenario
    denied_telemetry = DeviceTelemetryPayload(
        browser="Firefox 120.0",
        os="macOS 14",
        screen_resolution="1440x900",
        location_status="denied"
    )
    assert denied_telemetry.latitude is None
    assert denied_telemetry.location_status == "denied"


@pytest.mark.asyncio
async def test_resume_telemetry_device_switch():
    from backend.app.models.exam import ExamAssignment, AssignmentStatus
    from backend.app.services.exam_service import record_exam_resume_telemetry

    assignment = ExamAssignment(
        id=10,
        exam_id=5,
        user_id=42,
        status=AssignmentStatus.IN_PROGRESS
    )

    added_objects = []

    class MockDB:
        async def execute(self, stmt):
            class Res:
                def scalar_one_or_none(self_inner):
                    return assignment
            return Res()

        def add(self, obj):
            added_objects.append(obj)

        async def commit(self):
            pass

    fake_redis = FakeRedis()
    initial_device = {
        "fingerprint": "original-fp-111",
        "ip": "192.168.1.100",
        "browser": "Chrome 128",
        "os": "Windows 11"
    }
    await fake_redis.set("exam:5:assignment:10:device", json.dumps(initial_device))

    # Candidate resumes with the SAME device
    same_telemetry = DeviceTelemetryPayload(
        browser="Chrome 128",
        os="Windows 11",
        device_fingerprint="original-fp-111",
        latitude=28.6139,
        longitude=77.2090,
        accuracy=10.0
    )
    res_same = await record_exam_resume_telemetry(
        db=MockDB(),
        exam_id=5,
        user_id=42,
        assignment_id=10,
        telemetry=same_telemetry,
        client_ip="192.168.1.100",
        redis=fake_redis
    )
    assert res_same.device_switch_detected is False

    # Verify resume log was added
    resume_logs = [obj for obj in added_objects if getattr(obj, "event_type", None) == "EXAM_RESUME_DEVICE"]
    assert len(resume_logs) == 1
    assert "Location: 28.613900, 77.209000" in resume_logs[0].description

    # Now Candidate resumes from a DIFFERENT device / fingerprint
    added_objects.clear()
    diff_telemetry = DeviceTelemetryPayload(
        browser="Safari 17",
        os="macOS 14",
        device_fingerprint="different-fp-999",
        latitude=19.0760,
        longitude=72.8777,
        accuracy=20.0
    )
    res_diff = await record_exam_resume_telemetry(
        db=MockDB(),
        exam_id=5,
        user_id=42,
        assignment_id=10,
        telemetry=diff_telemetry,
        client_ip="10.0.0.50",
        redis=fake_redis
    )
    assert res_diff.device_switch_detected is True

    # Verify both DEVICE_SWITCH_DETECTED and EXAM_RESUME_DEVICE were logged
    switch_logs = [obj for obj in added_objects if getattr(obj, "event_type", None) == "DEVICE_SWITCH_DETECTED"]
    assert len(switch_logs) == 1
    assert "Candidate resumed assessment from a different device or network" in switch_logs[0].description

