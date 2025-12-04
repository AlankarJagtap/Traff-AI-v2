import { Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import VideosPage from './pages/VideosPage'
import VideoDetailPage from './pages/VideoDetailPage'
import CalibrationPage from './pages/CalibrationPage'
import ReportPage from './pages/ReportPage'

function App() {
  const location = useLocation()

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <Link to="/" className="flex items-center group">
                <span className="text-3xl font-black text-slate-900 group-hover:text-primary-700 transition-colors">🚗 ProjectCars</span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden sm:ml-12 sm:flex sm:space-x-1">
                <Link
                  to="/"
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    isActive('/')
                      ? 'bg-primary-100 text-primary-700 shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-2m-9-10L9 3m6 0l4 3m0 0V9" />
                  </svg>
                  Dashboard
                </Link>
                <Link
                  to="/upload"
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    isActive('/upload')
                      ? 'bg-primary-100 text-primary-700 shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload
                </Link>
                <Link
                  to="/videos"
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    isActive('/videos')
                      ? 'bg-primary-100 text-primary-700 shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Videos
                </Link>
              </div>
            </div>

            {/* Right side - Status Badge */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm font-medium text-green-700">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/:id" element={<VideoDetailPage />} />
          <Route path="/videos/:id/calibrate" element={<CalibrationPage />} />
          <Route path="/videos/:id/report" element={<ReportPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">ProjectCars</h3>
              <p className="text-gray-400 text-sm">AI-powered vehicle detection and speed analysis system.</p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition">Real-time Detection</a></li>
                <li><a href="#" className="hover:text-white transition">Speed Estimation</a></li>
                <li><a href="#" className="hover:text-white transition">Analytics</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Tech Stack</h3>
              <p className="text-gray-400 text-sm">FastAPI • React • YOLOv8 • PostgreSQL</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 ProjectCars. Built with ❤️ using FastAPI + React + YOLOv8
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App