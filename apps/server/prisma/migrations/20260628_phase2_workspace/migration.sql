-- Phase 2: Workspace Foundation
-- Creates Workspace and WorkspaceMember tables.
-- Zero impact on existing business tables.
-- Rollback: DROP TABLE IF EXISTS workspace_members, workspaces CASCADE;

CREATE TABLE IF NOT EXISTS "workspaces" (
    "id"          TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name"        TEXT      NOT NULL,
    "slug"        TEXT      NOT NULL,
    "logo_url"    TEXT,
    "settings"    JSONB     NOT NULL DEFAULT '{}',
    "status"      TEXT      NOT NULL DEFAULT 'active',
    "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_key" ON "workspaces"("slug");
CREATE INDEX IF NOT EXISTS "workspaces_status_idx" ON "workspaces"("status");

CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id"            TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id"       TEXT      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "workspace_id"  TEXT      NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "role"          TEXT      NOT NULL DEFAULT 'owner',
    "status"        TEXT      NOT NULL DEFAULT 'active',
    "joined_at"     TIMESTAMP NOT NULL DEFAULT now(),
    "invited_at"    TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_user_id_workspace_id_key"
  ON "workspace_members"("user_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_members_workspace_id_idx" ON "workspace_members"("workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_members_user_id_idx" ON "workspace_members"("user_id");
