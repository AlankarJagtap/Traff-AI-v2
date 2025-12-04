import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videoAPI } from '../services/api'
import api from '../services/api'


/**
 * Interactive Calibration Page
 * 4-point perspective calibration on the first video frame.
 */
function CalibrationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  // State
  const [imageLoaded, setImageLoaded] = useState(false)
  const [videoFrame, setVideoFrame] = useState(null)
  const [points, setPoints] = useState([]) // [[x,y], ...]
  const [referenceDistance, setReferenceDistance] = useState(10)

  // Fetch video details
  const { data: video, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoAPI.getById(id),
  })

  // Fetch existing calibration
  const { data: calibration } = useQuery({
    queryKey: ['calibration', id],
    queryFn: () => videoAPI.getCalibration(id),
    enabled: !!video,
  })

  // Fetch first frame for calibration
const frameQuery = useQuery({
  queryKey: ['video-frame', id],
  queryFn: async () => {
    const response = await api.get(`/videos/${id}/frame?ts=${Date.now()}`, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },
  enabled: !!video,
})




  useEffect(() => {
    if (frameQuery.data) {
      setVideoFrame(frameQuery.data)
    }
  }, [frameQuery.data])

  // Pre-fill from existing calibration if available
  useEffect(() => {
    if (calibration?.calibration_data?.mode === 'four_point') {
      const savedPoints = calibration.calibration_data.points || []
      const dist = calibration.calibration_data.reference_distance
      if (savedPoints.length === 4) {
        setPoints(savedPoints)
      }
      if (dist && dist > 0) {
        setReferenceDistance(dist)
      }
    }
  }, [calibration])

  // Save calibration mutation
  const saveMutation = useMutation({
    mutationFn: (calibrationData) => videoAPI.saveCalibration(id, calibrationData),
    onSuccess: () => {
      alert('Calibration saved successfully!')
      queryClient.invalidateQueries(['video', id])
      queryClient.invalidateQueries(['calibration', id])
      navigate(`/videos/${id}`)
    },
    onError: (error) => {
      alert(`Failed to save calibration: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Draw on canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current
    const image = imageRef.current

    if (!canvas || !image || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    canvas.width = image.width
    canvas.height = image.height

    // Draw image
    ctx.drawImage(image, 0, 0)

    // Draw clicked points and polygon
    if (points.length > 0) {
      ctx.fillStyle = '#00ff00'
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2

      points.forEach(([x, y], index) => {
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fill()

        // Label points 1-4
        ctx.fillStyle = '#ffffff'
        ctx.font = '14px Arial'
        ctx.fillText(String(index + 1), x + 8, y - 8)
        ctx.fillStyle = '#00ff00'
      })

      if (points.length === 4) {
        ctx.beginPath()
        ctx.moveTo(points[0][0], points[0][1])
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(points[i][0], points[i][1])
        }
        ctx.closePath()
        ctx.stroke()
      }
    }
  }

  useEffect(() => {
    drawCanvas()
  }, [points, imageLoaded, videoFrame])

  // Handle canvas click - record up to 4 points
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas || points.length >= 4) return

    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height

    setPoints([...points, [x, y]])
  }

  // Save calibration
  const handleSaveCalibration = () => {
    if (points.length !== 4) {
      alert('Please click exactly 4 points on the frame')
      return
    }

    if (!referenceDistance || referenceDistance <= 0) {
      alert('Please enter a valid reference distance')
      return
    }

    saveMutation.mutate({
      points,
      reference_distance: referenceDistance,
    })
  }

  // Reset all
  const handleReset = () => {
    setPoints([])
    setReferenceDistance(10)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading video...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900">Calibrate Video</h1>
          <p className="mt-3 text-lg text-gray-600">
            Mark 4 corner points on the road/lane to enable accurate speed estimation
          </p>
          {video && (
            <p className="mt-3 text-sm text-primary-600 font-semibold">
              Video: <span className="font-mono">{video.filename}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(`/videos/${id}`)}
          className="inline-flex items-center px-6 py-3 rounded-xl border border-gray-300 shadow-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Video
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-4">
              <h2 className="text-lg font-bold text-primary-900 flex items-center">
                <svg className="mr-2 h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                </svg>
                Video Frame
              </h2>
              <p className="mt-1 text-sm text-primary-700">Click 4 corners to create calibration points</p>
            </div>

            <div className="p-6">
              {/* Canvas */}
              <div className="relative border-4 border-dashed border-primary-300 rounded-xl overflow-hidden bg-gray-900">
                {videoFrame && (
                  <>
                    <img
                      ref={imageRef}
                      src={videoFrame}
                      alt="Video frame"
                      className="hidden"
                      onLoad={() => setImageLoaded(true)}
                    />
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      className="w-full cursor-crosshair"
                      style={{ maxHeight: '600px' }}
                    />
                  </>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl">
                <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center uppercase tracking-wider">
                  <svg className="mr-2 h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM9 13a1 1 0 11-2 0 1 1 0 012 0zM9 7a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                  </svg>
                  Instructions:
                </h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside font-semibold">
                  <li>Click the <strong>4 corners</strong> of a lane section (mark in sequence)</li>
                  <li>Enter the real-world distance (in meters) in the settings panel</li>
                  <li>Click <strong>"✓ Save Calibration"</strong> to finalize</li>
                </ol>
                {points.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-300">
                    <p className="text-sm font-bold text-green-700">
                      <svg className="inline h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Point {points.length} of 4 marked
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls Area */}
        <div className="space-y-6">
          {/* Calibration Settings */}
          <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-4">
              <h2 className="text-lg font-bold text-primary-900 flex items-center">
                <svg className="mr-2 h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Reference Distance */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                  <svg className="inline h-4 w-4 mr-2 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Reference Distance
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={referenceDistance}
                    onChange={(e) => setReferenceDistance(parseFloat(e.target.value))}
                    step="0.1"
                    min="0.1"
                    className="flex-1 px-4 py-2 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-bold text-lg"
                  />
                  <span className="text-sm font-bold text-orange-700">m</span>
                </div>
                <p className="mt-2 text-xs text-orange-700 font-semibold">
                  <strong>Tips:</strong> Lane marking ≈ 10m, car length ≈ 4.5m
                </p>
              </div>

              {/* Points Counter */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">Points Marked</p>
                <div className="mt-3 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-3 rounded-full transition-all duration-300 ${
                        i < points.length
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-center font-bold text-lg text-purple-700">
                  {points.length} <span className="text-xs text-purple-600">/4</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSaveCalibration}
              disabled={points.length !== 4 || saveMutation.isPending}
              className="w-full flex justify-center items-center py-4 px-6 rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {saveMutation.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save Calibration
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-bold bg-white hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
            >
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7 7 0 015.02-1.414c3.5 0 6.364 2.864 6.364 6.364v1.515l.276-.992a1 1 0 11.948.316L16 9.851v2.5a1 1 0 01-2 0v-1.87l-.276.992a1 1 0 11-.948-.316l2-7.143v-2.5a1 1 0 01-2 0v2.101A7 7 0 015 4.101V3a1 1 0 01-1-1zm9 9v-2h2a1 1 0 110 2h-2z" clipRule="evenodd" />
              </svg>
              Reset Points
            </button>
          </div>

          {/* Warning */}
          {calibration?.is_calibrated && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <p className="text-xs font-bold text-yellow-800 flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                This video already has calibration. Saving will overwrite it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CalibrationPage