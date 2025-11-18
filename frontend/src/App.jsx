import { Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import VideosPage from './pages/VideosPage'
import VideoDetailPage from './pages/VideoDetailPage'
import CalibrationPage from './pages/CalibrationPage'

function App() {
  const location = useLocation()

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-primary-600">🚗 ProjectCars</span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/')
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/upload"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/upload')
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Upload
                </Link>
                <Link
                  to="/videos"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/videos')
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Videos
                </Link>
              </div>
            </div>

            {/* Right side - could add user menu, settings, etc */}
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Vehicle Speed Detection</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/:id" element={<VideoDetailPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            © 2024 ProjectCars - Built with FastAPI + React
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App