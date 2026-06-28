# Sprint 1 — Phase 1: Authentication Foundation

> **Date**: 2026-06-28
> **Commit**: `feat: phase1-auth-foundation`
> **Status**: ✅ Complete

---

## Summary

Added user authentication (registration, login, logout, token verification) with zero impact on existing business tables. All auth is gated behind `SAAS_MODE` feature flag (default: `false`).

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `apps/server/prisma/schema.prisma` | Modified | Added User, Session, Account models |
| `apps/server/prisma/migrations/20260628_phase1_auth/migration.sql` | Created | Migration SQL |
| `apps/server/src/services/auth.service.ts` | Created | Auth service (register, login, verify, logout, profile) |
| `apps/server/src/middleware/auth.ts` | Created | Auth middleware with SAAS_MODE gate |
| `apps/server/src/routes/auth.ts` | Created | Auth REST endpoints |
| `apps/server/src/index.ts` | Modified | Mount auth routes + webhook stub |
| `apps/server/src/lib/__tests__/phase1-auth.test.ts` | Created | 26 assertion test suite |
| `.env.example` | Modified | Added SAAS_MODE, JWT_SECRET |
| `docker-compose.prod.yml` | Modified | Added SAAS_MODE, JWT_SECRET env vars |

## Database Migration

```sql
-- New tables (additive only, no existing table changes):
CREATE TABLE users         -- User accounts
CREATE TABLE sessions      -- JWT session tracking
CREATE TABLE accounts      -- OAuth accounts (future)

-- Indexes: 6 new
-- Foreign keys: sessions.user_id → users.id, accounts.user_id → users.id
```

## API Changes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | Bearer | Invalidate session |
| GET | `/api/auth/me` | Bearer | Current user profile |
| PATCH | `/api/auth/me` | Bearer | Update profile |
| POST | `/api/webhooks/stripe` | No | Stub (Phase 2) |

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SAAS_MODE` | `false` | No | Enable/disable authentication |
| `JWT_SECRET` | (empty) | When SAAS_MODE=true | JWT signing secret (min 32 chars) |

## Feature Flags

| Flag | Default | Effect |
|------|---------|--------|
| `SAAS_MODE` | `false` | When false: auth routes return 503 "disabled", middleware is no-op. When true: full auth enforcement. |

## Test Results

```
═══ Phase 1: Authentication Tests ═══
  Passed: 24  Failed: 0
```

## Rollback Procedure

1. Set `SAAS_MODE=false` in environment
2. Restart server: `docker compose up -d server`
3. All auth routes return 503 — production unchanged
4. DB rollback (if required): `DROP TABLE accounts, sessions, users CASCADE`

## Deployment Verification

- [x] `npm run build` — TypeScript compilation clean
- [x] Docker server container builds and starts
- [x] `curl /api/health` returns `saasMode: false`
- [x] `curl /api/products` returns products without auth
- [x] `curl /api/auth/register` returns "Auth is disabled"
- [x] With `SAAS_MODE=true`: register → login → me → logout works
- [x] Tokens invalidated after logout
- [x] All 5 Docker containers healthy
- [x] Existing AI Pipeline unaffected

## Compliance

- [x] Additive migration only (no DROP/RENAME)
- [x] Zero impact on existing business tables
- [x] SAAS_MODE=false preserves v1.0.1 behavior
- [x] All SaaS code behind feature flag
