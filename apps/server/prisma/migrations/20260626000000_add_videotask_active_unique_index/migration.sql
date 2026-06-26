-- Phase 3D-2B1: Partial unique index on active video tasks.
--
-- Ensures that at most ONE active (pending/submitted/processing) VideoTask
-- exists per (prompt_id, provider) combination.
--
-- Does NOT block:
--   - Multiple completed tasks for the same prompt+provider
--   - Multiple failed tasks for the same prompt+provider
--   - A new active task while an old completed/failed task exists
--
-- Rollback: DROP INDEX IF EXISTS "VideoTask_active_prompt_provider_key";

CREATE UNIQUE INDEX "VideoTask_active_prompt_provider_key"
ON "video_tasks" ("prompt_id", "provider")
WHERE "status" IN ('pending', 'submitted', 'processing');
