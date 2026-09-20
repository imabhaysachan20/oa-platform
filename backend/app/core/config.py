from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "UBIcode"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"

    # Security & Auth
    SECRET_KEY: str = "ubicode-super-secret-production-key-2024-change-in-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ubicode"
    DATABASE_SYNC_URL: str = "postgresql://postgres:postgres@localhost:5432/ubicode"

    # Redis (Cache, Limiter, Celery Broker)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Judge0 Configuration
    JUDGE0_URL: str = "http://localhost:2358"
    JUDGE0_API_KEY: Optional[str] = None
    JUDGE0_WAIT: bool = True  # Wait synchronously for response if possible

    # Rate Limiter
    RUN_RATE_LIMIT: str = "10/minute"

    # AWS S3 Storage
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = "ubi-code"
    S3_PHOTO_PREFIX: str = "proctoring"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost",
        "*"
    ]


settings = Settings()
