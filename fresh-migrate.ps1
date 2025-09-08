# Fresh Migration Script for Docker (Windows PowerShell)
# This script runs the fresh migration inside the Docker container

Write-Host "RAPEX Docker Fresh Migration" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

# Navigate to infra directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$infraPath = Join-Path $scriptPath "infra"
Set-Location $infraPath

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "ERROR: docker-compose.yml not found in infra directory" -ForegroundColor Red
    exit 1
}

Write-Host "Stopping containers..." -ForegroundColor Yellow
docker compose down

Write-Host "Removing database volume..." -ForegroundColor Yellow
docker volume rm infra_postgres_data 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Volume doesn't exist, continuing..." -ForegroundColor Gray
}

Write-Host "Starting database..." -ForegroundColor Blue
docker compose up -d db

Write-Host "Waiting for database to be ready..." -ForegroundColor Blue
Start-Sleep 10

Write-Host "Starting backend..." -ForegroundColor Blue
docker compose up -d backend

Write-Host "Waiting for backend to be ready..." -ForegroundColor Blue
Start-Sleep 15

Write-Host "Running fresh migration script..." -ForegroundColor Green
docker compose exec backend python fresh_migrate.py

Write-Host "Starting all services..." -ForegroundColor Blue
docker compose up -d

Write-Host ""
Write-Host "Fresh migration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Credentials:" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Email: admin@example.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Merchant Credentials:" -ForegroundColor Cyan
Write-Host "   Username: merchant" -ForegroundColor White
Write-Host "   Email: merchant@example.com" -ForegroundColor White
Write-Host "   Password: merchant123" -ForegroundColor White
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Admin Dashboard: http://localhost:3000/admin/dashboard" -ForegroundColor White
Write-Host "   Merchant Dashboard: http://localhost:3000/merchant/dashboard" -ForegroundColor White
Write-Host "   Backend API: http://localhost:8000" -ForegroundColor White
