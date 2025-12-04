import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { videoAPI } from '../services/api'

/**
 * Upload Page - Professional UI with real-time progress tracking
 */
function UploadPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedVideoId, setUploadedVideoId] = useState(null)
  const [pollingVideo, setPollingVideo] = useState(null)

  // Upload mutation with progress callback
  const uploadMutation = useMutation({
    mutationFn: (file) => videoAPI.upload(file, setUploadProgress),
    onSuccess: (data) => {
      setUploadedVideoId(data.id)
      setPollingVideo(data.id)
      setUploadProgress(100)
    },
    onError: (error) => {
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`)
      setUploadProgress(0)
      setSelectedFile(null)
    },
  })

  // Poll for video after upload completes
  const { data: video, refetch: refetchVideo } = useQuery({
    queryKey: ['video', pollingVideo],
    queryFn: () => videoAPI.getById(pollingVideo),
    enabled: !!pollingVideo,
    refetchInterval: 1500, // Poll every 1.5 seconds
    retry: true,
    staleTime: 0, // Always consider data stale
  })

  // Navigate when video is ready
  useEffect(() => {
    if (video && pollingVideo) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        navigate(`/videos/${pollingVideo}`)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [video, pollingVideo, navigate])

  // Handle file selection
  const handleFileSelect = (file) => {
    // Validate file type
    const validTypes = ['.mp4', '.avi', '.mov', '.mkv', '.wmv']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!validTypes.includes(fileExt)) {
      alert(`Invalid file type. Allowed: ${validTypes.join(', ')}`)
      return
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 500MB')
      return
    }

    setSelectedFile(file)
  }

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  // Handle file input change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  // Handle upload
  const handleUpload = () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }
    uploadMutation.mutate(selectedFile)
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900">Upload Video</h1>
        <p className="mt-3 text-lg text-gray-600">
          Upload a video file to detect and track vehicles with AI-powered analysis
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <div
          className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${
            dragActive
              ? 'border-primary-500 bg-primary-50 scale-105'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <>
              <svg
                className="mx-auto h-16 w-16 text-primary-400 animate-bounce"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="mt-6">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-primary-600 hover:text-primary-700 font-semibold text-lg"
                >
                  Click to upload
                </label>
                <span className="text-gray-500 text-lg"> or drag and drop</span>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".mp4,.avi,.mov,.mkv,.wmv"
                  onChange={handleFileChange}
                />
              </div>
              <p className="mt-4 text-sm text-gray-500 font-medium">
                MP4, AVI, MOV, MKV, WMV • Up to 500MB
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative inline-flex">
                  <svg
                    className="h-16 w-16 text-green-500 animate-pulse"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <p className="text-base font-semibold text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600 mt-1">{formatFileSize(selectedFile.size)}</p>
              </div>
              {!uploadMutation.isPending && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  Remove File
                </button>
              )}
            </div>
          )}
        </div>

        {/* Upload Button */}
        {selectedFile && (
          <div className="mt-8 space-y-4">
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="w-full flex justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {uploadMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <svg className="mr-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Video
                </>
              )}
            </button>
            {uploadMutation.isPending && (
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300 ease-out shadow-md"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            {/* Processing progress (polling) - show after upload completes and server starts processing */}
            {pollingVideo && video && (video.status === 'processing' || video.status === 'uploaded' || uploadProgress > 0) && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Processing</span>
                  <span className="text-sm font-semibold text-gray-900">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary-600 h-3 rounded-full transition-all duration-500 shadow-inner"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {video.status === 'uploaded' ? 'Queued for processing' : `Frame ${video.processed_frames || 0} of ${video.total_frames || '...'}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-full p-3 shadow-md">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-bold text-gray-900">Step 1</h3>
              <p className="text-xs text-gray-600 font-medium">Upload Video</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-500 rounded-full p-3 shadow-md">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-bold text-gray-900">Step 2</h3>
              <p className="text-xs text-gray-600 font-medium">Process Video</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-full p-3 shadow-md">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-bold text-gray-900">Step 3</h3>
              <p className="text-xs text-gray-600 font-medium">Download Results</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8 border border-primary-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">What video formats are supported?</h3>
            <p className="text-gray-600">We support MP4, AVI, MOV, MKV, and WMV formats up to 500MB in size.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">How long does processing take?</h3>
            <p className="text-gray-600">Processing time depends on video length and resolution. Most videos are processed within minutes.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Do I need to calibrate before processing?</h3>
            <p className="text-gray-600">Calibration is optional but recommended for accurate speed measurements. You can calibrate after uploading.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPage


