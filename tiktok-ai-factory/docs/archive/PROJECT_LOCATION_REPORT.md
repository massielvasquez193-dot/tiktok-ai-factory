# Project Location Report

Generated: 2026-06-07 22:18 Asia/Shanghai

## Confirmed Paths

| Path | Status | Notes |
|---|---|---|
| D:\CCTK视频\tiktok-ai-factory | Target project path | Full monorepo copied here from C drive |
| C:\Users\A\Documents\tiktokai工厂 | Source project path | Original complete local copy remains available |

## Required Files

| Item | Status |
|---|---|
| .git | Present after migration |
| package.json | Present |
| package-lock.json | Present |
| docker-compose.yml | Present |
| docker-compose.prod.yml | Present and validated by Compose config |
| .env | Created with non-secret defaults |
| .env.example | Present |
| pps/server | Present |
| pps/web | Present |
| packages/shared | Present |
| 
ginx/nginx.conf | Present |

## Notes

The target directory also contains extra top-level folders such as pp, lib, prisma, public, emails, and scripts. They appear to be from another SaaS/Next.js structure and are not part of the tracked monorepo status. They were preserved and not deleted.
