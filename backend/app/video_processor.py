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
from .speed_estimator import ZonedSpeedEstimator, SimpleFallbackEstimator, FourPointSpeedEstimator
import logging
import copy
import torch

logger = logging.getLogger("projectcars")


class VideoProcessor:
    """Main video processor with zone-based speed estimation"""
    
    # At the top of video_processor.py, update the class definition:

class VideoProcessor:
    """Main video processor with GPU/CPU device support"""
    
    def __init__(
        self, 
        confidence_threshold: float = 0.3, 
        iou_threshold: float = 0.7,
        device: str = 'cuda'  # ← ADD THIS
    ):
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = device  # ← ADD THIS
        self.model = None
    
    def load_model(self):
        """Load YOLO model (lazy loading) and move to device"""
        if self.model is None:
            logger.info(f"Loading YOLO model on {self.device}...")
            self.model = YOLO(settings.YOLO_MODEL)
            
            # Move model to specified device
            if self.device == 'cuda' and torch.cuda.is_available():
                self.model.to('cuda')
                logger.info(f"✅ Model loaded on GPU: {torch.cuda.get_device_name(0)}")
            else:
                self.model.to('cpu')
                logger.info("✅ Model loaded on CPU")
        
        return self.model
    
    def process_video(
        self,
        input_path: str,
        output_path: str,
        calibration_data: dict = None,
        progress_callback=None,
        enable_speed_calculation: bool = True,
        speed_limit: float = 80.0,
        target_width: int = 1280,
        video_id: int = None,  # ← ADD THIS
        db = None,  # ← ADD THIS
    ):
        """
        Process video with zone-based speed detection
        
        Args:
            input_path: Path to input video
            output_path: Path to save processed video
            calibration_data: Zone calibration data (if None, uses fallback)
            progress_callback: Callback function(current_frame, total_frames)
            enable_speed_calculation: Enable speed calculation (default: True)
            speed_limit: Speed limit for flagging violations (default: 80.0)
            target_width: Max width to process (resizes 4K/2K to this width)
        
        Returns:
            dict with processing statistics and vehicle data
        """
        # Load model
        model = self.load_model()
        
        # Get video info
        video_info = sv.VideoInfo.from_video_path(video_path=input_path)
        original_width = video_info.width
        original_height = video_info.height
        
        logger.info(f"Processing video: {original_width}x{original_height}, {video_info.fps} FPS, {video_info.total_frames} frames")
        
        # Calculate scaling factor if needed
        scale_factor = 1.0
        if original_width > target_width:
            scale_factor = target_width / original_width
            new_width = target_width
            new_height = int(original_height * scale_factor)
            
            logger.info(f"Resizing video for processing: {original_width}x{original_height} -> {new_width}x{new_height} (scale={scale_factor:.2f})")
            
            # Update video info for the sink (output video will be smaller)
            video_info.width = new_width
            video_info.height = new_height
        else:
            new_width = original_width
            new_height = original_height

        # Handle calibration data scaling
        scaled_calibration_data = None
        if calibration_data:
            scaled_calibration_data = copy.deepcopy(calibration_data)
            
            if scale_factor != 1.0:
                # Scale 4-point calibration
                if "points" in scaled_calibration_data:
                    points = scaled_calibration_data["points"]
                    scaled_points = [[p[0] * scale_factor, p[1] * scale_factor] for p in points]
                    scaled_calibration_data["points"] = scaled_points
                    logger.info("Scaled calibration points for resized video")
                
                # Scale zones (legacy)
                if "zones" in scaled_calibration_data:
                    for zone in scaled_calibration_data["zones"]:
                        if "y_range" in zone:
                            zone["y_range"] = [y * scale_factor for y in zone["y_range"]]
                        # pixels_per_meter also changes linearly with scale
                        if "pixels_per_meter" in zone:
                            zone["pixels_per_meter"] *= scale_factor

        # Optional polygon zone for 4-point calibration (limit speeds to calibrated area)
        polygon_zone = None
        if enable_speed_calculation and scaled_calibration_data and scaled_calibration_data.get("mode") == "four_point":
            try:
                polygon_points = np.array(scaled_calibration_data.get("points", []), dtype=np.int32)
                if polygon_points.shape == (4, 2):
                    polygon_zone = sv.PolygonZone(polygon=polygon_points)
                    logger.info("Polygon zone created from 4-point calibration")
                else:
                    logger.warning(
                        "4-point calibration has invalid polygon shape: %s",
                        getattr(polygon_points, "shape", None),
                    )
            except Exception as e:
                logger.warning("Failed to create polygon zone from 4-point calibration: %s", str(e))
                polygon_zone = None

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
            if scaled_calibration_data and scaled_calibration_data.get("calibrated"):
                mode = scaled_calibration_data.get("mode")

                # New 4-point homography-based calibration
                if mode == "four_point" and not scaled_calibration_data.get("zones"):
                    logger.info("Using 4-point homography-based speed estimation")
                    speed_estimator = FourPointSpeedEstimator(scaled_calibration_data)

                # Legacy zone-based calibration
                elif scaled_calibration_data.get("zones"):
                    logger.info("Using zone-based speed estimation with calibration")
                    speed_estimator = ZonedSpeedEstimator(scaled_calibration_data)

                # Calibrated flag set but no usable data
                else:
                    logger.warning("Calibrated flag set but no 4-point or zone data - falling back to simple estimator")
                    # Adjust fallback pixels_per_meter for scale
                    fallback_ppm = 25.0 * scale_factor
                    speed_estimator = SimpleFallbackEstimator(pixels_per_meter=fallback_ppm)
            else:
                logger.warning("No calibration data - using fallback estimator")
                fallback_ppm = 25.0 * scale_factor
                speed_estimator = SimpleFallbackEstimator(pixels_per_meter=fallback_ppm)
        else:
            logger.info("Speed calculation disabled - skipping speed estimation")
            speed_estimator = None
        
        # Statistics
        unique_vehicles = set()
        all_speeds = []
        frame_count = 0
        
        # Track vehicle trajectories (for speed calculation)
        vehicle_trajectories = defaultdict(lambda: deque(maxlen=video_info.fps))
        
        # Store max speed data for each vehicle: {track_id: {'speed': float, 'frame': int, 'timestamp': float}}
        vehicle_max_speeds = {}
        
        # Process video
        frame_generator = sv.get_video_frames_generator(source_path=input_path)
        
        with sv.VideoSink(output_path, video_info) as sink:
            for frame in frame_generator:
                # Resize frame if needed
                if scale_factor != 1.0:
                    frame = cv2.resize(frame, (new_width, new_height))

                frame_count += 1
                current_timestamp = frame_count / video_info.fps
                
                # Run detection
                result = model(frame)[0]
                detections = sv.Detections.from_ultralytics(result)
                
                # Filter by confidence
                detections = detections[detections.confidence > self.confidence_threshold]

                # If we have a calibrated polygon zone (4-point), restrict detections to that area
                if polygon_zone is not None and len(detections) > 0:
                    try:
                        zone_mask = polygon_zone.trigger(detections)
                        detections = detections[zone_mask]
                    except Exception as e:
                        logger.warning("Polygon zone filtering failed: %s", str(e))

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
                                
                                # Update max speed for this vehicle
                                if tracker_id not in vehicle_max_speeds or speed > vehicle_max_speeds[tracker_id]['speed']:
                                    vehicle_max_speeds[tracker_id] = {
                                        'speed': speed,
                                        'frame': frame_count,
                                        'timestamp': current_timestamp
                                    }
                                
                                # Color code based on speed limit
                                color_hex = "#00FF00" # Green
                                if speed > speed_limit:
                                    color_hex = "#FF0000" # Red
                                    
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
        
        # After the main processing loop (after the 'with sv.VideoSink...' block)
                
        # Save vehicle detections to database if db session provided
        if db and video_id:
            try:
                from .models import VehicleDetection
                
                logger.info(f"Saving {len(vehicle_max_speeds)} vehicle detections to database")
                
                for track_id, detection_data in vehicle_max_speeds.items():
                    detection = VehicleDetection(
                        video_id=video_id,
                        track_id=int(track_id),
                        timestamp=detection_data['timestamp'],
                        frame_number=detection_data['frame'],
                        speed=detection_data['speed'],
                        is_speeding=detection_data['speed'] > speed_limit
                    )
                    db.add(detection)
                
                db.commit()
                logger.info(f"Vehicle detections saved successfully for video ID {video_id}")
                
            except Exception as e:
                logger.error(f"Failed to save vehicle detections: {str(e)}", exc_info=True)
                # Don't fail the entire processing if detection saving fails
        # Calculate statistics
        stats = {
                "vehicle_count": len(unique_vehicles),
                "avg_speed": float(np.mean(all_speeds)) if enable_speed_calculation and all_speeds else None,  # Convert to float
                "max_speed": float(np.max(all_speeds)) if enable_speed_calculation and all_speeds else None,    # Convert to float
                "min_speed": float(np.min(all_speeds)) if enable_speed_calculation and all_speeds else None,    # Convert to float
                "total_frames": int(video_info.total_frames),  # Convert to int
                "fps": float(video_info.fps),  # Convert to float
                "duration": float(video_info.total_frames / video_info.fps),  # Convert to float
                "speeds_calculated": len(all_speeds) if enable_speed_calculation else 0,
                "vehicle_detections": {int(k): {'speed': float(v['speed']), 'frame': int(v['frame']), 'timestamp': float(v['timestamp'])} for k, v in vehicle_max_speeds.items()}  # Convert nested dict

        }
        
        # Format avg_speed for logging
        avg_speed_text = f"{stats['avg_speed']:.1f}" if stats['avg_speed'] is not None else "N/A"
        
        logger.info(f"Processing complete: {stats['vehicle_count']} vehicles, "
                   f"{stats['speeds_calculated']} speed measurements, "
                   f"avg speed: {avg_speed_text} km/h")
        
        return stats