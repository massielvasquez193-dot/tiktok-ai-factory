# Sprint 1 — Phase 2: Workspace Foundation

> **Date**: 2026-06-28
> **Commit**: `feat: phase2-workspace-foundation`
> **Status**: ✅ Complete

---

## Summary

Added workspace management (CRUD, member management, invitation) with zero impact on existing business tables. All workspace APIs are gated behind `SAAS_MODE` feature flag. Each workspace supports 5 roles: owner, admin, manager, editor, viewer.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `apps/server/prisma/schema.prisma` | Modified | Added Workspace, WorkspaceMember models |
| `apps/server/prisma/migrations/20260628_phase2_workspace/migration.sql` | Created | Migration SQL |
| `apps/server/src/services/workspace.service.ts` | Created | Workspace CRUD, member management, invite logic |
| `apps/server/src/routes/workspaces.ts` | Created | Workspace REST endpoints (9 routes) |
| `apps/server/src/index.ts` | Modified | Mount workspace routes |
| `apps/server/src/lib/__tests__/phase2-workspace.test.ts` | Created | 24 assertion test suite |

## Database Migration

```sql
-- New tables (additive only, no existing table changes):
CREATE TABLE workspaces         -- Workspace containers
CREATE TABLE workspace_members  -- User ↔ Workspace junction

-- Indexes: 4 new
-- Foreign keys: workspace_members.user_id → users.id
--               workspace_members.workspace_id → workspaces.id
-- Unique: (user_id, workspace_id) — one membership per user per workspace
```

## API Changes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces` | Bearer | List user's workspaces |
| POST | `/api/workspaces` | Bearer | Create workspace |
| GET | `/api/workspaces/:id` | Bearer | Get workspace detail |
| PATCH | `/api/workspaces/:id` | Bearer (admin+) | Update workspace |
| DELETE | `/api/workspaces/:id` | Bearer (owner) | Soft-delete workspace |
| GET | `/api/workspaces/:id/members` | Bearer | List members |
| POST | `/api/workspaces/:id/invite` | Bearer (admin+) | Invite member |
| PATCH | `/api/workspaces/:id/members/:id` | Bearer (admin+) | Update member role |
| DELETE | `/api/workspaces/:id/members/:id` | Bearer (admin+) | Remove member |

## Environment Variables

No new environment variables. Uses existing `SAAS_MODE` and `JWT_SECRET` from Phase 1.

## Test Results

```
═══ Phase 2: Workspace Tests ═══
  Passed: 24  Failed: 0
```

## Rollback Procedure

1. Set `SAAS_MODE=false` — all workspace routes return 503 "Workspaces disabled"
2. Existing data unchanged
3. DB rollback: `DROP TABLE workspace_members, workspaces CASCADE`

## Deployment Verification

- [x] `npm run build` — TypeScript compilation clean
- [x] Docker server container builds and starts
- [x] `curl /api/health` returns `saasMode: false`
- [x] `curl /api/products` returns products (unchanged)
- [x] With `SAAS_MODE=true`: register → login → create workspace → list → update → delete works
- [x] Member invite → list members → update role → remove member works
- [x] Last owner cannot be removed
- [x] Duplicate email invite rejected
- [x] Non-admin cannot update/delete workspace
- [x] All 5 Docker containers healthy
- [x] Existing AI Pipeline unaffected

## Compliance

- [x] Additive migration only (no DROP/RENAME)
- [x] Zero impact on existing business tables
- [x] SAAS_MODE=false preserves v1.0.1 behavior
- [x] All workspace code behind feature flag
- [x] One business domain per commit (workspace only)
