from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth_router, contact_router, job_router

# can switch later in prod: Alembic for migrations instead of create_all()
Base.metadata.create_all(bind=engine)

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

@app.get("/")
def health_check():
    return {"status": "ok", "message": "RecEasy API is running"}