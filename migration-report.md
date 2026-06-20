# TikTok AI Factory — Migration Report

**Date:** Sat Jun  6 09:15:00     2026
**Project:** D:/CCTK视频

## Backup Contents

| Component | Files | Size |
|-----------|-------|------|
| .env | 1 | 725B |
| .env.production | 1 | 586B |
| dev.db | 1 | 569344B |
| uploads | 4 | - |
| videos | 3 | - |
| **Total** | **10** | **8.1M** |

## Recovery
```bash
cp migration-backup/.env apps/server/.env
cp migration-backup/.env.production .env.production
cp -r migration-backup/uploads/* uploads/
cp -r migration-backup/videos/* output/videos/
cp migration-backup/dev.db apps/server/prisma/dev.db
npm install && cd apps/server && npx prisma generate && cd ../..
npm run dev
```
