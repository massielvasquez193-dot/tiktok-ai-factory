/**
 * SaaS Mode Feature Flag
 *
 * Central accessor for the SAAS_MODE environment variable.
 * When false (default): all auth/workspace/RBAC middleware is no-op.
 * When true: full multi-tenant SaaS features are enforced.
 *
 * Set via: SAAS_MODE=true docker compose up -d
 */

export const SAAS_MODE = process.env.SAAS_MODE === 'true';

export function isSaaSEnabled(): boolean {
  return SAAS_MODE;
}
