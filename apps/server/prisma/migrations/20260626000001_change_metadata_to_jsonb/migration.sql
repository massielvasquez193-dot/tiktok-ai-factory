-- Phase 1 Safety Fix: Change metadata columns from text to jsonb.
--
-- Prisma schema changed `String` → `Json` for:
--   1. video_tasks.metadata
--   2. analytics_events.metadata
--
-- This migration executes in a single transaction — if any ALTER fails,
-- both columns are rolled back to their original state.
--
-- Strategy (per column):
--   NULL   → NULL (should never happen — columns are NOT NULL)
--   ''     → '{}'::jsonb (empty string was the old default)
--   valid JSON text → parsed jsonb via metadata::jsonb
--
-- Rollback (if needed):
--   ALTER TABLE video_tasks   ALTER COLUMN metadata TYPE text USING metadata::text;
--   ALTER TABLE analytics_events ALTER COLUMN metadata TYPE text USING metadata::text;
--   ALTER TABLE video_tasks   ALTER COLUMN metadata SET DEFAULT ''::text;
--   ALTER TABLE analytics_events ALTER COLUMN metadata SET DEFAULT ''::text;

BEGIN;

-- ── 1. video_tasks.metadata ──────────────────────────────────────────────────

-- Remove old text default before type change
ALTER TABLE video_tasks ALTER COLUMN metadata DROP DEFAULT;

ALTER TABLE video_tasks
  ALTER COLUMN metadata TYPE jsonb
  USING CASE
    WHEN metadata IS NULL THEN NULL::jsonb
    WHEN metadata = ''   THEN '{}'::jsonb
    ELSE metadata::jsonb
  END;

-- New default: empty jsonb object
ALTER TABLE video_tasks ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- ── 2. analytics_events.metadata ─────────────────────────────────────────────

ALTER TABLE analytics_events ALTER COLUMN metadata DROP DEFAULT;

ALTER TABLE analytics_events
  ALTER COLUMN metadata TYPE jsonb
  USING CASE
    WHEN metadata IS NULL THEN NULL::jsonb
    WHEN metadata = ''   THEN '{}'::jsonb
    ELSE metadata::jsonb
  END;

ALTER TABLE analytics_events ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

COMMIT;
