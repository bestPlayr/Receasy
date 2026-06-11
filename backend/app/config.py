from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DEBUG: bool = False
    
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    LINKEDIN_TOKEN: str = ""
    
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str

    class Config:
        env_file = ".env"

settings = Settings()