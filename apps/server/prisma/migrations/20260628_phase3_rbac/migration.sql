-- Phase 3: RBAC System
-- Creates Role, Permission, RolePermission tables.
-- Zero impact on existing business tables.
-- Rollback: DROP TABLE IF EXISTS role_permissions, permissions, roles CASCADE;

CREATE TABLE IF NOT EXISTS "roles" (
    "id"            TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "workspace_id"  TEXT      NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "name"          TEXT      NOT NULL,
    "is_system"     BOOLEAN   NOT NULL DEFAULT false,
    "description"   TEXT      NOT NULL DEFAULT '',
    "created_at"    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "roles_workspace_id_name_key" ON "roles"("workspace_id", "name");

CREATE TABLE IF NOT EXISTS "permissions" (
    "id"          TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "resource"    TEXT    NOT NULL,
    "action"      TEXT    NOT NULL,
    "description" TEXT    NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_resource_action_key" ON "permissions"("resource", "action");

CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "role_id"       TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
    "permission_id" TEXT NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_id_permission_id_key"
  ON "role_permissions"("role_id", "permission_id");
