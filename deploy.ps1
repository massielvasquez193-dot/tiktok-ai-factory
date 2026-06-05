# TikTok AI Video Factory — Windows Deploy Script
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TikTok AI Factory — Windows Deploy      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker required. Install Docker Desktop: https://docker.com" -ForegroundColor Red
    exit 1
}

Write-Host "`n1. Building Docker images..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml build --no-cache

Write-Host "`n2. Starting services..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d

Write-Host "`n3. Waiting for PostgreSQL..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n4. Running database migrations..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml exec -T server npx prisma db push --skip-generate

Write-Host "`n5. Installing PM2..." -ForegroundColor Yellow
npm install -g pm2

Write-Host "`n6. Starting PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js
pm2 save
pm2 startup

Write-Host "`n✅ Deploy complete!" -ForegroundColor Green
Write-Host "   Web:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "   API:    http://localhost:4000/api/health" -ForegroundColor Cyan
Write-Host "   Nginx:  http://localhost:80" -ForegroundColor Cyan
