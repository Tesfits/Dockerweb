#!/bin/bash
echo "🔍 Running smoke test..."

# Find container names by port
backend_name=$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep '5000->' | awk '{print $1}')
frontend_name=$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep '3000->' | awk '{print $1}')
mongo_name=$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep '27017->' | awk '{print $1}')

# Function to check if container is running
check_container() {
    if [ -n "$1" ]; then
        echo "✅ $1 is running"
    else
        echo "❌ Container on port $2 FAILED"
    fi
}

# Function to check HTTP service
check_http() {
    if curl -s --head "http://localhost:$1" | grep -q "200 OK"; then
        echo "✅ Service on port $1 is working"
    else
        echo "❌ Service on port $1 FAILED"
    fi
}

echo "🖥 Checking backend..."
check_container "$backend_name" 5000
check_http 5000

echo "🗄 Checking MongoDB..."
check_container "$mongo_name" 27017

echo "🌐 Checking frontend..."
check_container "$frontend_name" 3000
check_http 3000

echo "✅ Smoke test completed."
