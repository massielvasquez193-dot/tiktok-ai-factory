-- Phase 6: Remaining AI Pipeline Model Migration
-- Adds workspace_id (NULLABLE) to all 24 remaining tables.
-- All columns are NULLABLE — zero data loss on existing rows.
-- Rollback: ALTER TABLE DROP COLUMN workspace_id for each table.

-- Pipeline: Script → Storyboard → Prompt → VideoTask → Video
ALTER TABLE "scripts" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "scripts_workspace_id_idx" ON "scripts"("workspace_id");

ALTER TABLE "storyboards" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "storyboards_workspace_id_idx" ON "storyboards"("workspace_id");

ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "prompts_workspace_id_idx" ON "prompts"("workspace_id");

ALTER TABLE "video_tasks" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "video_tasks_workspace_id_idx" ON "video_tasks"("workspace_id");

ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "videos_workspace_id_idx" ON "videos"("workspace_id");

-- Assets & Images
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "product_images_workspace_id_idx" ON "product_images"("workspace_id");

ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "assets_workspace_id_idx" ON "assets"("workspace_id");

ALTER TABLE "asset_library" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "asset_library_workspace_id_idx" ON "asset_library"("workspace_id");

-- Campaigns
ALTER TABLE "campaign_records" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "campaign_records_workspace_id_idx" ON "campaign_records"("workspace_id");

ALTER TABLE "campaign_v2" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "campaign_v2_workspace_id_idx" ON "campaign_v2"("workspace_id");

ALTER TABLE "campaign_countries" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "campaign_countries_workspace_id_idx" ON "campaign_countries"("workspace_id");

-- Post-production & Publishing
ALTER TABLE "post_productions" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "post_productions_workspace_id_idx" ON "post_productions"("workspace_id");

ALTER TABLE "publishing_tasks" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "publishing_tasks_workspace_id_idx" ON "publishing_tasks"("workspace_id");

ALTER TABLE "publish_tasks" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "publish_tasks_workspace_id_idx" ON "publish_tasks"("workspace_id");

-- Localization
ALTER TABLE "localizations" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "localizations_workspace_id_idx" ON "localizations"("workspace_id");

-- Analytics
ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "analytics_events_workspace_id_idx" ON "analytics_events"("workspace_id");

ALTER TABLE "video_performance" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "video_performance_workspace_id_idx" ON "video_performance"("workspace_id");

ALTER TABLE "learning_insights" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "learning_insights_workspace_id_idx" ON "learning_insights"("workspace_id");

-- Automation
ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "agent_runs_workspace_id_idx" ON "agent_runs"("workspace_id");

ALTER TABLE "automation_jobs" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "automation_jobs_workspace_id_idx" ON "automation_jobs"("workspace_id");

ALTER TABLE "automation_tasks" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "automation_tasks_workspace_id_idx" ON "automation_tasks"("workspace_id");

ALTER TABLE "automation_logs" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "automation_logs_workspace_id_idx" ON "automation_logs"("workspace_id");

-- TikTok Data
ALTER TABLE "tiktok_data" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "tiktok_data_workspace_id_idx" ON "tiktok_data"("workspace_id");

ALTER TABLE "tiktok_metrics" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "tiktok_metrics_workspace_id_idx" ON "tiktok_metrics"("workspace_id");
