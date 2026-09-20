from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from backend.app.core.config import settings
from backend.app.core.limiter import limiter
from backend.app.api.auth import router as auth_router
from backend.app.api.exams import router as exams_router
from backend.app.api.submissions import router as submissions_router, mcq_router
from backend.app.api.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Online coding-test platform by UsefulBI",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Attach limiter to FastAPI state
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please wait before submitting or running code again."}
    )


# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers under /api
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(exams_router, prefix=settings.API_V1_PREFIX)
app.include_router(submissions_router, prefix=settings.API_V1_PREFIX)
app.include_router(mcq_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def on_startup():
    from backend.app.core.judge0 import ensure_judge0_language_config
    await ensure_judge0_language_config()


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "UBIcode API",
        "version": settings.PROJECT_VERSION
    }

