"""
Celery configuration with GPU/CPU task routing
"""
from celery import Celery
import redis
import torch
import logging

logger = logging.getLogger("projectcars")

# Redis connection
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Create Celery app
celery_app = Celery(
    'projectcars',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0',
    include=['app.tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=30 * 60,  # 30 minutes max
    task_soft_time_limit=25 * 60,  # 25 minutes warning
)

# Define task routes
celery_app.conf.task_routes = {
    'app.tasks.process_video_gpu': {'queue': 'gpu_tasks'},
    'app.tasks.process_video_cpu': {'queue': 'cpu_tasks'},
}


def is_gpu_available():
    """Check if GPU is available and not busy"""
    try:
        # Check CUDA availability
        if not torch.cuda.is_available():
            logger.warning("CUDA not available")
            return False
        
        # Check if GPU is busy
        gpu_busy = redis_client.get('gpu_busy')
        if gpu_busy and int(gpu_busy) == 1:
            logger.info("GPU is currently busy")
            return False
        
        logger.info("GPU is available")
        return True
        
    except Exception as e:
        logger.error(f"GPU check failed: {e}")
        return False


def mark_gpu_busy(busy: bool):
    """Mark GPU as busy or free in Redis"""
    redis_client.set('gpu_busy', 1 if busy else 0)
    status = "BUSY" if busy else "FREE"
    logger.info(f"GPU marked as: {status}")


def route_task_to_worker(video_id: int, config: dict):
    """
    Smart task routing: GPU if available, else CPU
    Returns the Celery task result
    """
    from app.tasks import process_video_gpu, process_video_cpu
    
    if is_gpu_available():
        logger.info(f"🚀 Routing video {video_id} to GPU worker")
        mark_gpu_busy(True)
        logger.info(f"[ROUTER] Dispatching to {'gpu_tasks' if is_gpu_available() else 'cpu_tasks'} with config: {config}")
        return process_video_gpu.apply_async(
            args=[video_id, config],
            queue='gpu_tasks'
        )
    else:
        logger.info(f"⚙️ GPU busy, routing video {video_id} to CPU worker")
        return process_video_cpu.apply_async(
            args=[video_id, config],
            queue='cpu_tasks'
        )


def get_system_status():
    """Get current system status"""
    try:
        gpu_available = torch.cuda.is_available()
        gpu_busy = redis_client.get('gpu_busy')
        
        status = {
            "redis_connected": redis_client.ping(),
            "gpu_available": gpu_available,
            "gpu_busy": bool(gpu_busy and int(gpu_busy) == 1),
            "gpu_name": torch.cuda.get_device_name(0) if gpu_available else None,
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        return {
            "redis_connected": False,
            "gpu_available": False,
            "gpu_busy": False,
            "gpu_name": None,
            "error": str(e)
        }