-- Phase 5: First Business Model Migration
-- Adds workspace_id (NULLABLE) to Product, Research, and Knowledge tables.
-- Existing rows get NULL workspace_id — no data loss.
-- Rollback: ALTER TABLE DROP COLUMN workspace_id for each table.

-- Products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "products_workspace_id_idx" ON "products"("workspace_id");

-- Research
ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "research_workspace_id_idx" ON "research"("workspace_id");

-- Knowledge tables
ALTER TABLE "knowledge_hooks" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "knowledge_hooks_workspace_id_idx" ON "knowledge_hooks"("workspace_id");

ALTER TABLE "knowledge_pains" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "knowledge_pains_workspace_id_idx" ON "knowledge_pains"("workspace_id");

ALTER TABLE "knowledge_solutions" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "knowledge_solutions_workspace_id_idx" ON "knowledge_solutions"("workspace_id");

ALTER TABLE "knowledge_ctas" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "knowledge_ctas_workspace_id_idx" ON "knowledge_ctas"("workspace_id");

ALTER TABLE "knowledge_structures" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "knowledge_structures_workspace_id_idx" ON "knowledge_structures"("workspace_id");

ALTER TABLE "knowledge_prompts" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "knowledge_prompts_workspace_id_idx" ON "knowledge_prompts"("workspace_id");

ALTER TABLE "knowledge_videos" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
CREATE INDEX IF NOT EXISTS "knowledge_videos_workspace_id_idx" ON "knowledge_videos"("workspace_id");
