from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.database import engine, Base
from app.config import settings
from app.routers import auth_router, contact_router, job_router, settings_router, interview_router

# can switch later in prod: Alembic for migrations instead of create_all()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RecEasy API",
    description="Backend for the RecEasy",
    version="1.0.0"
)

_cors_origins = (
    ["*"]
    if settings.CORS_ORIGINS.strip() == "*"
    else [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resume upload directory
os.makedirs("uploads/resumes", exist_ok=True) 

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router.router)
app.include_router(contact_router.router)
app.include_router(job_router.router)
app.include_router(settings_router.router)
app.include_router(interview_router.router)

@app.on_event("startup")
def log_config():
    print(f"[RecEasy] FRONTEND_URL = {settings.FRONTEND_URL}")
    print(f"[RecEasy] BACKEND_URL  = {settings.BACKEND_URL}")
    print(f"[RecEasy] apply links will use: {settings.FRONTEND_URL}/apply/{{id}}")


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "message": "RecEasy API is running",
        "frontend_url": settings.FRONTEND_URL,
        "backend_url": settings.BACKEND_URL,
    }