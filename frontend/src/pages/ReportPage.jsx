import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { videoAPI } from '../services/api'

/**
 * Report Page
 * Displays detailed vehicle detection report
 */
function ReportPage() {
  const { id } = useParams()
  const [filter, setFilter] = useState('all') // 'all', 'speeding', 'normal'

  // Fetch video details
  const { data: video, isLoading: isLoadingVideo } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoAPI.getById(id),
  })

  // Fetch detections
  const { data: detections, isLoading: isLoadingDetections } = useQuery({
    queryKey: ['detections', id],
    queryFn: () => videoAPI.getDetections(id),
  })

  const isLoading = isLoadingVideo || isLoadingDetections

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading report data...</p>
        </div>
      </div>
    )
  }

  if (!video || !detections) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Report not found</h2>
        <Link to="/videos" className="mt-4 text-primary-600 hover:text-primary-500">
          Back to videos
        </Link>
      </div>
    )
  }

  // Calculate stats
  const totalVehicles = detections.length
  const speedingVehicles = detections.filter(d => d.is_speeding).length
  const maxSpeed = Math.max(...detections.map(d => d.speed), 0)
  
  // Filter detections
  const filteredDetections = detections.filter(d => {
    if (filter === 'speeding') return d.is_speeding
    if (filter === 'normal') return !d.is_speeding
    return true
  })

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
              <Link to={`/videos/${id}`} className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                {video.filename}
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-4 text-sm font-medium text-gray-500">
                Report
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Speed Report</h1>
          <p className="mt-1 text-sm text-gray-500">
            Video: {video.filename} | Speed Limit: {video.speed_limit} km/h
          </p>
        </div>
        <div>
          <a
            href={videoAPI.getReportDownloadUrl(video.id)}
            download
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Vehicles</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalVehicles}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Speeding Vehicles</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{speedingVehicles}</p>
          <p className="text-sm text-gray-500">
            {totalVehicles > 0 ? ((speedingVehicles / totalVehicles) * 100).toFixed(1) : 0}% of total
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Max Speed Detected</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{maxSpeed.toFixed(1)} km/h</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setFilter('all')}
            className={`${
              filter === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            All Vehicles
          </button>
          <button
            onClick={() => setFilter('speeding')}
            className={`${
              filter === 'speeding'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Speeding Only
          </button>
          <button
            onClick={() => setFilter('normal')}
            className={`${
              filter === 'normal'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Normal Speed
          </button>
        </nav>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frame
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Speed
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDetections.map((detection) => (
              <tr key={detection.track_id} className={detection.is_speeding ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{detection.track_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {detection.timestamp.toFixed(2)}s
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {detection.frame_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {detection.speed.toFixed(1)} km/h
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    detection.is_speeding
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {detection.is_speeding ? 'Speeding' : 'Normal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDetections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No vehicles found matching the filter.
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportPage
