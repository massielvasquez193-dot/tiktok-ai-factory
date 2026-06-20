# TikTok AI Factory — Docker Image Save
# Export all Docker images + volumes for offline deployment
param(
    [string]$OutputDir = ".\docker-export"
)

$ErrorActionPreference = "Stop"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TikTok AI Factory — Docker Export     ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# 1. Build image if not exists
Write-Host "`n1. Building Docker image..." -ForegroundColor Yellow
docker build -t tiktok-factory:latest . 2>&1 | Select-Object -Last 3

# 2. Pull dependent images
Write-Host "2. Pulling dependencies..." -ForegroundColor Yellow
docker pull postgres:16-alpine 2>$null
docker pull redis:7-alpine 2>$null

# 3. Save images
Write-Host "3. Saving images to tar..." -ForegroundColor Yellow
docker save -o "$OutputDir\tiktok-factory.tar" tiktok-factory:latest
docker save -o "$OutputDir\postgres.tar" postgres:16-alpine
docker save -o "$OutputDir\redis.tar" redis:7-alpine

# 4. Backup volumes
Write-Host "4. Backing up data volumes..." -ForegroundColor Yellow

# Database
if (Test-Path "apps\server\prisma\dev.db") {
    Copy-Item "apps\server\prisma\dev.db" "$OutputDir\dev.db" -Force
    Write-Host "   ✅ Database exported" -ForegroundColor Green
}

# Uploads
if ((Test-Path "uploads") -and (Get-ChildItem "uploads" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) {
    Compress-Archive -Path "uploads\*" -DestinationPath "$OutputDir\uploads.zip" -Force
    Write-Host "   ✅ Uploads exported" -ForegroundColor Green
}

# Videos
if ((Test-Path "output\videos") -and (Get-ChildItem "output\videos" -Filter "*.mp4" -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) {
    Compress-Archive -Path "output\videos\*.mp4" -DestinationPath "$OutputDir\videos.zip" -Force
    Write-Host "   ✅ Videos exported" -ForegroundColor Green
}

# Config
if (Test-Path "apps\server\.env") { Copy-Item "apps\server\.env" "$OutputDir\.env" -Force }
if (Test-Path ".env.production") { Copy-Item ".env.production" "$OutputDir\.env.production" -Force }

# 5. Create load script
@"
# TikTok AI Factory — Docker Load Script
Write-Host "Loading Docker images..." -ForegroundColor Yellow
docker load -i "tiktok-factory.tar"
docker load -i "postgres.tar"
docker load -i "redis.tar"

Write-Host "Restoring data..." -ForegroundColor Yellow
if (Test-Path "dev.db") { Copy-Item "dev.db" "apps\server\prisma\dev.db" -Force }
if (Test-Path "uploads.zip") { Expand-Archive "uploads.zip" "uploads" -Force }
if (Test-Path "videos.zip") { New-Item -Force -Type Directory "output\videos" | Out-Null; Expand-Archive "videos.zip" "output\videos" -Force }
if (Test-Path ".env") { Copy-Item ".env" "apps\server\.env" -Force }
if (Test-Path ".env.production") { Copy-Item ".env.production" ".env.production" -Force }

Write-Host "Starting services..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d

Write-Host "`n✅ System restored! http://localhost:3000" -ForegroundColor Green
"@ | Out-File -FilePath "$OutputDir\docker-load.ps1" -Encoding UTF8

# 6. Summary
$SIZE = (Get-ChildItem $OutputDir -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "`n✅ Export complete!" -ForegroundColor Green
Write-Host "   Location: $OutputDir" -ForegroundColor Cyan
Write-Host "   Size:     $([math]::Round($SIZE/1GB, 2)) GB" -ForegroundColor Cyan
Write-Host "`n   Transfer entire folder '$OutputDir' to new machine" -ForegroundColor Yellow
Write-Host "   Then run: .\docker-load.ps1" -ForegroundColor Yellow
