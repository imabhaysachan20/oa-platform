import os
import shutil
import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from backend.app.core.config import settings

logger = logging.getLogger("uvicorn.error")


def _prepare_aws_environment():
    """
    Ensures AWS credentials and SSO cache are stored in a writable directory.
    When /root/.aws is mounted as read-only (:ro), botocore raises OSError: [Errno 30] Read-only file system
    when writing temporary tokens in ~/.aws/sso/cache/.
    This synchronizes credentials to /tmp/ubicode_aws_home/.aws and sets HOME/AWS_CONFIG_FILE.
    """
    writable_home = "/tmp/ubicode_aws_home"
    target_aws_dir = os.path.join(writable_home, ".aws")
    os.makedirs(target_aws_dir, exist_ok=True)

    # Check potential sources: /host_aws or /root/.aws
    sources = ["/host_aws", "/root/.aws"]
    for src in sources:
        if os.path.exists(src):
            try:
                shutil.copytree(src, target_aws_dir, dirs_exist_ok=True)
            except Exception as e:
                logger.debug(f"[S3] Notice copying AWS files from {src}: {e}")

    os.environ["HOME"] = writable_home
    config_file = os.path.join(target_aws_dir, "config")
    if os.path.exists(config_file):
        os.environ["AWS_CONFIG_FILE"] = config_file
    credentials_file = os.path.join(target_aws_dir, "credentials")
    if os.path.exists(credentials_file):
        os.environ["AWS_SHARED_CREDENTIALS_FILE"] = credentials_file

    sso_cache_dir = os.path.join(target_aws_dir, "sso", "cache")
    os.makedirs(sso_cache_dir, exist_ok=True)

    # Patch botocore cached class attributes so SSO token refreshing writes to writable directory
    try:
        import botocore.tokens
        botocore.tokens.SSOTokenProvider._SSO_TOKEN_CACHE_DIR = sso_cache_dir
    except Exception as e:
        logger.debug(f"[S3] Notice patching SSOTokenProvider cache dir: {e}")

    try:
        import botocore.utils
        botocore.utils.JSONFileCache.CACHE_DIR = os.path.join(target_aws_dir, "boto", "cache")
    except Exception as e:
        logger.debug(f"[S3] Notice patching JSONFileCache cache dir: {e}")


def _get_s3_client():
    """Initializes boto3 S3 client using environment or AWS SSO credentials."""
    _prepare_aws_environment()
    return boto3.client("s3", region_name=settings.AWS_REGION)


def generate_presigned_upload_url(
    exam_id: int,
    user_id: int,
    attempt_number: int = 1,
    event_type: str = "start",
    content_type: str = "image/jpeg"
) -> Optional[dict]:
    """
    Generates an AWS S3 presigned PUT URL allowing candidates to upload
    their verification snapshot directly to S3 without proxying through FastAPI.
    
    Returns:
        dict with keys {"upload_url": str, "s3_key": str, "expires_in": int} or None.
    """
    try:
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        unique_token = uuid.uuid4().hex[:8]
        s3_key = (
            f"{settings.S3_PHOTO_PREFIX}/exam_{exam_id}/user_{user_id}/"
            f"attempt_{attempt_number}/{event_type}_{timestamp_str}_{unique_token}.jpg"
        )

        s3_client = _get_s3_client()
        expires_in = 900  # 15 minutes
        upload_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": s3_key,
                "ContentType": content_type
            },
            ExpiresIn=expires_in
        )

        logger.info(f"[S3] Generated presigned upload URL for key: {s3_key}")
        return {
            "upload_url": upload_url,
            "s3_key": s3_key,
            "expires_in": expires_in
        }
    except (BotoCoreError, ClientError) as aws_err:
        logger.error(f"[S3] AWS error generating presigned upload URL: {aws_err}")
        return None
    except Exception as exc:
        logger.error(f"[S3] Unexpected error generating presigned upload URL: {exc}")
        return None


def get_presigned_view_url(
    s3_key_or_url: Optional[str],
    expires_in: int = 3600
) -> Optional[str]:
    """
    Generates a fresh presigned GET URL for secure viewing of candidate snapshots.
    Accepts either a canonical S3 key (e.g. 'proctoring/exam_1/...') or an existing S3 URL.
    This guarantees URLs never expire permanently in candidate dossiers.
    """
    if not s3_key_or_url or not isinstance(s3_key_or_url, str):
        return None

    # Strip query parameters if an existing presigned URL was stored
    cleaned = s3_key_or_url.split("?")[0].strip()
    if not cleaned:
        return None

    # Extract S3 key if a full URL was passed
    s3_key = cleaned
    if "amazonaws.com/" in cleaned:
        s3_key = cleaned.split("amazonaws.com/", 1)[1]
    elif cleaned.startswith("http://") or cleaned.startswith("https://"):
        # Handle custom endpoint / minio paths
        parts = cleaned.split("/")
        if len(parts) > 4:
            s3_key = "/".join(parts[4:])

    try:
        s3_client = _get_s3_client()
        presigned_get_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": s3_key
            },
            ExpiresIn=expires_in
        )
        return presigned_get_url
    except Exception as exc:
        logger.warning(f"[S3] Could not generate dynamic presigned view URL for key '{s3_key}': {exc}")
        return s3_key_or_url


def upload_verification_photo_to_s3(
    base64_data: str,
    exam_id: int,
    user_id: int,
    attempt_number: int = 1,
    event_type: str = "start"
) -> Optional[Tuple[str, str]]:
    """
    Decodes a base64 verification snapshot and uploads it to AWS S3 bucket 'ubi-code'.
    Kept for resilient server-side fallback if client direct upload fails.
    
    Returns:
        (s3_key, photo_url) if upload succeeds, or None if error occurs.
    """
    if not base64_data or not isinstance(base64_data, str):
        return None

    try:
        # Strip data URL header if present (e.g. "data:image/jpeg;base64,")
        raw_base64 = base64_data
        if "," in raw_base64:
            raw_base64 = raw_base64.split(",", 1)[1]

        image_bytes = base64.b64decode(raw_base64)
        if len(image_bytes) == 0:
            logger.warning("[S3] Decoded verification snapshot is empty.")
            return None

        # Generate unique key path
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        unique_token = uuid.uuid4().hex[:8]
        s3_key = (
            f"{settings.S3_PHOTO_PREFIX}/exam_{exam_id}/user_{user_id}/"
            f"attempt_{attempt_number}/{event_type}_{timestamp_str}_{unique_token}.jpg"
        )

        s3_client = _get_s3_client()
        s3_client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=image_bytes,
            ContentType="image/jpeg"
        )

        # Generate presigned URL for viewing
        try:
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
                ExpiresIn=604800  # 7 days
            )
            photo_url = presigned_url
        except Exception as presign_err:
            logger.warning(f"[S3] Could not generate presigned URL, using standard URL: {presign_err}")
            photo_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"

        logger.info(f"[S3] Successfully uploaded verification photo to s3://{settings.S3_BUCKET_NAME}/{s3_key} ({len(image_bytes)} bytes)")
        return s3_key, photo_url

    except (BotoCoreError, ClientError) as aws_err:
        logger.error(f"[S3] AWS Boto3 error uploading verification snapshot: {aws_err}")
        return None
    except Exception as exc:
        logger.error(f"[S3] Unexpected error uploading verification snapshot: {exc}")
        return None

