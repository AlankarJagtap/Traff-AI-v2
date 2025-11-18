import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videoAPI } from '../services/api'

/**
 * Interactive Calibration Page
 * Allows users to mark zones on video for accurate speed estimation
 */
function CalibrationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  
  // State
  const [zones, setZones] = useState([])
  const [currentZone, setCurrentZone] = useState({
    name: '',
    y_min: 0,
    y_max: 0,
    reference_point1: null,
    reference_point2: null,
    real_distance: 10,
  })
  const [clickCount, setClickCount] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [videoFrame, setVideoFrame] = useState(null)

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

  // Load video frame for calibration
  useEffect(() => {
    if (video && video.original_path) {
      // In a real app, you'd extract a frame from the video
      // For now, we'll create a placeholder
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const ctx = canvas.getContext('2d')
      
      // Draw placeholder (you'll replace this with actual video frame)
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'
      ctx.font = '24px Arial'
      ctx.fillText('Video Frame Preview', 50, 50)
      ctx.fillText('Click two points to mark reference distance', 50, 100)
      
      setVideoFrame(canvas.toDataURL())
    }
  }, [video])

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
    
    // Draw existing zones
    zones.forEach((zone, idx) => {
      ctx.strokeStyle = `hsl(${idx * 60}, 70%, 50%)`
      ctx.lineWidth = 3
      
      // Draw zone rectangle
      ctx.strokeRect(0, zone.y_min, canvas.width, zone.y_max - zone.y_min)
      
      // Draw reference points
      if (zone.reference_point1) {
        ctx.fillStyle = `hsl(${idx * 60}, 70%, 50%)`
        ctx.beginPath()
        ctx.arc(zone.reference_point1[0], zone.reference_point1[1], 8, 0, 2 * Math.PI)
        ctx.fill()
      }
      if (zone.reference_point2) {
        ctx.fillStyle = `hsl(${idx * 60}, 70%, 50%)`
        ctx.beginPath()
        ctx.arc(zone.reference_point2[0], zone.reference_point2[1], 8, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Draw line between points
      if (zone.reference_point1 && zone.reference_point2) {
        ctx.strokeStyle = `hsl(${idx * 60}, 70%, 50%)`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(zone.reference_point1[0], zone.reference_point1[1])
        ctx.lineTo(zone.reference_point2[0], zone.reference_point2[1])
        ctx.stroke()
      }
      
      // Draw zone label
      ctx.fillStyle = `hsl(${idx * 60}, 70%, 50%)`
      ctx.font = 'bold 16px Arial'
      ctx.fillText(`${zone.name} (${zone.real_distance}m)`, 10, zone.y_min + 25)
    })
    
    // Draw current zone points
    if (currentZone.reference_point1) {
      ctx.fillStyle = '#00ff00'
      ctx.beginPath()
      ctx.arc(currentZone.reference_point1[0], currentZone.reference_point1[1], 8, 0, 2 * Math.PI)
      ctx.fill()
      
      if (currentZone.reference_point2) {
        ctx.beginPath()
        ctx.arc(currentZone.reference_point2[0], currentZone.reference_point2[1], 8, 0, 2 * Math.PI)
        ctx.fill()
        
        // Draw line
        ctx.strokeStyle = '#00ff00'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(currentZone.reference_point1[0], currentZone.reference_point1[1])
        ctx.lineTo(currentZone.reference_point2[0], currentZone.reference_point2[1])
        ctx.stroke()
      }
    }
  }

  useEffect(() => {
    drawCanvas()
  }, [zones, currentZone, imageLoaded])

  // Handle canvas click
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height

    if (clickCount === 0) {
      // First click
      setCurrentZone({
        ...currentZone,
        reference_point1: [x, y],
      })
      setClickCount(1)
    } else if (clickCount === 1) {
      // Second click
      setCurrentZone({
        ...currentZone,
        reference_point2: [x, y],
      })
      setClickCount(2)
    }
  }

  // Add zone
  const handleAddZone = () => {
    if (!currentZone.name) {
      alert('Please enter a zone name')
      return
    }
    if (!currentZone.reference_point1 || !currentZone.reference_point2) {
      alert('Please click two points on the canvas')
      return
    }
    if (!currentZone.real_distance || currentZone.real_distance <= 0) {
      alert('Please enter a valid distance')
      return
    }

    // Calculate y_min and y_max from points
    const y1 = currentZone.reference_point1[1]
    const y2 = currentZone.reference_point2[1]
    const y_min = Math.min(y1, y2) - 50
    const y_max = Math.max(y1, y2) + 50

    const newZone = {
      ...currentZone,
      y_min: Math.max(0, y_min),
      y_max: y_max,
    }

    setZones([...zones, newZone])
    
    // Reset current zone
    setCurrentZone({
      name: '',
      y_min: 0,
      y_max: 0,
      reference_point1: null,
      reference_point2: null,
      real_distance: 10,
    })
    setClickCount(0)
  }

  // Remove zone
  const handleRemoveZone = (index) => {
    setZones(zones.filter((_, idx) => idx !== index))
  }

  // Save calibration
  const handleSaveCalibration = () => {
    if (zones.length === 0) {
      alert('Please add at least one zone')
      return
    }

    saveMutation.mutate({ zones })
  }

  // Reset all
  const handleReset = () => {
    setZones([])
    setCurrentZone({
      name: '',
      y_min: 0,
      y_max: 0,
      reference_point1: null,
      reference_point2: null,
      real_distance: 10,
    })
    setClickCount(0)
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
            Mark reference points to enable accurate speed estimation
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
                <li>Enter zone name and known distance below</li>
                <li>Click TWO points on the canvas with that known distance</li>
                <li>Click "Add Zone" to save this zone</li>
                <li>Repeat for 2-3 zones (near, middle, far) for best accuracy</li>
                <li>Click "Save Calibration" when done</li>
              </ol>
              {clickCount > 0 && (
                <p className="mt-2 text-sm font-medium text-green-600">
                  ✓ Point {clickCount} of 2 marked {clickCount === 2 && '- Ready to add zone!'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Controls Area */}
        <div className="space-y-6">
          {/* Current Zone Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add Zone</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Name
                </label>
                <input
                  type="text"
                  value={currentZone.name}
                  onChange={(e) => setCurrentZone({ ...currentZone, name: e.target.value })}
                  placeholder="e.g., near, middle, far"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Real Distance (meters)
                </label>
                <input
                  type="number"
                  value={currentZone.real_distance}
                  onChange={(e) => setCurrentZone({ ...currentZone, real_distance: parseFloat(e.target.value) })}
                  step="0.1"
                  min="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Common: Lane marking = 10m, Car length = 4.5m
                </p>
              </div>

              <button
                onClick={handleAddZone}
                disabled={clickCount < 2}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Zone
              </button>
            </div>
          </div>

          {/* Zones List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Zones ({zones.length})
            </h2>
            
            {zones.length === 0 ? (
              <p className="text-sm text-gray-500">No zones added yet</p>
            ) : (
              <div className="space-y-3">
                {zones.map((zone, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{zone.name}</p>
                      <p className="text-xs text-gray-500">
                        {zone.real_distance}m • y: {Math.round(zone.y_min)}-{Math.round(zone.y_max)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveZone(idx)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSaveCalibration}
              disabled={zones.length === 0 || saveMutation.isPending}
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