# Project Cars 2.0

A modern vehicle detection and analysis system using computer vision and deep learning.

## Features

- Real-time vehicle detection using YOLOv8
- Video processing pipeline for vehicle analysis
- RESTful API built with FastAPI
- Modern web interface with real-time updates
- Database integration for storing analysis results

## Prerequisites

- Python 3.8+
- Node.js 16+ (for frontend)
- pip (Python package manager)
- npm (Node.js package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/project-cars-2.0.git
   cd project-cars-2.0
   ```

2. Set up the backend:
   ```bash
   # Create and activate virtual environment (recommended)
   python -m venv .venv
   .venv\\Scripts\\activate  # On Windows
   # source .venv/bin/activate  # On macOS/Linux

   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Configuration

1. Create a `.env` file in the root directory with the following variables:
   ```
   # Backend
   SECRET_KEY=your-secret-key
   DATABASE_URL=sqlite:///./database.db
   
   # Frontend (if needed)
   VITE_API_URL=http://localhost:8000
   ```

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
project-cars-2.0/
├── backend/               # Backend FastAPI application
│   ├── app/               # Main application package
│   ├── database/          # Database models and migrations
│   └── tests/             # Backend tests
├── frontend/              # Frontend React application
│   ├── public/            # Static files
│   └── src/               # Source files
├── .gitignore             # Git ignore file
├── README.md              # This file
└── requirements.txt       # Python dependencies
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
