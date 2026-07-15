-- Migration: add_credits_tracking_to_video_tasks
-- Batch 2: Credits + Video Generation Business Loop
--
-- Adds credits tracking and user attribution to the video_tasks table.
-- All new columns have safe defaults — no data loss, no existing row impact.
-- Forward-compatible: existing rows get credits_charged=0 (free legacy tasks).
--
-- Rollback:
--   ALTER TABLE "video_tasks" DROP COLUMN IF EXISTS "credits_charged";
--   ALTER TABLE "video_tasks" DROP COLUMN IF EXISTS "credit_transaction_id";
--   ALTER TABLE "video_tasks" DROP COLUMN IF EXISTS "refunded_at";
--   ALTER TABLE "video_tasks" DROP COLUMN IF EXISTS "user_id";
--   DROP INDEX IF EXISTS "video_tasks_user_id_idx";

ALTER TABLE "video_tasks"
ADD COLUMN IF NOT EXISTS "credits_charged" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "video_tasks"
ADD COLUMN IF NOT EXISTS "credit_transaction_id" VARCHAR(255);

ALTER TABLE "video_tasks"
ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMPTZ;

ALTER TABLE "video_tasks"
ADD COLUMN IF NOT EXISTS "user_id" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "video_tasks_user_id_idx" ON "video_tasks" ("user_id");
