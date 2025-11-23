/**
 * API service for backend communication
 */
import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(
        `[API] ❌ ${error.response.status} ${error.config.url}:`,
        error.response.data
      );
    } else if (error.request) {
      // No response received
      console.error('[API] ❌ No response received:', error.message);
    } else {
      // Request setup error
      console.error('[API] ❌ Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Video API endpoints
export const videoAPI = {
  /**
   * Upload a new video
   * @param {File} file - Video file to upload
   * @returns {Promise} Upload response
   */
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get list of all videos
   * @returns {Promise} List of videos
   */
  getAll: async () => {
    const response = await api.get('/videos');
    return response.data;
  },

  /**
   * Get video details by ID
   * @param {number} id - Video ID
   * @returns {Promise} Video details
   */
  getById: async (id) => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },

  /**
   * Start processing a video
   * @param {number} id - Video ID
   * @param {object} config - Processing configuration
   * @returns {Promise} Processing status
   */
  process: async (id, config = {}) => {
    const response = await api.post(`/videos/${id}/process`, {
      confidence_threshold: config.confidence_threshold || 0.3,
      iou_threshold: config.iou_threshold || 0.7,
      enable_speed_calculation: config.enable_speed_calculation || false,
      speed_limit: config.speed_limit || 80.0,
    });
    return response.data;
  },

  /**
   * Get video processing status
   * @param {number} id - Video ID
   * @returns {Promise} Processing status
   */
  getStatus: async (id) => {
    const response = await api.get(`/videos/${id}/status`);
    return response.data;
  },

  /**
   * Get download URL for processed video
   * @param {number} id - Video ID
   * @returns {string} Download URL
   */
  getDownloadUrl: (id) => {
    return `${import.meta.env.VITE_API_URL}/api/videos/${id}/download`;  },

  /**
   * Delete a video
   * @param {number} id - Video ID
   * @returns {Promise} Delete response
   */
  delete: async (id) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },

  /**
   * Save calibration for a video
   * @param {number} id - Video ID
   * @param {object} calibrationData - Calibration zones data
   * @returns {Promise} Calibration response
   */
  saveCalibration: async (id, calibrationData) => {
    const response = await api.post(`/videos/${id}/calibrate`, calibrationData);
    return response.data;
  },

  /**
   * Get calibration for a video
   * @param {number} id - Video ID
   * @returns {Promise} Calibration data
   */
  getCalibration: async (id) => {
    const response = await api.get(`/videos/${id}/calibration`);
    return response.data;
  },

  /**
   * Delete calibration for a video
   * @param {number} id - Video ID
   * @returns {Promise} Delete response
   */
  deleteCalibration: async (id) => {
    const response = await api.delete(`/videos/${id}/calibration`);
    return response.data;
  },

  /**
   * Get vehicle detections for a video
   * @param {number} id - Video ID
   * @returns {Promise} List of detections
   */
  getDetections: async (id) => {
    const response = await api.get(`/videos/${id}/detections`);
    return response.data;
  },

  /**
   * Get download URL for CSV report
   * @param {number} id - Video ID
   * @returns {string} Download URL
   */
  getReportDownloadUrl: (id) => {
  return `${import.meta.env.VITE_API_URL}/api/videos/${id}/report/csv`;
  },

};

// Analytics API endpoints
export const analyticsAPI = {
  /**
   * Get analytics summary
   * @returns {Promise} Analytics summary
   */
  getSummary: async () => {
    const response = await api.get('/analytics/summary');
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;