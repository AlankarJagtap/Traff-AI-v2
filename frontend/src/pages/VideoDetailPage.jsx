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
    enable_plate_detection: false,   // NEW
  })


  // Fetch video details
  const { data: video, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoAPI.getById(id),
    refetchInterval: (video) => {
      // Refetch every 2 seconds if processing or uploading, otherwise every 5 seconds to catch updates
      if (video?.status === 'processing' || video?.status === 'uploaded') {
        return 2000
      }
      return false // Stop refetching for completed/failed
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
  })

  // Process video mutation
  const processMutation = useMutation({
    mutationFn: (config) => videoAPI.process(id, config), 
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
      console.log("DEBUG: Sending processingConfig to backend:", processingConfig)
      processMutation.mutate(processingConfig)
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
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-3">
          <li>
            <Link to="/videos" className="text-gray-500 hover:text-primary-600 transition-colors">
              Videos
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-3 text-sm font-semibold text-primary-600">
                {video.filename}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900">{video.filename}</h1>
          <p className="mt-3 text-lg text-gray-600">Video ID: <span className="font-mono font-semibold">{video.id}</span></p>
          {video.is_calibrated && (
            <span className="mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Calibrated
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 justify-end">
          {video.status === 'uploaded' && !video.is_calibrated && (
            <Link
              to={`/videos/${video.id}/calibrate`}
              className="inline-flex items-center px-5 py-3 rounded-xl border border-primary-300 shadow-md text-sm font-semibold text-primary-700 bg-white hover:bg-primary-50 transition-all duration-300 transform hover:scale-105"
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
                className="inline-flex items-center px-5 py-3 rounded-xl border border-primary-300 shadow-md text-sm font-semibold text-primary-700 bg-white hover:bg-primary-50 transition-all duration-300 transform hover:scale-105"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Report
              </Link>
              <a
                href={videoAPI.getDownloadUrl(video.id)}
                download
                className="inline-flex items-center px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center px-5 py-3 rounded-xl border border-red-300 shadow-md text-sm font-semibold text-red-700 bg-white hover:bg-red-50 transition-all duration-300"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status & Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Status Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Status</h3>
              <p className="mt-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                  video.status === 'completed' ? 'bg-green-100 text-green-800' :
                  video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  video.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                </span>
              </p>
            </div>
            <svg className="h-10 w-10 text-blue-400 opacity-20" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2zm-4 4a1 1 0 100-2 1 1 0 000 2zm4 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Duration Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Duration</h3>
              <p className="mt-3 text-3xl font-black text-purple-700">
                {formatDuration(video.duration)}
              </p>
            </div>
            <svg className="h-10 w-10 text-purple-400 opacity-20" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* FPS Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">FPS</h3>
              <p className="mt-3 text-3xl font-black text-green-700">
                {video.fps || 'N/A'}
              </p>
            </div>
            <svg className="h-10 w-10 text-green-400 opacity-20" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>

        {/* Total Frames Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Frames</h3>
              <p className="mt-3 text-3xl font-black text-orange-700">
                {video.total_frames || 'N/A'}
              </p>
            </div>
            <svg className="h-10 w-10 text-orange-400 opacity-20" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Processing Progress Bar */}
      {video.status === 'processing' && (
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl border border-primary-200 p-8 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Processing Progress</h3>
            <span className="text-3xl font-black text-primary-600">{video.progress}%</span>
          </div>
          <div className="w-full bg-primary-200 rounded-full h-4 shadow-inner overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-4 rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${video.progress}%` }}
            />
          </div>
          <p className="mt-4 text-sm text-gray-700 font-medium">
            Frame <span className="font-bold text-primary-600">{video.processed_frames}</span> of <span className="font-bold text-primary-600">{video.total_frames}</span>
          </p>
        </div>
      )}

      {/* Error Message */}
      {video.status === 'failed' && video.error_message && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
          <div className="flex gap-4">
            <svg className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-bold text-red-800">Processing Error</h3>
              <div className="mt-2 text-sm text-red-700 font-medium">
                {video.error_message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Card */}
      {video.status === 'completed' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <h2 className="text-2xl font-black text-slate-900 mb-6">Detection Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 shadow-md hover:shadow-lg transition-shadow duration-300">
              <p className="text-5xl font-black text-blue-600">{video.vehicle_count}</p>
              <p className="mt-3 text-sm font-bold text-gray-700 uppercase tracking-wider">Vehicles Detected</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-md hover:shadow-lg transition-shadow duration-300">
              <p className="text-5xl font-black text-green-600">
                {video.avg_speed ? `${video.avg_speed.toFixed(1)}` : 'N/A'}
              </p>
              <p className="mt-1 text-xs font-semibold text-green-700">KM/H</p>
              <p className="mt-2 text-sm font-bold text-gray-700 uppercase tracking-wider">Average Speed</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 shadow-md hover:shadow-lg transition-shadow duration-300">
              <p className="text-lg font-bold text-purple-700 break-words">
                {formatDate(video.processed_at).split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="mt-1 text-xs font-semibold text-purple-700">
                {formatDate(video.processed_at).split(' ').slice(2).join(' ')}
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700 uppercase tracking-wider">Processed</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Configuration */}
      {(video.status === 'uploaded' || video.status === 'failed') && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <h2 className="text-2xl font-black text-slate-900 mb-6">Processing Configuration</h2>
          <div className="space-y-6">
            {/* Confidence Threshold */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider">Confidence Threshold</label>
                <span className="text-2xl font-black text-blue-600">{processingConfig.confidence_threshold}</span>
              </div>
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
                className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="mt-2 text-xs text-blue-700 font-semibold">Minimum confidence to detect vehicles (0.1 - 1.0)</p>
            </div>

            {/* IOU Threshold */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider">IOU Threshold</label>
                <span className="text-2xl font-black text-purple-600">{processingConfig.iou_threshold}</span>
              </div>
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
                className="w-full h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <p className="mt-2 text-xs text-purple-700 font-semibold">Intersection over Union threshold for NMS (0.1 - 1.0)</p>
            </div>

            {/* Speed Calculation Toggle */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={processingConfig.enable_speed_calculation}
                  onChange={(e) => setProcessingConfig({
                    ...processingConfig,
                    enable_speed_calculation: e.target.checked
                  })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                />
                <span className="ml-3 text-sm font-bold text-gray-800 uppercase tracking-wider group-hover:text-green-700 transition-colors">
                  Enable Speed Calculation
                </span>
              </label>
              <p className="mt-3 text-xs text-green-700 font-semibold">
                ⚠️ Requires calibration - you'll be prompted to calibrate after selection
              </p>
            </div>

            {/* Enable OCR Number Plate Detection */}
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="enable_plate_detection"
                checked={processingConfig.enable_plate_detection}
                onChange={(e) =>
                  setProcessingConfig({
                    ...processingConfig,
                    enable_plate_detection: e.target.checked,
                  })
                }
                className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
              />
              <label htmlFor="enable_plate_detection" className="text-sm font-medium text-gray-700">
                Enable Number Plate Detection (OCR)
              </label>
            </div>


            {/* Speed Limit (conditional) */}
            {processingConfig.enable_speed_calculation && (
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                  Speed Limit (km/h)
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={processingConfig.speed_limit}
                    onChange={(e) => setProcessingConfig({
                      ...processingConfig,
                      speed_limit: parseFloat(e.target.value)
                    })}
                    className="flex-1 px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-bold"
                  />
                  <span className="text-3xl font-black text-orange-600">{processingConfig.speed_limit}</span>
                </div>
              </div>
            )}

            {/* Start Processing Button */}
            <button
              onClick={handleProcess}
              disabled={processMutation.isPending}
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {processMutation.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : processingConfig.enable_speed_calculation && !video.is_calibrated ? (
                <>
                  <svg className="mr-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Next: Calibrate for Speed
                </>
              ) : (
                <>
                  <svg className="mr-2 h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Start Processing
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Timeline Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Uploaded</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{formatDate(video.uploaded_at)}</p>
            </div>
          </div>
          {video.processed_at && (
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Processed</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{formatDate(video.processed_at)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoDetailPage