"""
Configuration settings for the application
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    DATABASE_URL: str = "sqlite:///./database.db"
    
    # File storage
    UPLOAD_DIR: str = "uploads"
    PROCESSED_DIR: str = "processed"
    
    # File limits
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_EXTENSIONS: list = [".mp4", ".avi", ".mov", ".mkv", ".wmv"]
    
    # YOLO settings
    YOLO_MODEL: str = "/app/yolo11m.pt"
    CONFIDENCE_THRESHOLD: float = 0.3
    IOU_THRESHOLD: float = 0.7
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000","https://nonvisional-silky-randi.ngrok-free.dev"]
    
    
    # Redis Configuration (ADD THIS)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
    
    # Celery Configuration (ADD THIS)
    CELERY_BROKER_URL: str = REDIS_URL
    CELERY_RESULT_BACKEND: str = REDIS_URL
    
    class Config:
        env_file = ".env"


# Create settings instance
settings = Settings()

# Ensure directories exist
Path(settings.UPLOAD_DIR).mkdir(exist_ok=True)
Path(settings.PROCESSED_DIR).mkdir(exist_ok=True)


