import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { videoAPI } from '../services/api'

/**
 * Videos List Page
 * Shows all uploaded videos with their status
 */
function VideosPage() {
  const queryClient = useQueryClient()

  // Fetch videos list
  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: videoAPI.getAll,
    refetchInterval: 3000, // Refresh every 3 seconds to update processing status
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: videoAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['videos'])
      queryClient.invalidateQueries(['analytics'])
    },
  })

  // Handle delete
  const handleDelete = (id, filename) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      uploaded: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.uploaded}`}>
        {status === 'processing' && (
          <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="mt-2 text-gray-600">
            Manage and track all your uploaded videos
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload New
        </Link>
      </div>

      {/* Videos Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-500">Loading videos...</p>
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded flex items-center justify-center">
                          <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {video.filename}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {video.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={video.status} />
                      {video.status === 'processing' && video.progress > 0 && (
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${video.progress}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(video.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {video.vehicle_count > 0 ? (
                        <span className="font-medium">{video.vehicle_count}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(video.uploaded_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        to={`/videos/${video.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(video.id, video.filename)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No videos</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading a video.
            </p>
            <div className="mt-6">
              <Link
                to="/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Video
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideosPage


