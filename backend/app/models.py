"""
SQLAlchemy database models with calibration support
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
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
    
    # Calibration data (stored as JSON)
    calibration_data = Column(JSON, nullable=True)
    # Structure: {
    #   "zones": [
    #     {
    #       "name": "near",
    #       "y_range": [y_min, y_max],
    #       "reference_points": [[x1, y1], [x2, y2]],
    #       "real_distance": 10.0,  # meters
    #       "pixels_per_meter": 25.5
    #     },
    #     ...
    #   ],
    #   "calibrated": true
    # }
    
    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    calibrated_at = Column(DateTime, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    
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