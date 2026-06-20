# Migration Backup Audit

**Date:** 2026-06-06  
**Project:** TikTok AI Factory  
**Git-Ignored Files:** 29,045 total  

## Priority Classification

### 1. MUST BACKUP (Critical)

| File | Size | Reason |
|------|------|--------|
| `apps/server/.env` | 725 B | Seedance/OpenAI API keys |
| `.env.production` | 586 B | Docker production config |
| `apps/server/prisma/dev.db` | 556 KB | Complete database |

### 2. SHOULD BACKUP (Valuable)

| File | Size |
|------|------|
| `uploads/assets/4a24497a...jpg` | 384 KB |
| `uploads/campaigns/2cb94feb...png` | 117 KB |
| `uploads/asset_library/product_image/677c97b4...png` | ~0 B |
| `output/videos/cgt-20260605094715-85k4d.mp4` | 2.4 MB |
| `output/videos/cgt-20260605100328-2sfq6.mp4` | 2.2 MB |
| `output/videos/cgt-20260605100329-6wk2p.mp4` | 2.5 MB |
| `output/research/*/video.mp4` | 6 × 16KB |

### 3. CAN IGNORE (Rebuildable)

| Path | Reason |
|------|--------|
| `node_modules/` | `npm install` restores |
| `.next/` | `npm run build` restores |
| `apps/server/node_modules/` | `npm install` restores |
| `*.pack.gz` files | Webpack cache |

## Backup Structure

```
migration-backup/
├── .env                    (API keys)
├── .env.production         (Production config)
├── dev.db                  (SQLite database)
├── uploads/                (4 user files, 513 KB)
└── videos/                 (3 generated, 7.2 MB)
```

## Backup Status

- ✅ Backup already exists: 10 files, 8.1 MB
- ✅ ZIP created: `TikTok-AI-Factory-Migration.zip` (7.6 MB)

## Create/Update Backup

```bash
mkdir -p migration-backup/uploads migration-backup/videos
cp apps/server/.env migration-backup/.env
cp .env.production migration-backup/.env.production
cp apps/server/prisma/dev.db migration-backup/dev.db
cp -r uploads/* migration-backup/uploads/
cp -r output/videos/*.mp4 migration-backup/videos/
zip -r TikTok-AI-Factory-Migration.zip migration-backup/
```
