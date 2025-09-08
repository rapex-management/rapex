#!/bin/bash
# Fresh Migration Script for Docker
# This script runs the fresh migration inside the Docker container

echo "🚀 RAPEX Docker Fresh Migration"
echo "================================"

# Navigate to infra directory
cd "$(dirname "$0")/../infra"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in infra directory"
    exit 1
fi

echo "🛑 Stopping containers..."
docker compose down

echo "🗑️  Removing database volume..."
docker volume rm infra_postgres_data 2>/dev/null || echo "Volume doesn't exist, continuing..."

echo "🔄 Starting database..."
docker compose up -d db

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🔧 Starting backend..."
docker compose up -d backend

echo "⏳ Waiting for backend to be ready..."
sleep 15

echo "🌱 Running fresh migration script..."
docker compose exec backend python fresh_migrate.py

echo "🌐 Starting all services..."
docker compose up -d

echo ""
echo "✅ Fresh migration completed!"
echo ""
echo "👤 Admin Credentials:"
echo "   Username: admin"
echo "   Email: admin@example.com"
echo "   Password: admin123"
echo ""
echo "🏪 Merchant Credentials:"
echo "   Username: merchant"
echo "   Email: merchant@example.com"
echo "   Password: merchant123"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Admin Dashboard: http://localhost:3000/admin/dashboard"
echo "   Merchant Dashboard: http://localhost:3000/merchant/dashboard"
echo "   Backend API: http://localhost:8000"
