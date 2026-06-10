from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.routers import auth_router, contact_router, job_router, settings_router

# can switch later in prod: Alembic for migrations instead of create_all()
Base.metadata.create_all(bind=engine)

# Idempotent migration: add linkedin_token column if it doesn't exist yet
with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_token VARCHAR"
    ))
    conn.commit()

app = FastAPI(
    title="RecEasy API",
    description="Backend for the RecEasy",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router.router)
app.include_router(contact_router.router)
app.include_router(job_router.router)
app.include_router(settings_router.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "RecEasy API is running"}