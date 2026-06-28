-- Sprint 3 Phase 2: Credits System
-- Rollback: DROP TABLE IF EXISTS credit_transactions, credit_wallets CASCADE;

CREATE TABLE IF NOT EXISTS "credit_wallets" (
    "id"               TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "workspace_id"     TEXT      NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "balance"          INTEGER   NOT NULL DEFAULT 0,
    "total_purchased"  INTEGER   NOT NULL DEFAULT 0,
    "total_used"       INTEGER   NOT NULL DEFAULT 0,
    "total_refunded"   INTEGER   NOT NULL DEFAULT 0,
    "total_granted"    INTEGER   NOT NULL DEFAULT 0,
    "monthly_reset_at" TIMESTAMP,
    "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_wallets_workspace_id_key" ON "credit_wallets"("workspace_id");

CREATE TABLE IF NOT EXISTS "credit_transactions" (
    "id"              TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "wallet_id"       TEXT      NOT NULL REFERENCES "credit_wallets"("id") ON DELETE CASCADE,
    "user_id"         TEXT      REFERENCES "users"("id"),
    "type"            TEXT      NOT NULL,
    "category"        TEXT      NOT NULL,
    "amount"          INTEGER   NOT NULL,
    "balance_after"   INTEGER   NOT NULL DEFAULT 0,
    "reference_type"  TEXT      NOT NULL DEFAULT '',
    "reference_id"    TEXT      NOT NULL DEFAULT '',
    "description"     TEXT      NOT NULL DEFAULT '',
    "idempotency_key" TEXT      NOT NULL,
    "metadata"        JSONB     NOT NULL DEFAULT '{}',
    "created_at"      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_idempotency_key_key" ON "credit_transactions"("idempotency_key");
CREATE INDEX IF NOT EXISTS "credit_transactions_wallet_id_idx" ON "credit_transactions"("wallet_id");
CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "credit_transactions_created_at_idx" ON "credit_transactions"("created_at");
CREATE INDEX IF NOT EXISTS "credit_transactions_category_idx" ON "credit_transactions"("category");
