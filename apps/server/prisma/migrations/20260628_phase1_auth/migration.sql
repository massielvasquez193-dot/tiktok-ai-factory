-- Phase 1: Authentication Foundation
-- Creates User, Session, Account tables with zero impact on existing business tables.
-- Rollback: DROP TABLE IF EXISTS accounts, sessions, users CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- Users
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "users" (
    "id"              TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email"           TEXT      NOT NULL,
    "password_hash"   TEXT      NOT NULL,
    "name"            TEXT      NOT NULL DEFAULT '',
    "avatar_url"      TEXT,
    "locale"          TEXT      NOT NULL DEFAULT 'en',
    "timezone"        TEXT      NOT NULL DEFAULT 'UTC',
    "email_verified"  BOOLEAN   NOT NULL DEFAULT false,
    "status"          TEXT      NOT NULL DEFAULT 'active',
    "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");

-- ═══════════════════════════════════════════════════════════════
-- Sessions
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "sessions" (
    "id"          TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id"     TEXT      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token"       TEXT      NOT NULL,
    "expires"     TIMESTAMP NOT NULL,
    "ip_address"  TEXT,
    "user_agent"  TEXT,
    "created_at"  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_key" ON "sessions"("token");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions"("expires");

-- ═══════════════════════════════════════════════════════════════
-- Accounts (OAuth)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "accounts" (
    "id"                   TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "user_id"              TEXT      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "provider"             TEXT      NOT NULL,
    "provider_account_id"  TEXT      NOT NULL,
    "access_token"         TEXT,
    "refresh_token"        TEXT,
    "expires_at"           TIMESTAMP,
    "created_at"           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key"
  ON "accounts"("provider", "provider_account_id");
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts"("user_id");
