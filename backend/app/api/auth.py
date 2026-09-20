from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import uuid
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.redis import get_redis_client
from backend.app.core.security import verify_password, create_access_token, get_current_user
from backend.app.models.user import User, UserRole
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email.strip().lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_id = str(uuid.uuid4())
    if user.role == UserRole.STUDENT:
        try:
            redis = get_redis_client()
            await redis.set(
                f"active_session:{user.id}",
                session_id,
                ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        except Exception:
            pass

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.value,
            "email": user.email,
            "session_id": session_id
        }
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
