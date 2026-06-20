# Production Report

Generated: 2026-06-07 22:18 Asia/Shanghai

## Production Compose

docker-compose.prod.yml is present and configured for:

- web: Next.js frontend
- server: Express/Prisma backend
- postgres: PostgreSQL 16
- redis: Redis 7
- nginx: reverse proxy

## Health Checks

| Service | Health Check |
|---|---|
| postgres | pg_isready |
| redis | edis-cli ping |
| server | GET /api/health via Node fetch |
| web | GET / via Node fetch |
| nginx | GET /api/health via wget |

## Validation

| Check | Status |
|---|---|
| Compose config | Passed |
| Docker CLI | Passed |
| Docker daemon | Failed due missing WSL |
| Container start | Blocked by Docker engine |
| Local backend health | Passed, HTTP 200 on http://localhost:4002/api/health |
| Local frontend health | Passed, HTTP 200 on http://localhost:3000 |

## Production Readiness

Production Docker files are ready, but local Windows Docker runtime cannot complete container startup until WSL is enabled and the machine is restarted.
