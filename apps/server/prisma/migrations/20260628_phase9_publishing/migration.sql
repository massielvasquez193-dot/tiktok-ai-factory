-- Sprint 4 Phase 1: Publishing
CREATE TABLE IF NOT EXISTS "publishing_jobs" (
    "id"               TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "workspace_id"     TEXT      NOT NULL,
    "video_id"         TEXT      NOT NULL,
    "platform"         TEXT      NOT NULL DEFAULT 'tiktok',
    "title"            TEXT      NOT NULL DEFAULT '',
    "description"      TEXT      NOT NULL DEFAULT '',
    "hashtags"         TEXT      NOT NULL DEFAULT '',
    "pinned_comment"   TEXT      NOT NULL DEFAULT '',
    "scheduled_at"     TIMESTAMP,
    "status"           TEXT      NOT NULL DEFAULT 'draft',
    "error"            TEXT      NOT NULL DEFAULT '',
    "retry_count"      INTEGER   NOT NULL DEFAULT 0,
    "max_retries"      INTEGER   NOT NULL DEFAULT 3,
    "published_at"     TIMESTAMP,
    "external_post_id" TEXT      NOT NULL DEFAULT '',
    "external_post_url" TEXT     NOT NULL DEFAULT '',
    "metadata"         JSONB     NOT NULL DEFAULT '{}',
    "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "publishing_jobs_workspace_id_idx" ON "publishing_jobs"("workspace_id");
CREATE INDEX IF NOT EXISTS "publishing_jobs_video_id_idx" ON "publishing_jobs"("video_id");
CREATE INDEX IF NOT EXISTS "publishing_jobs_status_idx" ON "publishing_jobs"("status");
CREATE INDEX IF NOT EXISTS "publishing_jobs_platform_idx" ON "publishing_jobs"("platform");
CREATE INDEX IF NOT EXISTS "publishing_jobs_scheduled_at_idx" ON "publishing_jobs"("scheduled_at");
