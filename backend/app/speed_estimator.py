"""
Zone-Based Speed Estimation with Perspective Correction
"""
import numpy as np
import logging

logger = logging.getLogger("projectcars")


class ZonedSpeedEstimator:
    """
    Advanced speed estimation using multiple calibrated zones
    Accounts for perspective distortion in camera view
    """
    
    def __init__(self, calibration_data=None):
        """
        Initialize with calibration data
        
        Args:
            calibration_data: dict with zones and calibration info
        """
        self.zones = []
        self.is_calibrated = False
        
        if calibration_data:
            self.load_calibration(calibration_data)
    
    def load_calibration(self, calibration_data):
        """Load calibration from database"""
        if not calibration_data or not calibration_data.get("zones"):
            logger.warning("No calibration zones found")
            return False
        
        self.zones = []
        for zone_data in calibration_data["zones"]:
            zone = {
                'name': zone_data.get('name', 'zone'),
                'y_range': tuple(zone_data['y_range']),
                'pixels_per_meter': zone_data['pixels_per_meter']
            }
            self.zones.append(zone)
            logger.debug(f"Loaded zone: {zone['name']}, y_range: {zone['y_range']}, scale: {zone['pixels_per_meter']:.2f} px/m")
        
        # Sort zones by y_min for efficient lookup
        self.zones.sort(key=lambda z: z['y_range'][0])
        
        self.is_calibrated = True
        logger.info(f"Calibration loaded: {len(self.zones)} zones")
        return True
    
    def add_zone(self, name, y_min, y_max, reference_point1, reference_point2, real_distance):
        """
        Add a calibrated zone manually
        
        Args:
            name: Zone identifier (e.g., "near", "middle", "far")
            y_min, y_max: Vertical pixel range for this zone
            reference_point1, reference_point2: Two points with known distance
            real_distance: Real-world distance between points in meters
        """
        # Calculate pixel distance
        pixel_distance = np.sqrt(
            (reference_point2[0] - reference_point1[0])**2 + 
            (reference_point2[1] - reference_point1[1])**2
        )
        
        pixels_per_meter = pixel_distance / real_distance
        
        zone = {
            'name': name,
            'y_range': (y_min, y_max),
            'pixels_per_meter': pixels_per_meter
        }
        
        self.zones.append(zone)
        self.is_calibrated = True
        
        logger.info(f"Zone '{name}' added: y={y_min}-{y_max}, scale={pixels_per_meter:.2f} px/m")
        
        return zone
    
    def get_scale_for_position(self, y_position):
        """
        Get pixels_per_meter for a specific Y position
        Uses interpolation between zones for smooth transitions
        """
        if not self.zones:
            # Fallback: use default scale
            logger.warning("No zones configured, using default scale")
            return 25.0  # Default fallback
        
        # Find appropriate zone
        for zone in self.zones:
            if zone['y_range'][0] <= y_position <= zone['y_range'][1]:
                return zone['pixels_per_meter']
        
        # If outside all zones, find nearest
        if y_position < self.zones[0]['y_range'][0]:
            # Above all zones - use first zone
            return self.zones[0]['pixels_per_meter']
        elif y_position > self.zones[-1]['y_range'][1]:
            # Below all zones - use last zone
            return self.zones[-1]['pixels_per_meter']
        
        # Between zones - interpolate
        for i in range(len(self.zones) - 1):
            zone1 = self.zones[i]
            zone2 = self.zones[i + 1]
            
            if zone1['y_range'][1] <= y_position <= zone2['y_range'][0]:
                # Linear interpolation
                gap = zone2['y_range'][0] - zone1['y_range'][1]
                position_in_gap = y_position - zone1['y_range'][1]
                ratio = position_in_gap / gap if gap > 0 else 0
                
                scale = (
                    zone1['pixels_per_meter'] * (1 - ratio) + 
                    zone2['pixels_per_meter'] * ratio
                )
                return scale
        
        # Fallback
        return self.zones[0]['pixels_per_meter']
    
    def estimate_speed(self, trajectory_points, fps):
        """
        Estimate speed from vehicle trajectory with perspective correction
        
        Args:
            trajectory_points: List of (x, y) points tracked over time
            fps: Frames per second of video
            
        Returns:
            Speed in km/h or None if cannot calculate
        """
        if not trajectory_points or len(trajectory_points) < 2:
            return None
        
        if not self.is_calibrated:
            logger.warning("Speed estimation attempted without calibration")
            return None
        
        # Calculate distance segment by segment
        total_distance = 0.0
        
        for i in range(len(trajectory_points) - 1):
            p1 = trajectory_points[i]
            p2 = trajectory_points[i + 1]
            
            # Get scale for this segment (use midpoint Y)
            mid_y = (p1[1] + p2[1]) / 2
            scale = self.get_scale_for_position(mid_y)
            
            # Calculate segment distance in pixels
            pixel_dist = np.sqrt(
                (p2[0] - p1[0])**2 + 
                (p2[1] - p1[1])**2
            )
            
            # Convert to meters
            segment_distance = pixel_dist / scale
            total_distance += segment_distance
        
        # Calculate time in seconds
        time_seconds = len(trajectory_points) / fps
        
        if time_seconds <= 0:
            return None
        
        # Calculate speed
        speed_ms = total_distance / time_seconds  # meters per second
        speed_kmh = speed_ms * 3.6  # convert to km/h
        
        logger.debug(f"Speed calculated: {speed_kmh:.2f} km/h (distance: {total_distance:.2f}m, time: {time_seconds:.2f}s)")
        
        return speed_kmh
    
    def estimate_speed_simple(self, start_point, end_point, num_frames, fps):
        """
        Simple speed estimation between two points (backward compatibility)
        
        Args:
            start_point: (x, y) starting position
            end_point: (x, y) ending position
            num_frames: Number of frames elapsed
            fps: Frames per second
            
        Returns:
            Speed in km/h or None
        """
        if not self.is_calibrated:
            return None
        
        # Get scale at midpoint
        mid_y = (start_point[1] + end_point[1]) / 2
        scale = self.get_scale_for_position(mid_y)
        
        # Calculate pixel distance
        pixel_distance = np.sqrt(
            (end_point[0] - start_point[0])**2 + 
            (end_point[1] - start_point[1])**2
        )
        
        # Convert to meters
        distance_meters = pixel_distance / scale
        
        # Calculate time
        time_seconds = num_frames / fps
        
        if time_seconds <= 0:
            return None
        
        # Calculate speed
        speed_ms = distance_meters / time_seconds
        speed_kmh = speed_ms * 3.6
        
        return speed_kmh
    
    def get_calibration_data(self):
        """Export calibration data for storage"""
        return {
            'zones': [
                {
                    'name': zone['name'],
                    'y_range': list(zone['y_range']),
                    'pixels_per_meter': zone['pixels_per_meter']
                }
                for zone in self.zones
            ],
            'calibrated': self.is_calibrated
        }


class SimpleFallbackEstimator:
    """
    Simple fallback estimator when no calibration is available
    Uses average scale factor across entire frame
    """
    
    def __init__(self, pixels_per_meter=25.0):
        """
        Initialize with default scale
        
        Args:
            pixels_per_meter: Average pixels per meter (default: 25)
                Typical values: 15-30 for highway cameras
        """
        self.pixels_per_meter = pixels_per_meter
        logger.info(f"Fallback estimator initialized: {pixels_per_meter} px/m")
    
    def estimate_speed(self, trajectory_points, fps):
        """Simple speed estimation without zones"""
        if not trajectory_points or len(trajectory_points) < 2:
            return None
        
        start = trajectory_points[0]
        end = trajectory_points[-1]
        
        # Calculate pixel distance
        pixel_distance = np.sqrt(
            (end[0] - start[0])**2 + 
            (end[1] - start[1])**2
        )
        
        # Convert to meters
        distance_meters = pixel_distance / self.pixels_per_meter
        
        # Calculate time
        time_seconds = len(trajectory_points) / fps
        
        if time_seconds <= 0:
            return None
        
        # Calculate speed
        speed_ms = distance_meters / time_seconds
        speed_kmh = speed_ms * 3.6
        
        return speed_kmh