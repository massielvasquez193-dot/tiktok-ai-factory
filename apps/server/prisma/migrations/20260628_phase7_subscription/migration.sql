-- Sprint 3 Phase 1: Subscription Plans
-- Rollback: DROP TABLE IF EXISTS subscriptions, plans CASCADE;

CREATE TABLE IF NOT EXISTS "plans" (
    "id"                       TEXT    PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name"                     TEXT    NOT NULL,
    "display_name"             TEXT    NOT NULL,
    "description"              TEXT    NOT NULL DEFAULT '',
    "price_monthly"            INTEGER NOT NULL DEFAULT 0,
    "price_yearly"             INTEGER NOT NULL DEFAULT 0,
    "stripe_price_id_monthly"  TEXT,
    "stripe_price_id_yearly"   TEXT,
    "credit_monthly"           INTEGER NOT NULL DEFAULT 0,
    "max_members"              INTEGER NOT NULL DEFAULT 1,
    "max_video_generations"    INTEGER NOT NULL DEFAULT 0,
    "max_storage_mb"           INTEGER NOT NULL DEFAULT 100,
    "max_research_analyses"    INTEGER NOT NULL DEFAULT 0,
    "has_api_access"           BOOLEAN NOT NULL DEFAULT false,
    "has_team_feature"         BOOLEAN NOT NULL DEFAULT false,
    "has_priority_queue"       BOOLEAN NOT NULL DEFAULT false,
    "has_custom_branding"      BOOLEAN NOT NULL DEFAULT false,
    "has_advanced_analytics"   BOOLEAN NOT NULL DEFAULT false,
    "has_white_label"          BOOLEAN NOT NULL DEFAULT false,
    "is_active"                BOOLEAN NOT NULL DEFAULT true,
    "sort_order"               INTEGER NOT NULL DEFAULT 0,
    "features"                 JSONB   NOT NULL DEFAULT '{}',
    "created_at"               TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "plans_name_key" ON "plans"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "plans_stripe_price_id_monthly_key" ON "plans"("stripe_price_id_monthly");
CREATE UNIQUE INDEX IF NOT EXISTS "plans_stripe_price_id_yearly_key" ON "plans"("stripe_price_id_yearly");

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id"                       TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "workspace_id"             TEXT      NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "plan_id"                  TEXT      NOT NULL REFERENCES "plans"("id"),
    "status"                   TEXT      NOT NULL DEFAULT 'active',
    "billing_period"           TEXT      NOT NULL DEFAULT 'monthly',
    "current_period_start"     TIMESTAMP NOT NULL DEFAULT now(),
    "current_period_end"       TIMESTAMP NOT NULL DEFAULT (now() + interval '1 month'),
    "canceled_at"              TIMESTAMP,
    "trial_ends_at"            TIMESTAMP,
    "stripe_subscription_id"   TEXT,
    "created_at"               TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at"               TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_workspace_id_key" ON "subscriptions"("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");
