#!/bin/bash

# Travel & Expense Management System Startup Script
echo "🚀 Starting Travel & Expense Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed. Please install MongoDB first."
    echo "   You can download it from: https://www.mongodb.com/try/download/community"
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB..."
    # Try to start MongoDB (this might require sudo on some systems)
    if command -v brew &> /dev/null; then
        brew services start mongodb-community
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start mongod
    else
        echo "Please start MongoDB manually and run this script again."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Create backend config if it doesn't exist
if [ ! -f "backend/config.js" ]; then
    echo "⚙️  Creating backend configuration..."
    cp backend/config.example.js backend/config.js
    echo "✅ Configuration file created. Please edit backend/config.js if needed."
fi

# Create uploads directory
mkdir -p backend/uploads

echo "✅ All dependencies installed and configured!"
echo ""
echo "🌐 Starting the application..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Start both frontend and backend
npm run dev
