/**
 * Unified Provider Mode System — single source of truth for ALL external providers.
 *
 * Phase 3D-1: Mode Unification safety gate.
 * No provider, worker, route, or service may read process.env for mode decisions
 * outside this module.
 *
 * Covered providers:
 *   Video:   seedance, kling, veo, runway
 *   LLM:     deepseek, openai, anthropic
 *   TTS:     tts
 *
 * Resolution priority (highest first):
 *   1. In-memory override (setProviderMode — tests only)
 *   2. Per-provider env var:      SEEDANCE_MODE, DEEPSEEK_MODE, TTS_MODE, …
 *   3. Category global env:       LLM_MODE (for LLM providers only)
 *   4. Global env:                PROVIDER_MODE
 *   5. Safe default:              'mock' (video, TTS) or 'disabled' (LLM)
 *
 * Real-mode safety:
 *   canGoReal requires mode === 'real' AND the corresponding API key is non-empty.
 *   API key presence alone does NOT trigger real mode.
 *   mode=real with missing key must be rejected by the caller — never silently
 *   fall back to mock.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type VideoProviderName = 'seedance' | 'kling' | 'veo' | 'runway';
export type LLMProviderName = 'deepseek' | 'openai' | 'anthropic';
export type TtsProviderName = 'tts';

/** Every provider known to the unified mode system. */
export type AnyProviderName = VideoProviderName | LLMProviderName | TtsProviderName;

export type ProviderMode = 'real' | 'mock' | 'disabled';

export interface ModeInfo {
  mode: ProviderMode;
  source: 'override' | 'env' | 'default';
}

export interface EffectiveMode extends ModeInfo {
  /** True when the provider is both in 'real' mode AND has a usable API key. */
  canGoReal: boolean;
  /** The API key (masked in audit logs; never exposed raw). */
  apiKeyPresent: boolean;
}

// ── Env-var maps ─────────────────────────────────────────────────────────────

/** All supported providers. */
const ALL_PROVIDERS: AnyProviderName[] = [
  'seedance', 'kling', 'veo', 'runway',
  'deepseek', 'openai', 'anthropic',
  'tts',
];

/** Which providers are LLM providers (use LLM_MODE as category fallback). */
const LLM_PROVIDERS: Set<string> = new Set(['deepseek', 'openai', 'anthropic']);

/** API key env-var per provider. */
const KEY_ENV: Record<string, string> = {
  seedance: 'SEEDANCE_API_KEY',
  kling: 'KLING_API_KEY',
  veo: 'VEO_API_KEY',
  runway: 'RUNWAY_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  tts: 'TTS_API_KEY',
} as const;

/** Per-provider mode env-var pattern.  e.g. SEEDANCE_MODE, DEEPSEEK_MODE */
function perProviderEnv(name: AnyProviderName): string {
  return `${name.toUpperCase()}_MODE`;
}

/** Safe default mode per provider category. */
function defaultMode(name: AnyProviderName): ProviderMode {
  if (LLM_PROVIDERS.has(name)) return 'disabled';
  return 'mock'; // video + TTS
}

// ── In-memory override state ─────────────────────────────────────────────────

const _overrides = new Map<AnyProviderName, ProviderMode | undefined>();

// ── Resolve ───────────────────────────────────────────────────────────────────

/**
 * Resolve the configured mode (before API-key validation).
 *
 *   1. in-memory override (tests)
 *   2. per-provider env   (SEEDANCE_MODE=real)
 *   3. category global    (LLM_MODE=real  → only for LLM providers)
 *   4. global             (PROVIDER_MODE=real)
 *   5. safe default       (mock for video/TTS, disabled for LLM)
 */
