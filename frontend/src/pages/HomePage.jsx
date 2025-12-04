import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analyticsAPI } from '../services/api'

/**
 * Dashboard/Home Page
 * Shows analytics summary and quick actions
 */
function HomePage() {
  // Fetch analytics summary
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsAPI.getSummary,
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold text-slate-900 mb-4">Traff-AI Dashboard</h1>
        <p className="text-xl text-gray-600">
          Real-time vehicle detection and speed analysis with AI
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Videos */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden rounded-2xl shadow-lg hover:shadow-xl border border-blue-200 transition-all duration-300 transform hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-full p-3 shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Videos</dt>
                  <dd className="text-4xl font-bold text-blue-600">
                    {isLoading ? '...' : analytics?.total_videos || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Processing */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 overflow-hidden rounded-2xl shadow-lg hover:shadow-xl border border-amber-200 transition-all duration-300 transform hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-500 rounded-full p-3 shadow-md">
                {(analytics?.processing_videos || 0) > 0 ? (
                  <div className="h-6 w-6 relative">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  </div>
                ) : (
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 uppercase tracking-wide">Processing</dt>
                  <dd className="text-4xl font-bold text-amber-600">
                    {isLoading ? '...' : analytics?.processing_videos || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 overflow-hidden rounded-2xl shadow-lg hover:shadow-xl border border-green-200 transition-all duration-300 transform hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-full p-3 shadow-md">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 uppercase tracking-wide">Completed</dt>
                  <dd className="text-4xl font-bold text-green-600">
                    {isLoading ? '...' : analytics?.completed_videos || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicles Detected */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 overflow-hidden rounded-2xl shadow-lg hover:shadow-xl border border-purple-200 transition-all duration-300 transform hover:scale-105">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-full p-3 shadow-md">
                <span className="text-2xl">🚗</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-600 uppercase tracking-wide">Vehicles</dt>
                  <dd className="text-4xl font-bold text-purple-600">
                    {isLoading ? '...' : analytics?.total_vehicles_detected || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/upload"
            className="flex items-center justify-center px-6 py-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload New Video
          </Link>
          <Link
            to="/videos"
            className="flex items-center justify-center px-6 py-4 border-2 border-primary-300 text-base font-semibold rounded-xl text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 transform hover:scale-105 shadow-md"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            View All Videos
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 text-base font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 transform hover:scale-105 shadow-md"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Additional Stats */}
      {analytics && !isLoading && (
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Failed Videos</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {analytics.failed_videos || 0}
                  </p>
                </div>
                <svg className="h-12 w-12 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m0-14a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
              </div>
            </div>
            {analytics.avg_processing_time && (
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-6 border border-cyan-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Avg Processing Time</p>
                    <p className="text-3xl font-bold text-cyan-600 mt-2">
                      {Math.round(analytics.avg_processing_time)}s
                    </p>
                  </div>
                  <svg className="h-12 w-12 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage


