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
    YOLO_MODEL: str = "yolo11x.pt"
    CONFIDENCE_THRESHOLD: float = 0.3
    IOU_THRESHOLD: float = 0.7
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"


# Create settings instance
settings = Settings()

# Ensure directories exist
Path(settings.UPLOAD_DIR).mkdir(exist_ok=True)
Path(settings.PROCESSED_DIR).mkdir(exist_ok=True)


