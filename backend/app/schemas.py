"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class VideoBase(BaseModel):
    """Base video schema with common fields"""
    filename: str


class VideoCreate(VideoBase):
    """Schema for creating a new video"""
    original_path: str
    fps: Optional[int] = None
    duration: Optional[float] = None
    total_frames: Optional[int] = None


class VideoResponse(BaseModel):
    """Schema for video API responses"""
    id: int
    filename: str
    status: str
    fps: Optional[int]
    duration: Optional[float]
    total_frames: Optional[int]
    processed_frames: int
    vehicle_count: int
    avg_speed: Optional[float]
    max_speed: Optional[float]
    min_speed: Optional[float]
    uploaded_at: Optional[datetime]
    processed_at: Optional[datetime]
    calibrated_at: Optional[datetime]
    error_message: Optional[str]
    progress: int
    calibration_data: Optional[Dict[str, Any]]
    is_calibrated: bool
    
    class Config:
        from_attributes = True


class VideoStatusResponse(BaseModel):
    """Schema for video processing status"""
    id: int
    status: str
    progress: int
    processed_frames: int
    total_frames: Optional[int]
    error_message: Optional[str]
    device: str


class AnalyticsSummary(BaseModel):
    """Schema for analytics summary"""
    total_videos: int
    processing_videos: int
    completed_videos: int
    failed_videos: int
    total_vehicles_detected: int
    avg_processing_time: Optional[float]


class ProcessingRequest(BaseModel):
    """Schema for processing configuration"""
    confidence_threshold: float = 0.3
    iou_threshold: float = 0.7
    enable_speed_calculation: bool = False


class CalibrationRequest(BaseModel):
    """Schema for 4-point calibration data"""
    # Four points clicked on the calibration frame: [[x1, y1], ..., [x4, y4]]
    points: List[List[float]]
    # Known real-world distance in meters between vertical extent of the selected region
    reference_distance: float
    # If True, the user marked this distance as approximate (a tuning knob), not an exact measurement
    approximate: bool = False


class CalibrationResponse(BaseModel):
    """Schema for calibration response"""
    video_id: int
    calibration_data: Dict[str, Any]
    message: str