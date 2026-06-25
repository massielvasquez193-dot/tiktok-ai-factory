/**
 * Execute with Resilience — unified retry + circuit breaker wrapper.
 *
 * Usage:
 *   const result = await executeWithResilience({
 *     provider: 'seedance',
 *     operation: 'createTask',
 *     fn: () => provider.createTask(input),
 *   });
 */

import { ProviderError, classifyNetworkError, classifyHttpError, classifyMalformed, classifyDisabled } from './provider-errors';
import { RetryPolicyConfig, DEFAULT_RETRY_POLICY, computeDelay, shouldRetry, parseRetryAfter, sleepFn, nowFn } from './retry-policy';
import { allowRequest, recordRequest, recordSuccess, recordFailure, CircuitBreakerConfig } from './circuit-breaker';

// ── Types ────────────────────────────────────────────────────────────────

export interface ResilienceOptions {
  provider: string;
  operation: string;
  fn: () => Promise<any>;
  retry?: RetryPolicyConfig;
  circuitBreaker?: CircuitBreakerConfig;
  idempotencyKey?: string;
  /** If true, skip retry/circuit-breaker entirely (for mock/disabled modes). */
  bypassResilience?: boolean;
  /** Called before each attempt (for logging). Parameters are sanitized. */
  onAttempt?: (attempt: number, delayMs: number) => void;
}

export interface ResilienceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ProviderError;
  attempts: number;
}

// ── Main ─────────────────────────────────────────────────────────────────

export async function executeWithResilience<T = any>(opts: ResilienceOptions): Promise<ResilienceResult<T>> {
  const { provider, operation, fn, retry, circuitBreaker, idempotencyKey, bypassResilience, onAttempt } = opts;

  // Fast path: no resilience needed
  if (bypassResilience) {
    try {
      const data = await fn();
      return { success: true, data: data as T, attempts: 1 };
    } catch (e: any) {
      const err = wrapError(e, provider, operation);
      return { success: false, error: err, attempts: 1 };
    }
  }

  // Check circuit breaker first
  if (!allowRequest(provider, operation, circuitBreaker)) {
    const err = new ProviderError({
      code: 'CIRCUIT_OPEN',
      message: `Circuit open for ${provider}/${operation}`,
      provider,
      operation,
    });
    console.warn(`[Resilience] ${err.toSanitized()}`);
    return { success: false, error: err, attempts: 0 };
  }

  recordRequest(provider, operation);

  let lastError: ProviderError | undefined;

  for (let attempt = 0; attempt < (retry?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts); attempt++) {
    // Compute delay for retries (attempt 0 = first call, no delay)
    const delay = computeDelay(attempt, retry);
    if (delay > 0) {
      if (onAttempt) onAttempt(attempt + 1, delay);
      await sleepFn(delay);
    }

    try {
      const data = await fn();
      recordSuccess(provider, operation);
      return { success: true, data: data as T, attempts: attempt + 1 };
    } catch (e: any) {
      lastError = wrapError(e, provider, operation);

      // Log sanitized error (include idempotencyKey for traceability)
      if (attempt === 0) {
        const ikSuffix = idempotencyKey ? ` [ik:${idempotencyKey.slice(0, 40)}]` : '';
        console.warn(`[Resilience] ${lastError.toSanitized()}${ikSuffix}`);
      }

      if (!shouldRetry(lastError, attempt, retry)) {
        recordFailure(provider, operation, lastError, circuitBreaker);
        return { success: false, error: lastError, attempts: attempt + 1 };
      }

      // If the error carries Retry-After, use it
      if (lastError.retryAfterMs) {
        const ra = lastError.retryAfterMs;
        console.log(`[Resilience] ${provider}/${operation}: Retry-After ${ra}ms`);
        await sleepFn(ra);
      }
    }
  }

  // All attempts exhausted
  recordFailure(provider, operation, lastError, circuitBreaker);
  return { success: false, error: lastError!, attempts: (retry?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts) };
}

// ── Error wrapping ───────────────────────────────────────────────────────

function wrapError(e: unknown, provider: string, operation: string): ProviderError {
  if (e instanceof ProviderError) return e;

  // Raw fetch Response errors
  if (e && typeof e === 'object' && 'status' in (e as any)) {
    const { status } = e as any;
    const body = typeof (e as any).text === 'function' ? '' : String(e);
    const retryAfter = parseRetryAfter((e as any).headers?.get?.('Retry-After') ?? null);
    return classifyHttpError({ status, body, provider, operation, retryAfterMs: retryAfter, cause: e });
  }

  // Error-like objects
  if (e instanceof Error) {
    return classifyNetworkError({ error: e as Error & { code?: string }, provider, operation });
  }

  return new ProviderError({ code: 'UNKNOWN', message: String(e).slice(0, 200), provider, operation, cause: e });
}
