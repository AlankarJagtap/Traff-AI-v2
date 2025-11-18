import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { videoAPI } from '../services/api'

/**
 * Upload Page
 * Allows users to upload new videos for processing
 */
function UploadPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: videoAPI.upload,
    onSuccess: (data) => {
      alert('Video uploaded successfully!')
      navigate(`/videos/${data.id}`)
    },
    onError: (error) => {
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`)
    },
  })

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
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Video</h1>
        <p className="mt-2 text-gray-600">
          Upload a video file to detect and track vehicles
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white shadow rounded-lg p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="mt-4">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-primary-600 hover:text-primary-500 font-medium"
                >
                  Click to upload
                </label>
                <span className="text-gray-500"> or drag and drop</span>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".mp4,.avi,.mov,.mkv,.wmv"
                  onChange={handleFileChange}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                MP4, AVI, MOV, MKV, WMV up to 500MB
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <svg
                  className="h-12 w-12 text-green-500"
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
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm text-red-600 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {selectedFile && (
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Uploading...
                </>
              ) : (
                'Upload Video'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Step 1</h3>
              <p className="text-xs text-gray-500">Upload Video</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Step 2</h3>
              <p className="text-xs text-gray-500">Process Video</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Step 3</h3>
              <p className="text-xs text-gray-500">Download Results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPage


