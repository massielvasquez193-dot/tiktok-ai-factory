# TikTok AI Factory — Project Backup

## Info
- **Project:** TikTok AI Video Factory
- **Path:** $(pwd)
- **GitHub:** https://github.com/massielvasquez193-dot/tiktok-ai-factory.git
- **Branch:** main
- **Commit:** $(git log -1 --format="%H" | head -c 8)
- **Date:** $(date)

## Recovery
```bash
git clone https://github.com/massielvasquez193-dot/tiktok-ai-factory.git
cd tiktok-ai-factory
npm install
cd apps/server && npx prisma generate && cd ../..
cp .env.example .env  # then edit .env
npm run dev
```

## Services
| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API | http://localhost:4000/api/health |
| Prisma Studio | npm run db:studio |
