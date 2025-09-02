#!/bin/bash
# Quick Start Script for Autonogrammer.ai API Infrastructure

set -e

echo "🚀 Autonogrammer.ai API Quick Start"
echo "===================================="
echo ""

# Check if mock models are running
echo "📡 Checking mock models..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Qwen3-MOE (Red Team) is running on port 8000"
else
    echo "❌ Qwen3-MOE not running. Starting..."
    cd /home/ubuntu/workspace && bash start_mock_models.sh
fi

if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Qwen3-42B (AI Coder) is running on port 8001"
else
    echo "❌ Qwen3-42B not running. Starting..."
    cd /home/ubuntu/workspace && bash start_mock_models.sh
fi

echo ""
echo "📦 Installing dependencies..."
cd /home/ubuntu/src/repos/agile-programmers

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install express helmet cors jsonwebtoken bcryptjs axios winston prom-client swagger-ui-express ioredis express-rate-limit rate-limit-redis validator isomorphic-dompurify uuid
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🔧 Compiling TypeScript..."
npx tsc src/api/gateway/server.ts --outDir dist --esModuleInterop --resolveJsonModule --allowSyntheticDefaultImports 2>/dev/null || true

echo ""
echo "🚀 Starting API Gateway..."
echo "API will be available at: http://localhost:3000"
echo "Swagger UI: http://localhost:3000/docs"
echo ""
echo "Test API Keys:"
echo "  Professional: autogram_sk_test_1234567890abcdef"
echo "  Enterprise: autogram_sk_enterprise_abcdef1234567890"
echo ""
echo "Press Ctrl+C to stop the server"
echo "===================================="
echo ""

# Start the server
node dist/api/gateway/server.js || npx ts-node src/api/gateway/server.ts