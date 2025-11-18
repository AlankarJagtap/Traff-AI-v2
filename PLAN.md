# ProjectCars 2.0 - Project Plan

## Project Overview
A full-stack application for vehicle speed detection and analysis from video footage using computer vision and machine learning.

## Project Structure

```
projectCars2.0/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # Main FastAPI application with API endpoints
│   │   ├── video_processor.py   # Core video processing logic with YOLO and ByteTrack
│   │   ├── models.py            # Database models using SQLAlchemy ORM
│   │   ├── schemas.py           # Pydantic models for request/response validation
│   │   ├── config.py            # Application configuration and settings
│   │   └── database.py          # Database connection and session management
│   ├── requirements.txt         # Python dependencies
│   └── projectcars.log         # Application logs
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── assets/              # Static assets (images, fonts, etc.)
        ├── components/          # Reusable UI components
        │   ├── VideoPlayer.jsx  # Video playback component
        │   ├── AnalyticsChart.jsx # Data visualization
        │   └── ...
        │
        ├── pages/               # Page components
        │   ├── Dashboard.jsx    # Main dashboard
        │   ├── Upload.jsx       # Video upload page
        │   ├── Videos.jsx       # Video listing
        │   └── VideoDetail.jsx  # Single video details
        │
        ├── services/
        │   └── api.js           # API service layer with Axios configuration
        │
        ├── App.jsx              # Main application component
        ├── main.jsx             # Application entry point
        └── index.css            # Global styles
```

## Current Status

### What We've Done
1. **Backend Setup**
   - Configured FastAPI with CORS middleware
   - Implemented video upload and processing endpoints
   - Added database models for video metadata
   - Integrated YOLO and ByteTrack for object detection and tracking
   - Added comprehensive logging

2. **Frontend Setup**
   - Created basic React application with routing
   - Implemented video upload functionality
   - Added video listing and detail views
   - Set up API service with error handling

3. **Infrastructure**
   - Configured development environment
   - Set up virtual environment for Python dependencies
   - Added proper dependency management

## Current Issues

### 1. Network Communication
- **Issue**: Frontend-backend communication problems
  - CORS configuration issues
  - API endpoint mismatches
  - Network errors during file uploads

### 2. Video Processing
- **Issue**: Video processing stability
  - Memory leaks during long-running processes
  - Inconsistent tracking results
  - Performance bottlenecks with high-resolution videos

### 3. Error Handling
- **Issue**: Incomplete error handling
  - Some edge cases not properly caught
  - Error messages not always user-friendly
  - Inconsistent error reporting between frontend and backend

### 4. Testing
- **Issue**: Limited test coverage
  - Unit tests missing for critical components
  - No integration tests
  - Manual testing required for video processing

## Next Steps

### Short-term
1. Fix network communication issues
2. Implement proper error handling and user feedback
3. Add basic test coverage

### Medium-term
1. Optimize video processing pipeline
2. Add user authentication
3. Implement proper state management

### Long-term
1. Add analytics dashboard
2. Support for multiple video formats
3. Batch processing capabilities

## Dependencies

### Backend
- Python 3.9+
- FastAPI
- OpenCV
- SQLAlchemy
- YOLO
- ByteTrack

### Frontend
- React 18+
- React Router
- Axios
- TailwindCSS

## Troubleshooting & Fixes

### Common Issues and Solutions

#### 1. API Endpoint Mismatches (404 Errors)
- **Symptom**: 404 errors when making API requests
- **Solution**: Ensure frontend's `baseURL` includes `/api` prefix:
  ```javascript
  // frontend/src/services/api.js
  const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    // ...
  });
  ```

#### 2. Database Connection Issues (500 Errors)
- **Symptom**: 500 errors related to database operations
- **Solution**: Verify `database.py` exists and is properly configured:
  ```python
  # backend/app/database.py
  from sqlalchemy import create_engine
  from sqlalchemy.orm import sessionmaker, declarative_base
  from .config import settings

  engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
  SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
  Base = declarative_base()
  
  def get_db():
      db = SessionLocal()
      try:
          yield db
      finally:
          db.close()
  
  def init_db():
      Base.metadata.create_all(bind=engine)
  ```

#### 3. CORS Issues
- **Symptom**: CORS errors in browser console
- **Solution**: Configure Vite proxy in `vite.config.js`:
  ```javascript
  // frontend/vite.config.js
  export default {
    server: {
      proxy: {
        '/api': 'http://localhost:8000',
      },
    },
  };
  ```

#### 4. YOLO Model Not Found
- **Symptom**: 500 errors during video processing
- **Solution**: Ensure YOLO model file exists or download it:
  ```bash
  python -m ultralytics download yolo11x
  ```
  Or update `config.py` to use a different model:
  ```python
  # backend/app/config.py
  YOLO_MODEL = "yolov8n.pt"  # Lighter model
  ```

### Working API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/videos/upload` | Upload a new video |
| GET    | `/api/videos` | List all videos |
| GET    | `/api/videos/{id}` | Get video details |
| POST   | `/api/videos/{id}/process` | Start video processing |
| GET    | `/api/videos/{id}/status` | Check processing status |
| GET    | `/api/videos/{id}/download` | Download processed video |
| DELETE | `/api/videos/{id}` | Delete a video |
| GET    | `/api/analytics/summary` | Get analytics data |
| GET    | `/api/health` | Health check endpoint |

## Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting
- Check logs in `backend/projectcars.log`
- Verify CORS settings in `app/main.py`
- Ensure all required environment variables are set
