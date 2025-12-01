#!/bin/bash

# Excel Editor Backend Startup Script

set -e

echo "🚀 Starting Excel Editor Backend..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ]; then
    echo "❌ Error: Please run this script from the implementation directory"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Create uploads directory
mkdir -p uploads

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start the server
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "📊 Excel Editor API will be available at http://localhost:8000"
echo "📚 API documentation at http://localhost:8000/docs"
echo "🔗 WebSocket endpoint at ws://localhost:8000/ws/{session_id}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000 --reload