#!/bin/bash
# TikTok AI Video Factory — One-Click Deploy Script
# Supports: Linux / macOS / WSL

set -e
echo "╔══════════════════════════════════════════╗"
echo "║  TikTok AI Factory — Production Deploy   ║"
echo "╚══════════════════════════════════════════╝"

# Load env
[ -f .env.production ] && export $(grep -v '^#' .env.production | xargs)

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required. Install: https://docker.com"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ Docker Compose required"; exit 1; }

echo ""
echo "1. Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "2. Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "3. Waiting for PostgreSQL..."
sleep 10

echo ""
echo "4. Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T server npx prisma db push --skip-generate

echo ""
echo "5. Installing dependencies for server..."
(cd apps/server && npm install --production)

echo ""
echo "6. Starting with PM2..."
command -v pm2 >/dev/null 2>&1 && pm2 start ecosystem.config.js || echo "PM2 not installed — skipping PM2"

echo ""
echo "✅ Deploy complete!"
echo "   Web:    http://localhost:3000"
echo "   API:    http://localhost:4000/api/health"
echo "   Nginx:  http://localhost:80"
