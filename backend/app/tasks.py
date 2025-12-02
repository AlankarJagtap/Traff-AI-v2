"""
Celery tasks for video processing (Python 3.10 compatible)
"""
from celery import Task
from typing import Dict, Any
from .celery_app import celery_app, mark_gpu_busy
from .database import SessionLocal
from .models import Video
from .video_processor import VideoProcessor
from .config import settings
from pathlib import Path
from datetime import datetime
import logging
import torch

logger = logging.getLogger("projectcars")


class DatabaseTask(Task):
    """Base task with database session"""
    _db = None
    
    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db
    
    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.process_video_gpu')
def process_video_gpu(self, video_id: int, config: Dict[str, Any]):
    """Process video using GPU (CUDA)"""
    logger.info(f"[GPU Worker] Starting video {video_id}")
    
    try:
        # Verify CUDA is available
        if not torch.cuda.is_available():
            logger.error("[GPU Worker] CUDA not available! Failing task.")
            raise RuntimeError("CUDA not available for GPU worker")
        
        device = 'cuda'
        gpu_name = torch.cuda.get_device_name(0)
        logger.info(f"[GPU Worker] Using device: {device} ({gpu_name})")
        
        # Process video
        result = _process_video_common(
            self, 
            video_id, 
            config, 
            device='cuda',
            worker_type='GPU'
        )
        
        return result
        
    finally:
        # Always mark GPU as free when done
        mark_gpu_busy(False)
        logger.info(f"[GPU Worker] Video {video_id} finished - GPU marked as FREE")


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.process_video_cpu')
def process_video_cpu(self, video_id: int, config: Dict[str, Any]):
    """Process video using CPU"""
    logger.info(f"[CPU Worker] Starting video {video_id}")
    
    device = 'cpu'
    logger.info(f"[CPU Worker] Using device: {device}")
    
    # Process video
    result = _process_video_common(
        self, 
        video_id, 
        config, 
        device='cpu',
        worker_type='CPU'
    )
    
    return result


def _process_video_common(
    task_self, 
    video_id: int, 
    config: Dict[str, Any], 
    device: str, 
    worker_type: str
) -> Dict[str, Any]:
    """Common video processing logic for both GPU and CPU workers"""
    
    # Update task state
    task_self.update_state(
        state='PROCESSING',
        meta={
            'video_id': video_id,
            'status': f'Starting on {worker_type} worker...',
            'device': device,
            'worker_type': worker_type,
            'progress': 0
        }
    )
    
    try:
        # Get video from database
        video = task_self.db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            raise Exception(f"Video {video_id} not found in database")
        
        logger.info(f"[{worker_type}] Processing: {video.filename}")
        
        # Update video status
        video.status = "processing"
        task_self.db.commit()
        
        # Prepare output path
        output_filename = f"processed_{Path(video.filename).stem}.mp4"
        output_path = Path(settings.PROCESSED_DIR) / output_filename
        
        logger.debug(f"[{worker_type}] Output path: {output_path}")
        
        # Initialize processor with device
        processor = VideoProcessor(
            confidence_threshold=config.get('confidence_threshold', 0.3),
            iou_threshold=config.get('iou_threshold', 0.7),
            device=device
        )
        
        # Progress callback - updates both Redis and database
        def update_progress(current: int, total: int):
            progress = int((current / total) * 100)
            
            # Update Celery task state (stored in Redis)
            task_self.update_state(
                state='PROCESSING',
                meta={
                    'video_id': video_id,
                    'progress': progress,
                    'current_frame': current,
                    'total_frames': total,
                    'status': f'[{worker_type}] Processing frame {current}/{total}',
                    'device': device,
                    'worker_type': worker_type
                }
            )
            
            # Update database every 10 frames
            if current % 10 == 0:
                video.processed_frames = current
                task_self.db.commit()
        
        # Process video
        logger.info(f"[{worker_type}] Starting video processing...")
        
        stats = processor.process_video(
            input_path=video.original_path,
            output_path=str(output_path),
            calibration_data=video.calibration_data,
            progress_callback=update_progress,
            enable_speed_calculation=config.get('enable_speed_calculation', True),
            speed_limit=config.get('speed_limit', 80.0),
            video_id=video_id,
            db=task_self.db
        )
        
        # Update video record on success
        video.status = "completed"
        video.processed_path = str(output_path)
        video.processed_frames = video.total_frames
        video.vehicle_count = stats.get('vehicle_count', 0)
        video.avg_speed = stats.get('avg_speed')
        video.max_speed = stats.get('max_speed')
        video.min_speed = stats.get('min_speed')
        video.processed_at = datetime.utcnow()
        video.speed_limit = config.get('speed_limit', 50.0)
        task_self.db.commit()
        
        logger.info(f"[{worker_type}] ✅ Video {video_id} completed successfully")
        logger.info(f"[{worker_type}] Stats: {stats.get('vehicle_count')} vehicles, "
                   f"Avg speed: {stats.get('avg_speed')}")
        
        return {
            'status': 'completed',
            'video_id': video_id,
            'stats': stats,
            'device': device,
            'worker_type': worker_type
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{worker_type}] ❌ Processing failed for video {video_id}: {error_msg}", 
                    exc_info=True)
        
        # Update video status to failed
        try:
            video = task_self.db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "failed"
                video.error_message = error_msg
                task_self.db.commit()
        except Exception as db_error:
            logger.error(f"[{worker_type}] Failed to update error status: {str(db_error)}")
        
        # Re-raise for Celery to handle
        raise