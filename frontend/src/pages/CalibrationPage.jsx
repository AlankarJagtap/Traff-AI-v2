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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calibrate Video</h1>
          <p className="mt-2 text-gray-600">
            Mark 4 points on the first video frame to enable accurate speed estimation
          </p>
        </div>
        <button
          onClick={() => navigate(`/videos/${id}`)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Video
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Video Frame</h2>

            {/* Canvas */}
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
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
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">📍 Instructions:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click <strong>4 corners</strong> of a lane/road section (in order)</li>
                <li>Enter the real-world distance in meters on the right</li>
                <li>Click "✓ Save Calibration" to store calibration</li>
              </ol>
              {points.length > 0 && (
                <p className="mt-2 text-sm font-medium text-green-600">
                  ✓ Point {points.length} of 4 marked
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Controls Area */}
        <div className="space-y-6">
          {/* Calibration Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Calibration Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Distance (meters)
                </label>
                <input
                  type="number"
                  value={referenceDistance}
                  onChange={(e) => setReferenceDistance(parseFloat(e.target.value))}
                  step="0.1"
                  min="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Example: lane marking ≈ 10m, car length ≈ 4.5m
                </p>
              </div>

              <div className="text-sm text-gray-700">
                <p>
                  Points selected: <span className="font-semibold">{points.length} / 4</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSaveCalibration}
              disabled={points.length !== 4 || saveMutation.isPending}
              className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'Saving...' : '✓ Save Calibration'}
            </button>

            <button
              onClick={handleReset}
              className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Existing Calibration Info */}
      {calibration?.is_calibrated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ This video already has calibration data. Saving new calibration will overwrite it.
          </p>
        </div>
      )}
    </div>
  )
}

export default CalibrationPage