export function getProviderMode(name: AnyProviderName): ModeInfo {
  // 1. In-memory override
  const override = _overrides.get(name);
  if (override !== undefined && override !== null) {
    return { mode: override, source: 'override' };
  }

  // 2. Per-provider env
  const perProv = process.env[perProviderEnv(name)] as ProviderMode | undefined;
  if (perProv === 'real' || perProv === 'mock' || perProv === 'disabled') {
    return { mode: perProv, source: 'env' };
  }

  // 3. Global PROVIDER_MODE (applies to all providers)
  const global = process.env.PROVIDER_MODE as ProviderMode | undefined;
  if (global === 'real' || global === 'mock' || global === 'disabled') {
    return { mode: global, source: 'env' };
  }

  // 4. Category global (LLM_MODE for LLM providers only)
  if (LLM_PROVIDERS.has(name)) {
    const llmGlobal = process.env.LLM_MODE as ProviderMode | undefined;
    if (llmGlobal === 'real' || llmGlobal === 'mock' || llmGlobal === 'disabled') {
      return { mode: llmGlobal, source: 'env' };
    }
  }

  // 5. Safe default
  return { mode: defaultMode(name), source: 'default' };
}

// ── Effective mode (with API-key check) ───────────────────────────────────────

/**
 * Resolve the effective mode for a provider, including whether it can actually
 * make real API calls (mode === 'real' AND API key present).
 *
 * NEVER silently fall back to mock when mode is 'real' but key is missing —
 * the caller must explicitly handle that case.
 */
export function getEffectiveMode(name: AnyProviderName): EffectiveMode {
  const modeInfo = getProviderMode(name);
  const keyEnv = KEY_ENV[name] || '';
  const apiKey = keyEnv ? (process.env[keyEnv] || '') : '';

  return {
    ...modeInfo,
    canGoReal: modeInfo.mode === 'real' && apiKey.length > 0,
    apiKeyPresent: apiKey.length > 0,
  };
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/** True when the provider can make real API calls. */
export function isReal(name: AnyProviderName): boolean {
  return getEffectiveMode(name).canGoReal;
}

/** True when the provider is fully disabled (reject all operations). */
export function isDisabled(name: AnyProviderName): boolean {
  return getProviderMode(name).mode === 'disabled';
}

/** Get the raw API key for a provider (for passing to constructors). */
export function getApiKey(name: AnyProviderName): string {
  const keyEnv = KEY_ENV[name];
  if (!keyEnv) return '';
  return process.env[keyEnv] || '';
}

// ── Override API (for tests) ─────────────────────────────────────────────────

/**
 * Set an in-memory mode override for a provider.
 * Pass `undefined` to clear the override and fall back to env vars.
 */
export function setProviderMode(name: AnyProviderName, mode: ProviderMode | undefined): void {
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

// ── Audit ─────────────────────────────────────────────────────────────────────

/**
 * Get a summary of all provider modes suitable for health checks and dashboards.
 * Never includes API keys, tokens, or secrets.
 */
export function getAllProviderModes(): Record<AnyProviderName, ModeInfo> {
  const result = {} as Record<AnyProviderName, ModeInfo>;
  for (const name of ALL_PROVIDERS) {
    result[name] = getProviderMode(name);
  }
  return result;
}

/**
 * Startup audit — log the mode of every provider without exposing secrets.
 * Safe to call during server boot in any environment.
 */
export function logStartupAudit(): void {
  const lines: string[] = ['[Mode Audit] Provider mode summary:'];
  let realCount = 0;

  for (const name of ALL_PROVIDERS) {
    const eff = getEffectiveMode(name);
    const keyIcon = eff.apiKeyPresent ? '🔑' : '🔒';
    const realIcon = eff.canGoReal ? '⚠️  REAL' : eff.mode === 'real' ? '❌ REAL (no key)' : eff.mode;
    if (eff.canGoReal) realCount++;

    let line = `  ${keyIcon} ${name.padEnd(12)} → ${realIcon.padEnd(22)}`;
    line += ` [${eff.source}]`;
    lines.push(line);
  }

  if (realCount > 0) {
    lines.push(`[Mode Audit] ⚠️  ${realCount} provider(s) in REAL mode — external API calls possible.`);
  } else {
    lines.push('[Mode Audit] ✅ All providers in safe mode — no external API calls possible.');
  }

  console.log(lines.join('\n'));
}
