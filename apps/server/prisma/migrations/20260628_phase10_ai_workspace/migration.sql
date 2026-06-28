-- Sprint 5 Phase 1: AI Workspace
CREATE TABLE IF NOT EXISTS "ai_projects" ("id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, "workspace_id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'active', "product_ids" TEXT NOT NULL DEFAULT '[]', "script_count" INTEGER NOT NULL DEFAULT 0, "video_count" INTEGER NOT NULL DEFAULT 0, "metadata" JSONB NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "ai_projects_workspace_id_idx" ON "ai_projects"("workspace_id");
CREATE INDEX IF NOT EXISTS "ai_projects_status_idx" ON "ai_projects"("status");

CREATE TABLE IF NOT EXISTS "prompt_templates" ("id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, "workspace_id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL DEFAULT 'general', "content" TEXT NOT NULL, "variables" TEXT NOT NULL DEFAULT '[]', "language" TEXT NOT NULL DEFAULT 'en', "is_public" BOOLEAN NOT NULL DEFAULT false, "is_official" BOOLEAN NOT NULL DEFAULT false, "usage_count" INTEGER NOT NULL DEFAULT 0, "created_by" TEXT NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "prompt_templates_workspace_id_idx" ON "prompt_templates"("workspace_id");
CREATE INDEX IF NOT EXISTS "prompt_templates_category_idx" ON "prompt_templates"("category");
CREATE INDEX IF NOT EXISTS "prompt_templates_is_public_idx" ON "prompt_templates"("is_public");

CREATE TABLE IF NOT EXISTS "saved_prompts" ("id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, "workspace_id" TEXT NOT NULL, "name" TEXT NOT NULL, "prompt" TEXT NOT NULL, "negative_prompt" TEXT NOT NULL DEFAULT '', "model" TEXT NOT NULL DEFAULT 'seedance', "category" TEXT NOT NULL DEFAULT 'general', "tags" TEXT NOT NULL DEFAULT '', "is_favorite" BOOLEAN NOT NULL DEFAULT false, "usage_count" INTEGER NOT NULL DEFAULT 0, "created_by" TEXT NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "saved_prompts_workspace_id_idx" ON "saved_prompts"("workspace_id");
CREATE INDEX IF NOT EXISTS "saved_prompts_category_idx" ON "saved_prompts"("category");
CREATE INDEX IF NOT EXISTS "saved_prompts_is_favorite_idx" ON "saved_prompts"("is_favorite");

CREATE TABLE IF NOT EXISTS "ai_chat_messages" ("id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, "workspace_id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "role" TEXT NOT NULL, "content" TEXT NOT NULL, "model" TEXT NOT NULL DEFAULT 'deepseek', "tokens_in" INTEGER NOT NULL DEFAULT 0, "tokens_out" INTEGER NOT NULL DEFAULT 0, "metadata" JSONB NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "ai_chat_messages_workspace_id_created_at_idx" ON "ai_chat_messages"("workspace_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_chat_messages_user_id_idx" ON "ai_chat_messages"("user_id");
