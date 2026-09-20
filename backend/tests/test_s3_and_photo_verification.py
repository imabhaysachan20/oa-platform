import pytest
import base64
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

from backend.app.services.s3_service import upload_verification_photo_to_s3
from backend.app.models.exam import Exam, ExamAssignment, AssignmentStatus
from backend.app.models.proctoring import ExamProctoringLog
from backend.app.models.user import User, UserRole
from backend.app.schemas.exam import DeviceTelemetryPayload
from backend.app.services.exam_service import (
    record_exam_resume_telemetry,
    get_candidate_dossier,
)


# Sample small base64 test image (~20 bytes decoded)
SAMPLE_BASE64_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="


def test_upload_verification_photo_to_s3_success():
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://ubi-code.s3.ap-south-1.amazonaws.com/proctoring/exam_1/user_5/attempt_1/start_123.jpg?token=abc"

    with patch("backend.app.services.s3_service._get_s3_client", return_value=mock_s3):
        result = upload_verification_photo_to_s3(
            base64_data=SAMPLE_BASE64_JPEG,
            exam_id=1,
            user_id=5,
            attempt_number=1,
            event_type="start"
        )

        assert result is not None
        s3_key, url = result
        assert "ubi-code" in url
        assert "proctoring/exam_1/user_5/attempt_1/start_" in s3_key
        mock_s3.put_object.assert_called_once()
        call_kwargs = mock_s3.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == "ubi-code"
        assert "proctoring/exam_1/user_5/attempt_1/start_" in call_kwargs["Key"]
        assert call_kwargs["ContentType"] == "image/jpeg"
        assert len(call_kwargs["Body"]) > 0


def test_upload_verification_photo_empty_data():
    url = upload_verification_photo_to_s3(
        base64_data="",
        exam_id=1,
        user_id=5,
        attempt_number=1,
    )
    assert url is None


def test_upload_verification_photo_handles_s3_error():
    mock_s3 = MagicMock()
    mock_s3.put_object.side_effect = Exception("AWS S3 connection timeout")

    with patch("backend.app.services.s3_service._get_s3_client", return_value=mock_s3):
        url = upload_verification_photo_to_s3(
            base64_data=SAMPLE_BASE64_JPEG,
            exam_id=1,
            user_id=5,
            attempt_number=1,
        )
        # Should gracefully return None without raising unhandled exception
        assert url is None


@pytest.mark.asyncio
async def test_record_exam_resume_with_verification_photo():
    assignment = ExamAssignment(
        id=101,
        exam_id=1,
        user_id=5,
        attempt_number=1,
        status=AssignmentStatus.IN_PROGRESS,
        verification_photo_url=None,
    )

    db = MagicMock()
    db.commit = AsyncMock()

    # Mock execute result
    mock_result_assignment = MagicMock()
    mock_result_assignment.scalar_one_or_none.return_value = assignment

    mock_result_logs = MagicMock()
    mock_result_logs.scalars.return_value.all.return_value = []

    db.execute = AsyncMock(side_effect=[mock_result_assignment, mock_result_logs])

    telemetry = DeviceTelemetryPayload(browser="Chrome 120", os="Windows 10")
    fake_s3_url = "https://ubi-code.s3.ap-south-1.amazonaws.com/test_photo.jpg"

    with patch("backend.app.services.exam_service.upload_verification_photo_to_s3", return_value=("proctoring/key.jpg", fake_s3_url)):
        res = await record_exam_resume_telemetry(
            db=db,
            exam_id=1,
            assignment_id=101,
            user_id=5,
            telemetry=telemetry,
            verification_photo=SAMPLE_BASE64_JPEG,
        )

        assert assignment.verification_photo_url == fake_s3_url
        assert res.verification_photo_url == fake_s3_url
        assert db.add.call_count >= 2  # device log + photo log
