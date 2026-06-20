# TikTok AI Factory — Docker Image Load
# Restore from exported images on new machine without internet

Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TikTok AI Factory — Docker Restore   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Cyan

# 1. Load Docker images
Write-Host "`n1. Loading Docker images..." -ForegroundColor Yellow
docker load -i "tiktok-factory.tar" 2>$null
docker load -i "postgres.tar" 2>$null
docker load -i "redis.tar" 2>$null
Write-Host "   ✅ Images loaded" -ForegroundColor Green

# 2. Restore data
Write-Host "`n2. Restoring data..." -ForegroundColor Yellow
if (Test-Path "dev.db") { Copy-Item "dev.db" "apps\server\prisma\dev.db" -Force; Write-Host "   ✅ Database restored" -ForegroundColor Green }
if (Test-Path "uploads.zip") { New-Item -Force -Type Directory "uploads" | Out-Null; Expand-Archive "uploads.zip" "uploads" -Force; Write-Host "   ✅ Uploads restored" -ForegroundColor Green }
if (Test-Path "videos.zip") { New-Item -Force -Type Directory "output\videos" | Out-Null; Expand-Archive "videos.zip" "output\videos" -Force; Write-Host "   ✅ Videos restored" -ForegroundColor Green }
if (Test-Path ".env") { Copy-Item ".env" "apps\server\.env" -Force; Write-Host "   ✅ Config restored" -ForegroundColor Green }
if (Test-Path ".env.production") { Copy-Item ".env.production" ".env.production" -Force }

# 3. Start services
Write-Host "`n3. Starting TikTok AI Factory..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d

Write-Host "`n✅ System restored successfully!" -ForegroundColor Green
Write-Host "   Web:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   API:  http://localhost:4000/api/health" -ForegroundColor Cyan
Write-Host "   DB:   PostgreSQL :5432" -ForegroundColor Cyan
Write-Host "   Redis: :6379" -ForegroundColor Cyan
