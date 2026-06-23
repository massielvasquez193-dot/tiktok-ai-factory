/**
 * Provider Mode Configuration — centralized real/mock toggle per AI provider.
 *
 * Phase 3A: defaults to 'mock' for all providers. No real API calls are made.
 *
 * Mode resolution order (highest priority first):
 *   1. Per-provider env var:  SEEDANCE_MODE, KLING_MODE, VEO_MODE
 *   2. Global env var:        PROVIDER_MODE
 *   3. Default:               'mock'
 *
 * Usage:
 *   import { isReal, getProviderMode, setProviderMode } from '../lib/provider-mode';
 *   if (isReal('seedance')) { ... }
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ProviderName = 'seedance' | 'kling' | 'veo' | 'runway';
export type ProviderMode = 'real' | 'mock' | 'disabled';

// ── State ────────────────────────────────────────────────────────────────────

/** In-memory overrides (useful for tests). Reset when set to undefined. */
const _overrides = new Map<ProviderName, ProviderMode | undefined>();

// ── Resolve ───────────────────────────────────────────────────────────────────

/** Read mode from environment, falling back to defaults. */
function readEnvMode(name: ProviderName): ProviderMode | undefined {
  // Per-provider override (e.g. SEEDANCE_MODE=real)
  const perProvider = process.env[`${name.toUpperCase()}_MODE`];
  if (perProvider === 'real' || perProvider === 'mock' || perProvider === 'disabled') {
    return perProvider;
  }
  // Global override (e.g. PROVIDER_MODE=real)
  const global = process.env.PROVIDER_MODE;
  if (global === 'real' || global === 'mock' || global === 'disabled') {
    return global;
  }
  return undefined;
}

/**
 * Get the effective mode for a provider.
 * In-memory override > per-provider env > global env > default 'mock'.
 */
export function getProviderMode(name: ProviderName): ProviderMode {
  const override = _overrides.get(name);
  if (override) return override;
  return readEnvMode(name) || 'mock';
}

/** Returns true when the provider is in 'real' mode. */
export function isReal(name: ProviderName): boolean {
  return getProviderMode(name) === 'real';
}

/** Returns true when the provider is fully disabled (no API calls, no mock simulation). */
export function isDisabled(name: ProviderName): boolean {
  return getProviderMode(name) === 'disabled';
}

/**
 * Set an in-memory mode override for a provider.
 * Pass `undefined` to clear the override and fall back to env vars.
 */
export function setProviderMode(name: ProviderName, mode: ProviderMode | undefined): void {
  if (mode === undefined) {
    _overrides.delete(name);
  } else {
    _overrides.set(name, mode);
  }
}

/** Clear all in-memory overrides. */
export function resetProviderModes(): void {
  _overrides.clear();
}

/**
 * Get a summary of all provider modes.
 * Useful for health-check endpoints and dashboards.
 */
export function getAllProviderModes(): Record<ProviderName, { mode: ProviderMode; source: 'override' | 'env' | 'default' }> {
  const names: ProviderName[] = ['seedance', 'kling', 'veo', 'runway'];
  const result = {} as Record<ProviderName, { mode: ProviderMode; source: 'override' | 'env' | 'default' }>;
  for (const name of names) {
    if (_overrides.has(name)) {
      result[name] = { mode: _overrides.get(name)!, source: 'override' };
    } else if (readEnvMode(name)) {
      result[name] = { mode: readEnvMode(name)!, source: 'env' };
    } else {
      result[name] = { mode: 'mock', source: 'default' };
    }
  }
  return result;
}
