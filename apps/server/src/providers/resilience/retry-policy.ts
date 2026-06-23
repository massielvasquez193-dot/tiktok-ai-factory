/**
 * Retry Policy — exponential backoff + jitter for Provider operations.
 *
 * Designed to be test-injectable: clock, random, and sleep can be
 * overridden so tests run instantly without real timers.
 */

import { ProviderError, isNeverRetry } from './provider-errors';

// ── Types ────────────────────────────────────────────────────────────────

export interface RetryPolicyConfig {
  /** Maximum attempts including the first call (default 3). */
  maxAttempts?: number;
  /** Base delay in ms before the first retry (default 500). */
  baseDelayMs?: number;
  /** Multiplier for exponential backoff (default 2). */
  multiplier?: number;
  /** Maximum delay in ms between retries (default 10_000). */
  maxDelayMs?: number;
  /** Jitter fraction, applied as ±fraction of the computed delay (default 0.2 = ±20%). */
  jitter?: number;
}

export const DEFAULT_RETRY_POLICY: Required<RetryPolicyConfig> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  multiplier: 2,
  maxDelayMs: 10_000,
  jitter: 0.2,
};

// ── Injectables (for tests) ──────────────────────────────────────────────

/** Override for `Math.random` — set in tests for deterministic jitter. */
export let randomFn: () => number = () => Math.random();

/** Override for `setTimeout`-based sleep — set in tests for instant execution. */
export let sleepFn: (ms: number) => Promise<void> = (ms: number) =>
  new Promise(r => setTimeout(r, ms));

/** Override for `Date.now` — set in tests for deterministic clock. */
export let nowFn: () => number = () => Date.now();

export function setRetryTestOverrides(opts: {
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): void {
  if (opts.random) randomFn = opts.random;
  if (opts.sleep) sleepFn = opts.sleep;
  if (opts.now) nowFn = opts.now;
}

export function resetRetryTestOverrides(): void {
  randomFn = () => Math.random();
  sleepFn = (ms: number) => new Promise(r => setTimeout(r, ms));
  nowFn = () => Date.now();
}

// ── Retry decision ───────────────────────────────────────────────────────

/**
 * Return the delay (ms) to wait before attempt `n` (1-based index of the *next* call).
 *
 * Formula:  min(maxDelay, baseDelay * multiplier^(n-2))  ± jitter
 *
 *   attempt 1 (first try):     0 ms
 *   attempt 2 (first retry):   500 ms ± 20%
 *   attempt 3 (second retry):  1000 ms ± 20%
 */
export function computeDelay(attempt: number, config: RetryPolicyConfig = {}): number {
  const cfg = { ...DEFAULT_RETRY_POLICY, ...config };
  // attempt 0 = first try (no delay), attempt 1 = first retry, etc.
  if (attempt <= 0) return 0;
  const raw = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * Math.pow(cfg.multiplier, attempt - 1));
  const jitterAmount = raw * cfg.jitter;
  const jittered = raw + (randomFn() * 2 - 1) * jitterAmount;
  return Math.max(0, Math.round(jittered));
}

/**
 * Check whether an error should be retried.
 * - `ProviderError`: uses the `retryable` flag
 * - Other errors: treated as UNKNOWN → retry once (attempts 1-2 only)
 */
export function shouldRetry(err: unknown, attempt: number, config: RetryPolicyConfig = {}): boolean {
  const cfg = { ...DEFAULT_RETRY_POLICY, ...config };
  // attempt is 0-indexed; don't retry if the next call would exceed maxAttempts
  if (attempt + 1 >= cfg.maxAttempts) return false;

  if (err instanceof ProviderError) {
    if (isNeverRetry(err.code)) return false;
    return err.retryable;
  }
  // Non-ProviderError — retry at most once
  return attempt <= 0;
}

// ── Retry-After ──────────────────────────────────────────────────────────

/** Parse a Retry-After header value (seconds or HTTP-date). */
export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const parsed = Date.parse(header);
  if (Number.isFinite(parsed)) return Math.max(0, parsed - nowFn());
  return undefined;
}
