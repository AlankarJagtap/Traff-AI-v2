"""
SQLAlchemy database models with calibration support
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Video(Base):
    """Video model - stores information about uploaded and processed videos"""
    
    __tablename__ = "videos"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # File information
    filename = Column(String, nullable=False)
    original_path = Column(String, nullable=False)
    processed_path = Column(String, nullable=True)
    
    # Processing status
    status = Column(String, default="uploaded", nullable=False)
    
    # Video metadata
    fps = Column(Integer, nullable=True)
    duration = Column(Float, nullable=True)
    total_frames = Column(Integer, nullable=True)
    processed_frames = Column(Integer, default=0)
    
    # Analysis results
    vehicle_count = Column(Integer, default=0)
    avg_speed = Column(Float, nullable=True)
    max_speed = Column(Float, nullable=True)
    min_speed = Column(Float, nullable=True)
    
    # Configuration used for processing
    speed_limit = Column(Float, default=80.0, nullable=True)
    
    # Calibration data (stored as JSON)
    calibration_data = Column(JSON, nullable=True)
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    calibrated_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
    # Relationships
    detections = relationship("VehicleDetection", back_populates="video", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Video(id={self.id}, filename={self.filename}, status={self.status})>"
    
    def to_dict(self):
        """Convert model to dictionary for API responses"""
        return {
            "id": self.id,
            "filename": self.filename,
            "status": self.status,
            "fps": self.fps,
            "duration": self.duration,
            "total_frames": self.total_frames,
            "processed_frames": self.processed_frames,
            "vehicle_count": self.vehicle_count,
            "avg_speed": self.avg_speed,
            "max_speed": self.max_speed,
            "min_speed": self.min_speed,
            "speed_limit": self.speed_limit,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "calibrated_at": self.calibrated_at.isoformat() if self.calibrated_at else None,
            "error_message": self.error_message,
            "progress": self._calculate_progress(),
            "calibration_data": self.calibration_data,
            "is_calibrated": self.calibration_data is not None and self.calibration_data.get("calibrated", False)
        }
    
    def _calculate_progress(self):
        """Calculate processing progress percentage"""
        if self.status == "completed":
            return 100
        if self.status == "failed":
            return 0
        if self.total_frames and self.processed_frames:
            return int((self.processed_frames / self.total_frames) * 100)
        return 0


class VehicleDetection(Base):
    """Model to store individual vehicle detection data"""
    __tablename__ = "vehicle_detections"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    
    track_id = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)  # Time in seconds from start
    frame_number = Column(Integer, nullable=False)
    speed = Column(Float, nullable=False)
    is_speeding = Column(Boolean, default=False)
    
    # Optional: Store bounding box or other metadata if needed later
    # bbox = Column(JSON, nullable=True) 
    
    video = relationship("Video", back_populates="detections")
    
    def to_dict(self):
        return {
            "id": self.id,
            "video_id": self.video_id,
            "track_id": self.track_id,
            "timestamp": self.timestamp,
            "frame_number": self.frame_number,
            "speed": self.speed,
            "is_speeding": self.is_speeding
        }