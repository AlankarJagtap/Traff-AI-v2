"""
FastAPI main application with comprehensive logging
"""
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime

import shutil
import uuid
import torch
import logging
import sys
from celery.result import AsyncResult
from celery.app.control import Inspect
from .celery_app import celery_app, route_task_to_worker, get_system_status


from .config import settings
from .database import get_db, init_db
from .models import Video, VehicleDetection
from .schemas import (
    VideoResponse,
    VideoStatusResponse,
    AnalyticsSummary,
    ProcessingRequest,
    CalibrationResponse,
    CalibrationRequest,
    VehicleDetectionResponse,  # ← ADD THIS
)
import csv
import io   

# ============================================================================
# LOGGING SETUP
# ============================================================================

# Create logger
logger = logging.getLogger("projectcars")
logger.setLevel(logging.DEBUG)

# Create console handler with formatting
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG)

# Create file handler for persistent logs
file_handler = logging.FileHandler("projectcars.log")
file_handler.setLevel(logging.INFO)

# Create formatters
detailed_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
simple_formatter = logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)

# Set formatters
console_handler.setFormatter(simple_formatter)
file_handler.setFormatter(detailed_formatter)

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# Log startup
logger.info("=" * 80)
logger.info("ProjectCars API Starting...")
logger.info("=" * 80)

# ============================================================================
# FASTAPI APP INITIALIZATION
# ============================================================================

# Initialize FastAPI app
app = FastAPI(
    title="ProjectCars API",
    description="Vehicle Speed Detection API",
    version="1.0.0"
)

logger.info("FastAPI app initialized")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS middleware configured")

# Add CORS headers for preflight requests
@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    """Initialize database tables"""
    logger.info("Startup event triggered")
    try:
        init_db()
        logger.info("Database initialized successfully")
        
        # Check CUDA availability
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            cuda_device = torch.cuda.get_device_name(0)
            logger.info(f"CUDA is available - Using GPU: {cuda_device}")
        else:
            logger.warning("CUDA not available - Using CPU (processing will be slower)")
        
        # Verify directories exist
        upload_dir = Path(settings.UPLOAD_DIR)
        processed_dir = Path(settings.PROCESSED_DIR)
        
        if not upload_dir.exists():
            logger.warning(f"Upload directory not found, creating: {upload_dir}")
            upload_dir.mkdir(parents=True, exist_ok=True)
        else:
            logger.info(f"Upload directory exists: {upload_dir}")
            
        if not processed_dir.exists():
            logger.warning(f"Processed directory not found, creating: {processed_dir}")
            processed_dir.mkdir(parents=True, exist_ok=True)
        else:
            logger.info(f"Processed directory exists: {processed_dir}")
        
        logger.info("Startup complete - API is ready")
        logger.info("Available routes:")
        for route in app.routes:
            route_type = type(route).__name__
            methods = getattr(route, "methods", "—")
            logger.info(f"  [{route_type}] {methods} {route.path}")

        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}", exc_info=True)
        raise


