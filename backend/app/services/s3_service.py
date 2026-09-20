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


def upload_verification_photo_to_s3(
    base64_data: str,
    exam_id: int,
    user_id: int,
    attempt_number: int = 1,
    event_type: str = "start"
) -> Optional[Tuple[str, str]]:
    """
    Decodes a base64 verification snapshot and uploads it to AWS S3 bucket 'ubi-code'.
    
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

        # Generate presigned URL valid for 7 days (604800 seconds) for secure viewing in Dossier
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
