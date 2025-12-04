from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class VideoBase(BaseModel):
    filename: str
    
class VideoResponse(VideoBase):
    id: int
    status: str
    fps: Optional[int] = None
    duration: Optional[float] = None
    total_frames: Optional[int] = None
    processed_frames: int = 0
    vehicle_count: int = 0
    avg_speed: Optional[float] = None
    max_speed: Optional[float] = None
    min_speed: Optional[float] = None
    speed_limit: Optional[float] = 80.0
    uploaded_at: Optional[str] = None
    processed_at: Optional[str] = None
    calibrated_at: Optional[str] = None
    error_message: Optional[str] = None
    progress: int = 0
    calibration_data: Optional[Dict[str, Any]] = None
    is_calibrated: bool = False
    
    class Config:
        orm_mode = True

class VideoStatusResponse(BaseModel):
    id: int
    status: str
    progress: int
    processed_frames: int
    total_frames: Optional[int] = None
    error_message: Optional[str] = None
    device: str = "cpu"

class AnalyticsSummary(BaseModel):
    total_videos: int
    processing_videos: int
    completed_videos: int
    failed_videos: int
    total_vehicles_detected: int
    avg_processing_time: Optional[float] = None

class ProcessingRequest(BaseModel):
    confidence_threshold: float = 0.3
    iou_threshold: float = 0.5
    enable_speed_calculation: bool = True
    speed_limit: float = 80.0  # Default speed limit
    enable_plate_detection: bool = False
    model_config = {"extra": "allow"}


class CalibrationRequest(BaseModel):
    points: List[List[float]]
    reference_distance: float
    approximate: bool = False

class CalibrationResponse(BaseModel):
    video_id: int
    calibration_data: Dict[str, Any]
    message: str

class VehicleDetectionResponse(BaseModel):
    id: int
    video_id: int
    track_id: int
    timestamp: float
    frame_number: int
    speed: float
    is_speeding: bool

    snapshot_path: Optional[str] = None
    snapshot_url: Optional[str] = None
    number_plate: Optional[str] = None
    number_plate_confidence: Optional[float] = None

    class Config:
        orm_mode = True

