"""
Video processing logic with zone-based speed estimation
"""
import cv2
import numpy as np
from collections import defaultdict, deque
from ultralytics import YOLO
import supervision as sv
from pathlib import Path
from .config import settings
from .speed_estimator import ZonedSpeedEstimator, SimpleFallbackEstimator
import logging

logger = logging.getLogger("projectcars")


class VideoProcessor:
    """Main video processor with zone-based speed estimation"""
    
    def __init__(self, confidence_threshold: float = 0.3, iou_threshold: float = 0.7):
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.model = None
    
    def load_model(self):
        """Load YOLO model (lazy loading)"""
        if self.model is None:
            logger.info("Loading YOLO model...")
            self.model = YOLO(settings.YOLO_MODEL)
            logger.info("YOLO model loaded successfully")
        return self.model
    
    def process_video(
        self,
        input_path: str,
        output_path: str,
        calibration_data: dict = None,
        progress_callback=None,
        enable_speed_calculation: bool = True,
    ):
        """
        Process video with zone-based speed detection
        
        Args:
            input_path: Path to input video
            output_path: Path to save processed video
            calibration_data: Zone calibration data (if None, uses fallback)
            progress_callback: Callback function(current_frame, total_frames)
            enable_speed_calculation: Enable speed calculation (default: True)
        
        Returns:
            dict with processing statistics
        """
        # Load model
        model = self.load_model()
        
        # Get video info
        video_info = sv.VideoInfo.from_video_path(video_path=input_path)
        logger.info(f"Processing video: {video_info.width}x{video_info.height}, {video_info.fps} FPS, {video_info.total_frames} frames")
        
        # Initialize tracker
        byte_track = sv.ByteTrack(
            frame_rate=video_info.fps,
            track_activation_threshold=self.confidence_threshold
        )
        
        # Setup annotators
        thickness = sv.calculate_optimal_line_thickness(
            resolution_wh=video_info.resolution_wh
        )
        text_scale = sv.calculate_optimal_text_scale(
            resolution_wh=video_info.resolution_wh
        )
        
        box_annotator = sv.BoxAnnotator(thickness=thickness)
        label_annotator = sv.LabelAnnotator(
            text_scale=text_scale,
            text_thickness=thickness,
            text_position=sv.Position.BOTTOM_CENTER,
        )
        trace_annotator = sv.TraceAnnotator(
            thickness=thickness,
            trace_length=video_info.fps * 2,
            position=sv.Position.BOTTOM_CENTER,
        )
        
        # Initialize speed estimator
        if enable_speed_calculation:
            if calibration_data and calibration_data.get("calibrated"):
                mode = calibration_data.get("mode")
                # New 4-point calibration is currently treated as global-scale fallback
                if mode == "four_point" and not calibration_data.get("zones"):
                    logger.info("4-point calibration detected - using fallback speed estimator for now")
                    speed_estimator = SimpleFallbackEstimator(pixels_per_meter=25.0)
                else:
                    logger.info("Using zone-based speed estimation with calibration")
                    speed_estimator = ZonedSpeedEstimator(calibration_data)
            else:
                logger.warning("No calibration data - using fallback estimator")
                speed_estimator = SimpleFallbackEstimator(pixels_per_meter=25.0)
        else:
            logger.info("Speed calculation disabled - skipping speed estimation")
            speed_estimator = None
        
        # Statistics
        unique_vehicles = set()
        all_speeds = []
        frame_count = 0
        
        # Track vehicle trajectories (for speed calculation)
        vehicle_trajectories = defaultdict(lambda: deque(maxlen=video_info.fps))
        
        # Process video
        frame_generator = sv.get_video_frames_generator(source_path=input_path)
        
        with sv.VideoSink(output_path, video_info) as sink:
            for frame in frame_generator:
                frame_count += 1
                
                # Run detection
                result = model(frame)[0]
                detections = sv.Detections.from_ultralytics(result)
                
                # Filter by confidence
                detections = detections[detections.confidence > self.confidence_threshold]
                
                # Apply NMS
                detections = detections.with_nms(threshold=self.iou_threshold)
                
                # Update tracker
                detections = byte_track.update_with_detections(detections=detections)
                
                # Track unique vehicles
                if detections.tracker_id is not None:
                    for tracker_id in detections.tracker_id:
                        unique_vehicles.add(int(tracker_id))
                
                # Get vehicle positions (bottom center)
                points = detections.get_anchors_coordinates(
                    anchor=sv.Position.BOTTOM_CENTER
                )
                
                # Update trajectories and calculate speeds
                labels = []
                if detections.tracker_id is not None:
                    for tracker_id, point in zip(detections.tracker_id, points):
                        # Add point to trajectory
                        vehicle_trajectories[tracker_id].append(tuple(point))

                        # Calculate speed if enabled and we have enough points
                        trajectory = list(vehicle_trajectories[tracker_id])

                        if not enable_speed_calculation or speed_estimator is None:
                            # Speed calculation disabled - show ID only
                            labels.append(f"#{tracker_id}")
                            continue

                        if len(trajectory) < video_info.fps / 4:  # Need at least 0.25 seconds of data
                            # Not enough data yet
                            labels.append(f"#{tracker_id}")
                        else:
                            # Calculate speed using zone-based estimation
                            speed = speed_estimator.estimate_speed(
                                trajectory_points=trajectory,
                                fps=video_info.fps
                            )

                            if speed is not None and 0 < speed < 200:  # Sanity check
                                all_speeds.append(speed)
                                labels.append(f"#{tracker_id} {int(speed)} km/h")
                            else:
                                labels.append(f"#{tracker_id}")
                else:
                    labels = []
                
                # Annotate frame
                annotated_frame = frame.copy()
                annotated_frame = trace_annotator.annotate(
                    scene=annotated_frame, detections=detections
                )
                annotated_frame = box_annotator.annotate(
                    scene=annotated_frame, detections=detections
                )
                annotated_frame = label_annotator.annotate(
                    scene=annotated_frame, detections=detections, labels=labels
                )
                
                # Write frame
                sink.write_frame(annotated_frame)
                
                # Progress callback
                if progress_callback and frame_count % 10 == 0:  # Update every 10 frames
                    progress_callback(frame_count, video_info.total_frames)
        
        # Calculate statistics
        stats = {
            "vehicle_count": len(unique_vehicles),
            "avg_speed": np.mean(all_speeds) if enable_speed_calculation and all_speeds else None,
            "max_speed": np.max(all_speeds) if enable_speed_calculation and all_speeds else None,
            "min_speed": np.min(all_speeds) if enable_speed_calculation and all_speeds else None,
            "total_frames": video_info.total_frames,
            "fps": video_info.fps,
            "duration": video_info.total_frames / video_info.fps,
            "speeds_calculated": len(all_speeds) if enable_speed_calculation else 0,
        }
        
        # Format avg_speed for logging
        avg_speed_text = f"{stats['avg_speed']:.1f}" if stats['avg_speed'] is not None else "N/A"
        
        logger.info(f"Processing complete: {stats['vehicle_count']} vehicles, "
                   f"{stats['speeds_calculated']} speed measurements, "
                   f"avg speed: {avg_speed_text} km/h")
        
        return stats