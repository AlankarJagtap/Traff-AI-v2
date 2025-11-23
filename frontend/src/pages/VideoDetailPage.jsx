import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videoAPI } from '../services/api'

/**
 * Video Detail Page
 * Shows details of a specific video and allows processing/downloading
 */
function VideoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [processingConfig, setProcessingConfig] = useState({
    confidence_threshold: 0.3,
    iou_threshold: 0.7,
    enable_speed_calculation: false,
    speed_limit: 80.0,
  })

  // Fetch video details
  const { data: video, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoAPI.getById(id),
    refetchInterval: (video) => {
      // Refetch every 2 seconds if processing, otherwise don't refetch
      return video?.status === 'processing' ? 2000 : false
    },
  })

  // Process video mutation
  const processMutation = useMutation({
    mutationFn: () => videoAPI.process(id, processingConfig),
    onSuccess: () => {
      queryClient.invalidateQueries(['video', id])
      queryClient.invalidateQueries(['videos'])
      queryClient.invalidateQueries(['analytics'])
    },
    onError: (error) => {
      alert(`Processing failed: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => videoAPI.delete(id),
    onSuccess: () => {
      navigate('/videos')
    },
  })

  // Handle process button click
  const handleProcess = () => {
    if (processingConfig.enable_speed_calculation && !video.is_calibrated) {
      navigate(`/videos/${video.id}/calibrate`)
      return
    }

    if (window.confirm('Start processing this video?')) {
      processMutation.mutate()
    }
  }

  // Handle delete button click
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      deleteMutation.mutate()
    }
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading video details...</p>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Video not found</h2>
        <Link to="/videos" className="mt-4 text-primary-600 hover:text-primary-500">
          Back to videos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-4">
          <li>
            <Link to="/videos" className="text-gray-400 hover:text-gray-500">
              Videos
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-4 text-sm font-medium text-gray-500">
                {video.filename}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{video.filename}</h1>
          <p className="mt-1 text-sm text-gray-500">Video ID: {video.id}</p>
          {video.is_calibrated && (
            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Calibrated
            </span>
          )}
        </div>
        <div className="flex space-x-3">
          {video.status === 'uploaded' && !video.is_calibrated && (
            <Link
              to={`/videos/${video.id}/calibrate`}
              className="inline-flex items-center px-4 py-2 border border-primary-300 rounded-md shadow-sm text-sm font-medium text-primary-700 bg-white hover:bg-primary-50"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Calibrate for Speed
            </Link>
          )}
          {video.status === 'completed' && (
            <>
              <Link
                to={`/videos/${video.id}/report`}
                className="inline-flex items-center px-4 py-2 border border-primary-300 rounded-md shadow-sm text-sm font-medium text-primary-700 bg-white hover:bg-primary-50"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Report
              </Link>
              <a
                href={videoAPI.getDownloadUrl(video.id)}
                download
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Video
              </a>
            </>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                video.status === 'completed' ? 'bg-green-100 text-green-800' :
                video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                video.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
              </span>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Duration</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatDuration(video.duration)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">FPS</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {video.fps || 'N/A'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Total Frames</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {video.total_frames || 'N/A'}
            </p>
          </div>
        </div>

        {/* Progress bar for processing */}
        {video.status === 'processing' && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Processing Progress</span>
              <span className="text-sm font-medium text-gray-900">{video.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${video.progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Frame {video.processed_frames} of {video.total_frames}
            </p>
          </div>
        )}

        {/* Error message */}
        {video.status === 'failed' && video.error_message && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Processing Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {video.error_message}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Card (if completed) */}
      {video.status === 'completed' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Detection Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">{video.vehicle_count}</p>
              <p className="mt-1 text-sm text-gray-500">Vehicles Detected</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">
                {video.avg_speed ? `${video.avg_speed.toFixed(1)} km/h` : 'N/A'}
              </p>
              <p className="mt-1 text-sm text-gray-500">Average Speed</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary-600">
                {formatDate(video.processed_at)}
              </p>
              <p className="mt-1 text-sm text-gray-500">Processed At</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Configuration (if not processed yet) */}
      {(video.status === 'uploaded' || video.status === 'failed') && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Processing Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confidence Threshold: {processingConfig.confidence_threshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={processingConfig.confidence_threshold}
                onChange={(e) => setProcessingConfig({
                  ...processingConfig,
                  confidence_threshold: parseFloat(e.target.value)
                })}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                IOU Threshold: {processingConfig.iou_threshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={processingConfig.iou_threshold}
                onChange={(e) => setProcessingConfig({
                  ...processingConfig,
                  iou_threshold: parseFloat(e.target.value)
                })}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={processingConfig.enable_speed_calculation}
                  onChange={(e) => setProcessingConfig({
                    ...processingConfig,
                    enable_speed_calculation: e.target.checked
                  })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable Speed Calculation (requires calibration)
                </span>
              </label>
            </div>
            {processingConfig.enable_speed_calculation && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Speed Limit (km/h)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={processingConfig.speed_limit}
                  onChange={(e) => setProcessingConfig({
                    ...processingConfig,
                    speed_limit: parseFloat(e.target.value)
                  })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            )}
            <button
              onClick={handleProcess}
              disabled={processMutation.isPending}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {processMutation.isPending
                ? 'Starting...'
                : processingConfig.enable_speed_calculation && !video.is_calibrated
                  ? 'Next: Calibrate for Speed'
                  : '🚀 Start Processing'}
            </button>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Timeline</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Uploaded</dt>
            <dd className="text-sm font-medium text-gray-900">{formatDate(video.uploaded_at)}</dd>
          </div>
          {video.processed_at && (
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Processed</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDate(video.processed_at)}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

export default VideoDetailPage