@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down ProjectCars API")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file and return path"""
    logger.debug(f"Saving uploaded file: {upload_file.filename}")
    
    try:
        # Generate unique filename
        file_ext = Path(upload_file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = Path(settings.UPLOAD_DIR) / unique_filename
        
        logger.debug(f"Generated unique filename: {unique_filename}")
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        
        file_size = file_path.stat().st_size
        logger.info(f"File saved successfully: {file_path} (size: {file_size / 1024 / 1024:.2f} MB)")
        
        return str(file_path)
        
    except Exception as e:
        logger.error(f"Failed to save file {upload_file.filename}: {str(e)}", exc_info=True)
        raise


def get_video_info(file_path: str) -> dict:
    """Extract video metadata"""
    logger.debug(f"Extracting video info from: {file_path}")
    
    try:
        import cv2
        
        cap = cv2.VideoCapture(file_path)
        
        if not cap.isOpened():
            logger.error(f"Failed to open video file: {file_path}")
            raise ValueError("Cannot open video file")
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        cap.release()
        
        info = {
            "fps": fps,
            "total_frames": total_frames,
            "duration": duration
        }
        
        logger.info(f"Video info extracted: {width}x{height}, {fps} FPS, {total_frames} frames, {duration:.2f}s")
        
        return info
        
    except Exception as e:
        logger.error(f"Failed to extract video info from {file_path}: {str(e)}", exc_info=True)
        raise



def process_video_task(video_id: int, config: ProcessingRequest):
    """Background task for video processing with zone-based speed estimation"""
    # Create new database session for background task
    from .database import SessionLocal
    db = SessionLocal()
    
    try:
        logger.info(f"Starting background processing task for video ID: {video_id}")
        
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.error(f"Video not found in database: ID {video_id}")
            return
            
        # Update status
        video.status = "processing"
        db.commit()
        logger.info(f"Video status updated to 'processing' for ID: {video_id}")
        
        # Prepare output path
        output_filename = f"processed_{Path(video.filename).stem}.mp4"
        output_path = Path(settings.PROCESSED_DIR) / output_filename
        
        logger.debug(f"Output path: {output_path}")
        
        # Lazy import to avoid heavy deps at startup
        logger.debug("Importing VideoProcessor...")
        from .video_processor import VideoProcessor
        
        logger.debug("Initializing VideoProcessor...")
        processor = VideoProcessor(
            confidence_threshold=config.confidence_threshold,
            iou_threshold=config.iou_threshold
        )
        
        logger.info("VideoProcessor initialized, starting processing...")
        
        # Progress callback
        def update_progress(current: int, total: int):
            video.processed_frames = current
            db.commit()
        
        # Process video with calibration data
        stats = processor.process_video(
            input_path=video.original_path,
            output_path=str(output_path),
            calibration_data=video.calibration_data,
            progress_callback=update_progress,
            enable_speed_calculation=config.enable_speed_calculation if hasattr(config, 'enable_speed_calculation') else True,
            speed_limit=config.speed_limit if hasattr(config, 'speed_limit') else 80.0,
            video_id=video_id,  # ✅ ADD THIS LINE
            db=db,  # ✅ ADD THIS LINE
            enable_plate_detection=config.enable_plate_detection if hasattr(config, 'enable_plate_detection') else False

        )
        
        # Update video record on success
        video.status = "completed"
        video.processed_path = str(output_path)
        video.processed_frames = video.total_frames
        video.vehicle_count = stats.get('vehicle_count', 0)
        video.processed_at = datetime.utcnow()
        video.speed_limit = config.speed_limit if hasattr(config, 'speed_limit') else 50.0
        db.commit()
        
        logger.info(f"Video processing completed successfully for ID: {video_id}")
        logger.info(f"Stats: {stats}")
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Processing failed for video ID {video_id}: {error_msg}", exc_info=True)
        
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "failed"
                video.error_message = error_msg
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update video status: {str(db_error)}")
    
    finally:
        db.close()  # Always close the session
# ============================================================================
# API ROUTES
# ============================================================================

@app.get("/")
def root():
    """API root endpoint"""
    logger.debug("Root endpoint accessed")
    return {
        "message": "ProjectCars API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.post("/api/videos/upload", response_model=VideoResponse)
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a new video"""
    logger.info(f"Upload request received: {file.filename} ({file.content_type})")
    
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            logger.warning(f"Invalid file extension: {file_ext}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )
        
        logger.debug(f"File extension validated: {file_ext}")
        
        # Save file
        file_path = save_upload_file(file)
        
        # Get video info
        video_info = get_video_info(file_path)
        
        # Create database record
        video = Video(
            filename=file.filename,
            original_path=file_path,
            fps=video_info["fps"],
            duration=video_info["duration"],
            total_frames=video_info["total_frames"],
            status="uploaded"
        )
        
        db.add(video)
        db.commit()
        db.refresh(video)
        
        logger.info(f"Video uploaded successfully: ID {video.id}, {file.filename}")
        
        return video.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for {file.filename}: {str(e)}", exc_info=True)
        
        # Try to clean up file if it was saved
        try:
            if 'file_path' in locals():
                Path(file_path).unlink(missing_ok=True)
                logger.debug(f"Cleaned up file: {file_path}")
        except:
            pass
            
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/api/videos", response_model=list[VideoResponse])
def list_videos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get list of all videos"""
    logger.debug(f"List videos request: skip={skip}, limit={limit}")
    
    try:
        videos = db.query(Video).offset(skip).limit(limit).all()
        logger.info(f"Retrieved {len(videos)} videos")
        return [video.to_dict() for video in videos]
        
    except Exception as e:
        logger.error(f"Failed to list videos: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve videos")


@app.get("/api/videos/{video_id}", response_model=VideoResponse)
def get_video(video_id: int, db: Session = Depends(get_db)):
    """Get video details by ID"""
    logger.debug(f"Get video request: ID {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.warning(f"Video not found: ID {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        logger.debug(f"Video retrieved: {video.filename} (status: {video.status})")
        return video.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve video")



@app.post("/api/videos/{video_id}/process", response_model=VideoStatusResponse)
async def start_processing(
    video_id: int,
    config: ProcessingRequest,
    db: Session = Depends(get_db)
):
    """Start video processing using Celery task queue"""
    logger.info(f"📥 Process request received for video ID: {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.warning(f"Video not found: ID {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        if video.status == "processing":
            logger.warning(f"Video already processing: ID {video_id}")
            raise HTTPException(status_code=400, detail="Video is already being processed")
        
        if video.status == "completed":
            logger.warning(f"Video already completed: ID {video_id}")
            raise HTTPException(status_code=400, detail="Video already processed")
        
        # Route task to GPU or CPU worker via Celery
        logger.info(f"🚀 Routing video {video_id} to Celery worker...")
        task = route_task_to_worker(video_id, config.model_dump(mode="json"))
        logger.info(f"🚀 Routing video {video_id} to Celery worker...")
        logger.info(f"[DEBUG] Config being sent to Celery: {config.model_dump()}")

        
        # Save task ID to database
        video.status = "queued"
        video.celery_task_id = task.id
        db.commit()
        
        logger.info(f"✅ Video {video_id} queued. Celery task ID: {task.id}")
        
        return {
            "id": video.id,
            "status": "queued",
            "progress": 0,
            "processed_frames": 0,
            "total_frames": video.total_frames,
            "error_message": None,
            "device": "queued",
            "task_id": task.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to queue processing for video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {str(e)}")


@app.get("/api/videos/{video_id}/status", response_model=VideoStatusResponse)
def get_processing_status(video_id: int, db: Session = Depends(get_db)):
    """Get video processing status from Celery task"""
    logger.debug(f"Status request for video ID: {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.warning(f"Video not found for status check: ID {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        # If video has Celery task ID, check task status
        if video.celery_task_id and video.status in ["queued", "processing"]:
            try:
                task = AsyncResult(video.celery_task_id, app=celery_app)
                
                # Get task state
                if task.state == 'PROCESSING':
                    task_info = task.info or {}
                    return {
                        "id": video.id,
                        "status": "processing",
                        "progress": task_info.get('progress', 0),
                        "processed_frames": task_info.get('current_frame', 0),
                        "total_frames": task_info.get('total_frames', video.total_frames),
                        "error_message": None,
                        "device": task_info.get('device', 'unknown'),
                        "worker_type": task_info.get('worker_type', 'unknown'),
                        "task_status": task.state
                    }
                elif task.state == 'PENDING':
                    return {
                        "id": video.id,
                        "status": "queued",
                        "progress": 0,
                        "processed_frames": 0,
                        "total_frames": video.total_frames,
                        "error_message": None,
                        "device": "queued",
                        "task_status": "PENDING"
                    }
                elif task.state == 'FAILURE':
                    error = str(task.info) if task.info else "Unknown error"
                    return {
                        "id": video.id,
                        "status": "failed",
                        "progress": 0,
                        "error_message": error,
                        "device": "failed",
                        "task_status": "FAILURE"
                    }
            except Exception as e:
                logger.error(f"Error checking Celery task: {str(e)}")
        
        # Fallback to database status
        return {
            "id": video.id,
            "status": video.status,
            "progress": video._calculate_progress(),
            "processed_frames": video.processed_frames,
            "total_frames": video.total_frames,
            "error_message": video.error_message,
            "device": "cpu" if torch.cuda.is_available() else "cpu"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get status for video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve status")


@app.get("/api/videos/{video_id}/download")
def download_video(video_id: int, db: Session = Depends(get_db)):
    """Download processed video"""
    logger.info(f"Download request for video ID: {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.warning(f"Video not found for download: ID {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        if video.status != "completed":
            logger.warning(f"Video not completed for download: ID {video_id} (status: {video.status})")
            raise HTTPException(status_code=400, detail="Video processing not completed")
        
        if not video.processed_path or not Path(video.processed_path).exists():
            logger.error(f"Processed file not found: {video.processed_path}")
            raise HTTPException(status_code=404, detail="Processed video file not found")
        
        logger.info(f"Serving download for video ID {video_id}: {video.processed_path}")
        
        return FileResponse(
            path=video.processed_path,
            media_type="video/mp4",
            filename=f"processed_{video.filename}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to download video")


@app.delete("/api/videos/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    """Delete video and associated files"""
    logger.info(f"Delete request for video ID: {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.warning(f"Video not found for deletion: ID {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")
        
        filename = video.filename
        
        # Delete files
        if video.original_path:
            try:
                Path(video.original_path).unlink(missing_ok=True)
                logger.debug(f"Deleted original file: {video.original_path}")
            except Exception as e:
                logger.warning(f"Failed to delete original file: {str(e)}")
                
        if video.processed_path:
            try:
                Path(video.processed_path).unlink(missing_ok=True)
                logger.debug(f"Deleted processed file: {video.processed_path}")
            except Exception as e:
                logger.warning(f"Failed to delete processed file: {str(e)}")
        
        # Delete database record
        db.delete(video)
        db.commit()
        
        logger.info(f"Video deleted successfully: ID {video_id}, {filename}")
        
        return {"message": "Video deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete video")


@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Get analytics summary"""
    logger.debug("Analytics summary requested")
    
    try:
        total_videos = db.query(Video).count()
        processing_videos = db.query(Video).filter(Video.status == "processing").count()
        completed_videos = db.query(Video).filter(Video.status == "completed").count()
        failed_videos = db.query(Video).filter(Video.status == "failed").count()
        
        # Total vehicles detected
        result = db.query(Video).filter(Video.vehicle_count.isnot(None)).all()
        total_vehicles = sum(v.vehicle_count for v in result)
        
        # Average processing time
        completed = db.query(Video).filter(
            Video.status == "completed",
            Video.uploaded_at.isnot(None),
            Video.processed_at.isnot(None)
        ).all()
        
        if completed:
            processing_times = [
                (v.processed_at - v.uploaded_at).total_seconds()
                for v in completed
            ]
            avg_processing_time = sum(processing_times) / len(processing_times)
        else:
            avg_processing_time = None
        
        logger.info(f"Analytics: {total_videos} total, {completed_videos} completed, {total_vehicles} vehicles detected")
        
        return {
            "total_videos": total_videos,
            "processing_videos": processing_videos,
            "completed_videos": completed_videos,
            "failed_videos": failed_videos,
            "total_vehicles_detected": total_vehicles,
            "avg_processing_time": avg_processing_time
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")

# ADD THESE NEW ENDPOINTS TO YOUR EXISTING main.py
# Place them after your existing endpoints, before the health check

@app.post("/api/videos/{video_id}/calibrate", response_model=CalibrationResponse)
async def calibrate_video(
    video_id: int,
    calibration_request: CalibrationRequest,
    db: Session = Depends(get_db),
):
    """Calibrate video using 4-point perspective setup.

    The frontend sends exactly four points clicked on a calibration frame
    plus a known real-world distance in meters.
    """
    logger.info(f"Calibration request for video ID: {video_id}")

    try:
        video = db.query(Video).filter(Video.id == video_id).first()

        if not video:
            logger.warning(f"Video not found for calibration: ID {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")

        points = calibration_request.points or []
        reference_distance = calibration_request.reference_distance
        approximate = getattr(calibration_request, "approximate", False)

        if len(points) != 4:
            logger.warning(f"Invalid calibration points for video {video_id}: expected 4, got {len(points)}")
            raise HTTPException(status_code=400, detail="Exactly 4 calibration points are required")

        if reference_distance <= 0:
            if approximate:
                # Use a sensible default for approximate mode instead of failing
                logger.warning(
                    f"Approximate calibration with non-positive reference distance for video {video_id}: "
                    f"{reference_distance} - defaulting to 150.0m"
                )
                reference_distance = 150.0
            else:
                logger.warning(f"Invalid reference distance for video {video_id}: {reference_distance}")
                raise HTTPException(status_code=400, detail="Reference distance must be positive")

        # Prepare calibration payload for storage
        target_width = 25
        target_height = int(reference_distance * 10)  # mimic original app scale

        calibration_data = {
            "mode": "four_point",
            "points": points,
            "reference_distance": reference_distance,
            "target_width": target_width,
            "target_height": target_height,
            "calibrated": True,
            # Metadata for UI/analytics: whether distance is exact or approximate
            "approximate": approximate,
            "distance_mode": "approximate" if approximate else "accurate",
        }

        video.calibration_data = calibration_data
        video.calibrated_at = datetime.utcnow()
        db.commit()

        logger.info(
            f"Video {video_id} calibrated successfully with 4-point perspective; "
            f"reference_distance={reference_distance}m, "
            f"approximate={approximate}"
        )

        return {
            "video_id": video_id,
            "calibration_data": calibration_data,
            "message": "Video calibrated successfully using 4-point perspective",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calibration failed for video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Calibration failed: {str(e)}")


@app.get("/api/videos/{video_id}/calibration")
async def get_calibration(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Get calibration data for a video"""
    logger.debug(f"Get calibration request for video ID: {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        return {
            "video_id": video_id,
            "calibration_data": video.calibration_data,
            "is_calibrated": video.calibration_data is not None and video.calibration_data.get("calibrated", False),
            "calibrated_at": video.calibrated_at.isoformat() if video.calibrated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get calibration for video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve calibration")


@app.delete("/api/videos/{video_id}/calibration")
async def delete_calibration(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Delete calibration data for a video"""
    logger.info(f"Delete calibration request for video ID: {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        video.calibration_data = None
        video.calibrated_at = None
        db.commit()
        
        logger.info(f"Calibration deleted for video ID: {video_id}")
        
        return {"message": "Calibration deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete calibration for video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete calibration")


@app.get("/api/videos/{video_id}/frame")
def get_video_frame(
    video_id: int,
    db: Session = Depends(get_db),
):
    """Return the first frame of the original video as a JPEG image.

    Used by the frontend calibration page to let the user click 4 points.
    """
    logger.debug(f"Frame request for video ID: {video_id}")

    try:
        video = db.query(Video).filter(Video.id == video_id).first()

        if not video:
            logger.warning(f"Video not found for frame extraction: ID {video_id}")
            raise HTTPException(status_code=404, detail="Video not found")

        if not video.original_path or not Path(video.original_path).exists():
            logger.error(f"Original video file not found for frame extraction: {video.original_path}")
            raise HTTPException(status_code=404, detail="Original video file not found")

        # Lazy import to avoid heavy deps at startup
        import cv2  # type: ignore

        cap = cv2.VideoCapture(video.original_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video file for frame extraction: {video.original_path}")
            raise HTTPException(status_code=500, detail="Cannot open video file")

        success, frame = cap.read()
        cap.release()

        if not success or frame is None:
            logger.error(f"Failed to read frame from video: {video.original_path}")
            raise HTTPException(status_code=500, detail="Cannot read frame from video")

        success, buffer = cv2.imencode(".jpg", frame)
        if not success:
            logger.error("Failed to encode video frame as JPEG")
            raise HTTPException(status_code=500, detail="Failed to encode video frame")

        logger.debug(f"Returning JPEG frame for video ID {video_id}")
        return Response(content=buffer.tobytes(), media_type="image/jpeg")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to extract frame for video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to extract video frame")

@app.get("/api/videos/{video_id}/detections", response_model=list[VehicleDetectionResponse])
def get_video_detections(video_id: int, db: Session = Depends(get_db)):
    detections = db.query(VehicleDetection).filter(
        VehicleDetection.video_id == video_id
    ).all()

    output = []
    for d in detections:
        item = d.to_dict()

        # Build snapshot URL if a snapshot exists
        if d.snapshot_path:
            filename = Path(d.snapshot_path).name
            item["snapshot_url"] = f"/snapshots/{filename}"
        else:
            item["snapshot_url"] = None

        output.append(item)

    return output

@app.get("/api/videos/{video_id}/report/csv")
def download_report(video_id: int, db: Session = Depends(get_db)):
    """Generate and download CSV report"""
    logger.info(f"Report download request for video ID: {video_id}")
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
            
        detections = db.query(VehicleDetection).filter(VehicleDetection.video_id == video_id).all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Vehicle ID', 'Time (s)', 'Frame', 'Speed (km/h)', 'Speed Limit (km/h)', 'Status', 'Plate', 'Snapshot'])        
        # Write data
        for d in detections:
            status = "Speeding" if d.is_speeding else "Normal"
            writer.writerow([
            d.track_id,
            f"{d.timestamp:.2f}",
            d.frame_number,
            f"{d.speed:.1f}",
            video.speed_limit,
            status,
            d.number_plate or "",
            Path(d.snapshot_path).name if d.snapshot_path else ""
        ])

            
        output.seek(0)
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=report_{video.filename}_{datetime.now().strftime('%Y%m%d')}.csv"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate report for video {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate report")


@app.get("/api/system/status")
def get_system_status_endpoint():
    """Get current system status (GPU, Redis, Workers)"""
    try:
        status = get_system_status()
        
        # Add active workers count
        
        i = Inspect(app=celery_app)
        active_tasks = i.active()
        
        if active_tasks:
            status['active_workers'] = len(active_tasks)
            status['active_tasks'] = sum(len(tasks) for tasks in active_tasks.values())
        else:
            status['active_workers'] = 0
            status['active_tasks'] = 0
        
        return status
        
    except Exception as e:
        logger.error(f"Failed to get system status: {str(e)}")
        return {
            "error": str(e),
            "redis_connected": False,
            "gpu_available": False
        }

from fastapi.staticfiles import StaticFiles

app.mount("/snapshots", StaticFiles(directory="processed/snapshots"), name="snapshots")


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    logger.debug("Health check requested")
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "cuda_available": torch.cuda.is_available()
    }