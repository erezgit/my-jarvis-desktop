#!/bin/bash

# Excel Editor Frontend Startup Script

set -e

echo "🚀 Starting Excel Editor Frontend..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the implementation directory"
    exit 1
fi

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Set environment variables
export REACT_APP_API_URL="http://localhost:8000"
export REACT_APP_WS_URL="ws://localhost:8000"

# Start the development server
echo "🌐 Starting React development server on http://localhost:3000"
echo "📊 Excel Editor will be available at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start