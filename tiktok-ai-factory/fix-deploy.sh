#!/bin/bash
set -e

# ==============================
# TikTok AI Factory 修复部署脚本
# ==============================

WORKDIR=~/tiktok-ai-factory
cd $WORKDIR || { echo "目录不存在: $WORKDIR"; exit 1; }

mkdir -p backups
tar czf backups/before-fix-$(date +%F-%H%M%S).tar.gz \
    apps/web docker-compose.prod.yml nginx/nginx.conf 2>/dev/null || true

mkdir -p apps/web/src/app/videos apps/web/src/app/research

cat > apps/web/src/app/videos/page.tsx << 'EOF'
'use client'
export default function VideosPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">视频库</h1>
      <p className="text-gray-500">视频库页面已恢复。</p>
    </main>
  )
}
EOF

cat > apps/web/src/app/research/page.tsx << 'EOF'
'use client'
export default function ResearchPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">研究中心</h1>
      <p className="text-gray-500">研究中心页面已恢复。</p>
    </main>
  )
}
EOF

grep -qxF "nginx/ssl" .dockerignore || echo "nginx/ssl" >> .dockerignore
grep -qxF "backups" .dockerignore || echo "backups" >> .dockerignore
grep -qxF "node_modules" .dockerignore || echo "node_modules" >> .dockerignore

docker compose -f docker-compose.prod.yml build web server
docker compose -f docker-compose.prod.yml up -d --no-build
docker ps

echo "=== 网站验证 ==="
curl -I https://ttvideoai.com
curl -I https://ttvideoai.com/videos
curl -I https://ttvideoai.com/research
curl https://ttvideoai.com/api/health
