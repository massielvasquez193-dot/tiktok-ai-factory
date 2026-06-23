/**
 * Circuit Breaker — prevents hammering a failing provider.
 *
 * States:  CLOSED → (failures >= threshold) → OPEN → (cooldown) → HALF_OPEN
 *
 * In-memory only — state is NOT shared across processes.
 * This is acceptable for single-instance deployments.
 * For multi-instance, add Redis-backed state in a future iteration.
 */

import { ProviderError, isNeverRetry } from './provider-errors';

// ── Types ────────────────────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Consecutive failures before opening (default 5). */
  failureThreshold?: number;
  /** Cooldown in ms before allowing a half-open probe (default 30_000). */
  cooldownMs?: number;
  /** Max concurrent probes in half-open state (default 1). */
  maxHalfOpenProbes?: number;
}

const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  maxHalfOpenProbes: 1,
};

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  openedAt: number;
  halfOpenProbes: number;
}

// ── State (per provider+operation) ───────────────────────────────────────

const circuits = new Map<string, CircuitEntry>();

/** Override for `Date.now` — set in tests. */
export let cbNowFn: () => number = () => Date.now();

export function setCbTestClock(now: () => number): void { cbNowFn = now; }
export function resetCbTestClock(): void { cbNowFn = () => Date.now(); }

function key(provider: string, operation: string): string {
  return `${provider}:${operation}`;
}

function getOrCreate(k: string, config: Required<CircuitBreakerConfig>): CircuitEntry {
  let entry = circuits.get(k);
  if (!entry) {
    entry = { state: 'CLOSED', failures: 0, openedAt: 0, halfOpenProbes: 0 };
    circuits.set(k, entry);
  }
  // Auto-transition OPEN → HALF_OPEN after cooldown
  if (entry.state === 'OPEN' && cbNowFn() - entry.openedAt >= config.cooldownMs) {
    entry.state = 'HALF_OPEN';
    entry.halfOpenProbes = 0;
  }
  return entry;
}

// ── Public API ───────────────────────────────────────────────────────────

/** Check whether a request may proceed. */
export function allowRequest(provider: string, operation: string, config: CircuitBreakerConfig = {}): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const entry = getOrCreate(key(provider, operation), cfg);

  if (entry.state === 'CLOSED') return true;
  if (entry.state === 'OPEN') return false;
  // HALF_OPEN: allow only up to maxHalfOpenProbes
  return entry.halfOpenProbes < cfg.maxHalfOpenProbes;
}

/** Get the current circuit state (for monitoring). Also handles OPEN→HALF_OPEN transition. */
export function getCircuitState(provider: string, operation: string, config: CircuitBreakerConfig = {}): CircuitState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const entry = getOrCreate(key(provider, operation), cfg);
  return entry.state;
}

/** Record that a request started (increment half-open probes). */
export function recordRequest(provider: string, operation: string): void {
  const entry = circuits.get(key(provider, operation));
  if (entry && entry.state === 'HALF_OPEN') {
    entry.halfOpenProbes++;
  }
}

/** Record success — reset to CLOSED. */
export function recordSuccess(provider: string, operation: string): void {
  const entry = circuits.get(key(provider, operation));
  if (!entry) return;
  entry.state = 'CLOSED';
  entry.failures = 0;
  entry.openedAt = 0;
  entry.halfOpenProbes = 0;
}

/** Record failure — only counts retryable/provider-side errors. */
export function recordFailure(provider: string, operation: string, err: unknown, config: CircuitBreakerConfig = {}): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const k = key(provider, operation);
  const entry = getOrCreate(k, cfg);

  // Never count client errors (401, 403, 400, etc.)
  if (err instanceof ProviderError && isNeverRetry(err.code)) return;

  entry.failures++;

  if (entry.state === 'HALF_OPEN') {
    // Probe failed — re-open
    entry.state = 'OPEN';
    entry.openedAt = cbNowFn();
    entry.halfOpenProbes = 0;
    return;
  }

  if (entry.state === 'CLOSED' && entry.failures >= cfg.failureThreshold) {
    entry.state = 'OPEN';
    entry.openedAt = cbNowFn();
  }
}

/** Reset all circuit state (for tests). */
export function resetAllCircuits(): void {
  circuits.clear();
}

/** Reset a specific circuit. */
export function resetCircuit(provider: string, operation: string): void {
  circuits.delete(key(provider, operation));
}
