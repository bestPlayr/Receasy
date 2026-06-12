from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    DEBUG: bool = False

    # Public URLs — set these when frontend/backend are on different hosts
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "*"  # comma-separated origins, or * for all
    
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    LINKEDIN_TOKEN: str = ""
    
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str

    GROQ_API_KEY: str = ""
    MODEL_NAME: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = _ENV_FILE

settings = Settings()