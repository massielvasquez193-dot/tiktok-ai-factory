# Rollback Guide

## Instant Rollback (< 30 seconds)

```bash
# Disable all SaaS features, revert to v1.0.1 behavior
sed -i 's/^SAAS_MODE=.*/SAAS_MODE=false/' .env
docker compose -f docker-compose.prod.yml up -d server
```

**Effect**: Auth, workspaces, billing, credits, RBAC — all disabled. v1.0.1 API unchanged.

## Full Version Rollback

```bash
git stash                    # Save any uncommitted changes
git checkout v1.0.1          # Revert to last production release
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Database Rollback

New tables added since v1.0.1 can be dropped if needed:

```sql
-- Sprint 1-6 new tables (order matters for FK):
DROP TABLE IF EXISTS template_downloads, template_reviews, template_versions, templates CASCADE;
DROP TABLE IF EXISTS ai_chat_messages, saved_prompts, prompt_templates, ai_projects CASCADE;
DROP TABLE IF EXISTS publishing_jobs CASCADE;
DROP TABLE IF EXISTS credit_transactions, credit_wallets CASCADE;
DROP TABLE IF EXISTS subscriptions, plans CASCADE;
DROP TABLE IF EXISTS role_permissions, permissions, roles CASCADE;
DROP TABLE IF EXISTS workspace_members, workspaces CASCADE;
DROP TABLE IF EXISTS accounts, sessions, users CASCADE;

-- Remove workspace_id columns (35 tables):
-- ALTER TABLE products DROP COLUMN workspace_id;
-- (repeat for all 35 tables)
```

**⚠️ This will delete all SaaS data. Only use for full rollback.**

## Data Safety

- All SaaS tables are additive — existing v1.0.1 tables were only modified by adding NULLABLE `workspace_id` columns
- No existing rows were modified or deleted
- The original v1.0.1 pipeline (products → scripts → storyboards → videos) is completely untouched
