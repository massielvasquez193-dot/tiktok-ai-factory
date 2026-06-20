# =========================================
# TikTok AI Factory — SaaS Deployment Script
# =========================================
# Usage: Run PowerShell as Administrator
#   .\deploy-saas.ps1
# =========================================

$ErrorActionPreference = "Stop"
$ProjectPath = "D:\CCTK视频\tiktok-ai-factory"
Set-Location $ProjectPath

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TikTok AI Factory — SaaS Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ─── 1. Check Prerequisites ──────────────────────────
Write-Host "[1/8] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $(node -v)" -ForegroundColor Green

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker Desktop is required. Install from https://docker.com" -ForegroundColor Red
    exit 1
}
Write-Host "  Docker: $(docker --version)" -ForegroundColor Green

# ─── 2. Install Dependencies ─────────────────────────
Write-Host "`n[2/8] Installing npm dependencies..." -ForegroundColor Yellow
npm install
Write-Host "  Dependencies installed." -ForegroundColor Green

# ─── 3. Generate Prisma Client ────────────────────────
Write-Host "`n[3/8] Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate
Write-Host "  Prisma Client generated." -ForegroundColor Green

# ─── 4. Start Docker Services ─────────────────────────
Write-Host "`n[4/8] Starting Docker services..." -ForegroundColor Yellow
docker compose up -d
Write-Host "  Waiting for PostgreSQL to be healthy..."
do {
    Start-Sleep -Seconds 2
    $healthy = docker compose ps -a 2>$null | Select-String "healthy"
} until ($healthy)
Write-Host "  Database is healthy." -ForegroundColor Green

# ─── 5. Push Database Schema ─────────────────────────
Write-Host "`n[5/8] Pushing database schema..." -ForegroundColor Yellow
npm run db:push
Write-Host "  Schema pushed." -ForegroundColor Green

# ─── 6. Configure Environment ─────────────────────────
Write-Host "`n[6/8] Environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}
Write-Host "  Edit .env and fill in:"
Write-Host "    • JWT_SECRET (random 64-char string)" -ForegroundColor Gray
Write-Host "    • STRIPE_SECRET_KEY (sk_live_xxx or sk_test_xxx)" -ForegroundColor Gray
Write-Host "    • STRIPE_WEBHOOK_SECRET (whsec_xxx)" -ForegroundColor Gray
Write-Host "    • OPENAI_API_KEY (sk-xxx)" -ForegroundColor Gray
Write-Host "    • SEEDANCE_API_KEY" -ForegroundColor Gray

# ─── 7. Build Production ──────────────────────────────
Write-Host "`n[7/8] Building for production..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml build
Write-Host "  Production images built." -ForegroundColor Green

# ─── 8. Start Production Stack ────────────────────────
Write-Host "`n[8/8] Starting production stack..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d
Write-Host "`n========================================" -ForegroundColor Green
Write-Host " SaaS Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API:       http://localhost:4000/api/health" -ForegroundColor Cyan
Write-Host "  Admin:     http://localhost:3000/admin" -ForegroundColor Cyan
Write-Host "  Settings:  http://localhost:3000/settings" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Create admin user: register, then update role to 'admin' in DB" -ForegroundColor Gray
Write-Host "  2. Set up Stripe webhooks: stripe listen --forward-to localhost:4000/api/payments/webhook" -ForegroundColor Gray
Write-Host "  3. Configure email service in .env" -ForegroundColor Gray
Write-Host ""
