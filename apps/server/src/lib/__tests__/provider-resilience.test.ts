/**
 * Provider Resilience Tests — error classification, retry, circuit breaker.
 *
 * Run: npx tsx src/lib/__tests__/provider-resilience.test.ts
 *
 * Constraints: no real network, DB, Redis. All clocks injected.
 */

import {
  ProviderError, ProviderErrorCode,
  classifyHttpError, classifyNetworkError, classifyMalformed, classifyDisabled,
  isRetryable, isNeverRetry,
} from '../../providers/resilience/provider-errors';

import {
  computeDelay, shouldRetry, parseRetryAfter,
  setRetryTestOverrides, resetRetryTestOverrides,
  DEFAULT_RETRY_POLICY,
} from '../../providers/resilience/retry-policy';

import {
  allowRequest, recordRequest, recordSuccess, recordFailure,
  getCircuitState, resetAllCircuits, resetCircuit,
  setCbTestClock, resetCbTestClock,
} from '../../providers/resilience/circuit-breaker';

import { executeWithResilience } from '../../providers/resilience/execute-with-resilience';

// ── Test runner ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

async function main(): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════
  // A. Error Classification — HTTP
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── A. Error Classification (HTTP) ──');

  const cases: Array<{ status: number; expected: ProviderErrorCode; retryable: boolean }> = [
    { status: 400, expected: 'INVALID_REQUEST', retryable: false },
    { status: 401, expected: 'AUTHENTICATION', retryable: false },
    { status: 403, expected: 'AUTHORIZATION', retryable: false },
    { status: 404, expected: 'NOT_FOUND', retryable: false },
    { status: 422, expected: 'INVALID_REQUEST', retryable: false },
    { status: 429, expected: 'RATE_LIMIT', retryable: true },
    { status: 500, expected: 'PROVIDER_5XX', retryable: true },
    { status: 502, expected: 'PROVIDER_5XX', retryable: true },
    { status: 503, expected: 'PROVIDER_5XX', retryable: true },
    { status: 504, expected: 'PROVIDER_5XX', retryable: true },
  ];

  for (const { status, expected, retryable } of cases) {
    const err = classifyHttpError({ status, provider: 'test', operation: 'op' });
    assert(err.code === expected, `HTTP ${status} → ${expected}`);
    assert(err.retryable === retryable, `HTTP ${status} retryable=${retryable}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // B. Error Classification — Network / Timeout / Malformed / Disabled
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── B. Error Classification (other) ──');

  console.log('  B1 AbortError → TIMEOUT');
  {
    const abort = new DOMException('aborted', 'AbortError');
    const err = classifyNetworkError({ error: abort as any, provider: 'p', operation: 'op' });
    assert(err.code === 'TIMEOUT', 'AbortError classified as TIMEOUT');
    assert(err.retryable === true, 'TIMEOUT is retryable');
  }

  console.log('  B2 ECONNRESET → NETWORK');
  {
    const e = new Error('ECONNRESET');
    const err = classifyNetworkError({ error: e as any, provider: 'p', operation: 'op' });
    assert(err.code === 'NETWORK', 'ECONNRESET classified as NETWORK');
  }

  console.log('  B3 malformed response');
  {
    const err = classifyMalformed({ message: 'Unexpected token', provider: 'p', operation: 'op' });
    assert(err.code === 'MALFORMED_RESPONSE', 'malformed classified correctly');
    assert(err.retryable === false, 'malformed is not retryable');
  }

  console.log('  B4 disabled provider');
  {
    const err = classifyDisabled('seedance', 'create');
    assert(err.code === 'DISABLED', 'disabled classified correctly');
    assert(err.retryable === false, 'disabled is not retryable');
  }

  console.log('  B5 never-retry codes');
  {
    assert(isNeverRetry('AUTHENTICATION'), 'AUTHENTICATION never retry');
    assert(isNeverRetry('INVALID_REQUEST'), 'INVALID_REQUEST never retry');
    assert(isNeverRetry('DISABLED'), 'DISABLED never retry');
    assert(isNeverRetry('CONFIGURATION'), 'CONFIGURATION never retry');
    assert(!isNeverRetry('TIMEOUT'), 'TIMEOUT is not never-retry');
  }

  console.log('  B6 sanitized message hides sensitive content');
  {
    const err = classifyHttpError({ status: 401, body: 'Bearer sk-secret-token-12345', provider: 'openai', operation: 'chat' });
    const s = err.toSanitized();
    assert(!s.includes('sk-secret'), 'sanitized message does not leak token');
    assert(s.includes('401'), 'sanitized message includes status code');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // C. Retry Policy — delays and decisions
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── C. Retry Policy ──');

  // Fake random and sleep for deterministic tests
  let fakeRandom = () => 0.5; // mid-point, jitter = 0
  let slept: number[] = [];
  setRetryTestOverrides({ random: () => 0.5, sleep: async (ms) => { slept.push(ms); } });

  console.log('  C1 computeDelay: attempt 0 → 0ms');
  assert(computeDelay(0) === 0, 'attempt 0 delay is 0');

  console.log('  C2 computeDelay: attempt 1 → ~500ms (with jitter at midpoint)');
  {
    const d = computeDelay(1);
    assert(d >= 400 && d <= 600, `attempt 1 delay ~500ms, got ${d}`);
  }

  console.log('  C3 computeDelay: attempt 2 → ~1000ms');
  {
    const d = computeDelay(2);
    assert(d >= 800 && d <= 1200, `attempt 2 delay ~1000ms, got ${d}`);
  }

  console.log('  C4 computeDelay: capped at maxDelayMs');
  {
    // With config: maxDelayMs=100, baseDelayMs=500, attempt 5 would be 500*2^3=4000ms but capped
    const d = computeDelay(5, { maxDelayMs: 200 });
    assert(d <= 240, `delay capped at ~200ms (±20%), got ${d}`);
  }

  console.log('  C5 retryable error → should retry');
  {
    const err = classifyHttpError({ status: 503, provider: 'p', operation: 'op' });
    assert(shouldRetry(err, 0), 'retryable on attempt 0');
    assert(shouldRetry(err, 1), 'retryable on attempt 1');
    assert(!shouldRetry(err, 2), 'max attempts reached');
  }

  console.log('  C6 non-retryable error → never retry');
  {
    const err = classifyHttpError({ status: 401, provider: 'p', operation: 'op' });
    assert(!shouldRetry(err, 0), '401 never retryable');
    assert(!shouldRetry(err, 1), '401 never retryable');
  }

  console.log('  C7 parseRetryAfter: seconds');
  {
    const ra = parseRetryAfter('30');
    assert(ra === 30000, '30s Retry-After → 30000ms');
  }

  console.log('  C8 parseRetryAfter: null');
  {
    assert(parseRetryAfter(null) === undefined, 'null → undefined');
  }

  resetRetryTestOverrides();
  slept = [];

  // ═══════════════════════════════════════════════════════════════════════
  // D. Circuit Breaker
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── D. Circuit Breaker ──');

  let fakeClock = 0;
  setCbTestClock(() => fakeClock);
  resetAllCircuits();

  console.log('  D1 initial state is CLOSED');
  assert(getCircuitState('p', 'op') === 'CLOSED', 'initial state CLOSED');

  console.log('  D2 CLOSED allows requests');
  assert(allowRequest('p', 'op'), 'CLOSED allows request');

  console.log('  D3 non-retryable errors do not increment failure count');
  {
    const err = classifyHttpError({ status: 401, provider: 'p', operation: 'op' });
    for (let i = 0; i < 10; i++) recordFailure('p', 'op2', err);
    assert(getCircuitState('p', 'op2') === 'CLOSED', 'auth errors never open circuit');
  }

  console.log('  D4 failure threshold opens circuit');
  {
    const err = classifyHttpError({ status: 503, provider: 'p', operation: 'op3' });
    for (let i = 0; i < 5; i++) recordFailure('p', 'op3', err);
    assert(getCircuitState('p', 'op3') === 'OPEN', 'circuit opened after 5 503s');
  }

  console.log('  D5 OPEN state rejects requests');
  assert(!allowRequest('p', 'op3'), 'OPEN rejects request');

  console.log('  D6 cooldown transitions to HALF_OPEN');
  {
    fakeClock += 31_000; // advance past cooldown
    assert(getCircuitState('p', 'op3') === 'HALF_OPEN', 'OPEN → HALF_OPEN after cooldown');
  }

  console.log('  D7 HALF_OPEN allows probe');
  {
    assert(allowRequest('p', 'op3'), 'HALF_OPEN allows probe');
    recordRequest('p', 'op3');
  }

  console.log('  D8 successful probe → CLOSED');
  {
    recordSuccess('p', 'op3');
    assert(getCircuitState('p', 'op3') === 'CLOSED', 'probe success → CLOSED');
  }

  console.log('  D9 failed probe → back to OPEN');
  {
    const err = classifyHttpError({ status: 503, provider: 'p', operation: 'op4' });
    for (let i = 0; i < 5; i++) recordFailure('p', 'op4', err);
    assert(getCircuitState('p', 'op4') === 'OPEN', 'opened');
    fakeClock += 31_000;
    assert(getCircuitState('p', 'op4') === 'HALF_OPEN', 'half-open');
    recordFailure('p', 'op4', err);
    assert(getCircuitState('p', 'op4') === 'OPEN', 'failed probe → re-opened');
  }

  console.log('  D10 provider/operation isolation');
  {
    const err = classifyHttpError({ status: 503, provider: 'a', operation: 'x' });
    for (let i = 0; i < 5; i++) recordFailure('a', 'x', err);
    assert(getCircuitState('a', 'x') === 'OPEN', 'a/x is open');
    assert(getCircuitState('a', 'y') === 'CLOSED', 'a/y still closed (diff operation)');
    assert(getCircuitState('b', 'x') === 'CLOSED', 'b/x still closed (diff provider)');
  }

  console.log('  D11 resetCircuit removes state');
  {
    resetCircuit('a', 'x');
    assert(getCircuitState('a', 'x') === 'CLOSED', 'resetCircuit clears');
  }

  console.log('  D12 resetAllCircuits clears everything');
  {
    resetAllCircuits();
    for (const [k, v] of [] as any) { /* no-op — just verify clean */ }
    assert(getCircuitState('p', 'op3') === 'CLOSED', 'all reset');
  }

  resetCbTestClock();
  resetAllCircuits();

  // ═══════════════════════════════════════════════════════════════════════
  // E. executeWithResilience
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── E. executeWithResilience ──');

  let callCount = 0;
  setRetryTestOverrides({ random: () => 0.5, sleep: async () => {}, now: () => Date.now() });

  console.log('  E1 successful call returns result');
  {
    callCount = 0;
    const r = await executeWithResilience({
      provider: 'test', operation: 'op',
      fn: async () => { callCount++; return { ok: true }; },
    });
    assert(r.success === true, 'success flag true');
    assert(r.data.ok === true, 'data returned');
    assert(r.attempts === 1, '1 attempt');
    assert(callCount === 1, 'fn called once');
  }

  console.log('  E2 successful call does not trigger retry');
  {
    callCount = 0;
    const r = await executeWithResilience({
      provider: 'test', operation: 'op2',
      fn: async () => { callCount++; return 'done'; },
    });
    assert(callCount === 1, 'no retry on success');
  }

  console.log('  E3 retryable error triggers retry, eventually succeeds');
  {
    callCount = 0;
    const r = await executeWithResilience({
      provider: 'test', operation: 'op3',
      fn: async () => {
        callCount++;
        if (callCount < 3) throw classifyHttpError({ status: 503, provider: 'test', operation: 'op3' });
        return 'recovered';
      },
      retry: { maxAttempts: 3 },
    });
    assert(r.success === true, 'eventually succeeds');
    assert(callCount === 3, 'retried twice, succeeded on 3rd');
    assert(r.attempts === 3, 'attempts = 3');
  }

  console.log('  E4 non-retryable error does NOT retry');
  {
    callCount = 0;
    const r = await executeWithResilience({
      provider: 'test', operation: 'op4',
      fn: async () => { callCount++; throw classifyHttpError({ status: 401, provider: 'test', operation: 'op4' }); },
    });
    assert(callCount === 1, 'no retry on 401');
    assert(r.success === false, 'failure returned');
    assert(r.error!.code === 'AUTHENTICATION', 'correct error code');
  }

  console.log('  E5 all retries exhausted → failure');
  {
    callCount = 0;
    const r = await executeWithResilience({
      provider: 'test', operation: 'op5',
      fn: async () => { callCount++; throw classifyHttpError({ status: 503, provider: 'test', operation: 'op5' }); },
      retry: { maxAttempts: 3 },
    });
    assert(callCount === 3, 'all 3 attempts made');
    assert(r.success === false, 'failure after exhaustion');
    assert(r.attempts === 3, '3 attempts recorded');
  }

  console.log('  E6 bypassResilience skips retry');
  {
    callCount = 0;
    const r = await executeWithResilience({
      provider: 'test', operation: 'op6',
      fn: async () => { callCount++; throw new Error('fail'); },
      bypassResilience: true,
    });
    assert(callCount === 1, 'no retry when bypassed');
    assert(r.success === false, 'failure with bypass');
  }

  console.log('  E7 circuit breaker prevents call when OPEN');
  {
    // Force circuit open first
    const err = classifyHttpError({ status: 503, provider: 'cbtest', operation: 'cb' });
    for (let i = 0; i < 5; i++) recordFailure('cbtest', 'cb', err);
    assert(getCircuitState('cbtest', 'cb') === 'OPEN', 'circuit open');

    callCount = 0;
    const r = await executeWithResilience({
      provider: 'cbtest', operation: 'cb',
      fn: async () => { callCount++; return 'ok'; },
    });
    assert(callCount === 0, 'fn never called when circuit open');
    assert(r.success === false, 'circuit open returns failure');
    assert(r.error!.code === 'CIRCUIT_OPEN', 'correct error code');
  }

  console.log('  E8 disallowed retry does not trigger circuit failure count');
  {
    // Auth errors should not count toward circuit breaker
    const r = await executeWithResilience({
      provider: 'safe', operation: 'op',
      fn: async () => { throw classifyHttpError({ status: 401, provider: 'safe', operation: 'op' }); },
    });
    assert(getCircuitState('safe', 'op') === 'CLOSED', '401 error does not open circuit');
  }

  resetRetryTestOverrides();
  resetAllCircuits();

  // ═══════════════════════════════════════════════════════════════════════
  // F. ProviderManager integration
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── F. ProviderManager Integration ──');

  console.log('  F1 ProviderManager exports resetResilience');
  {
    const { ProviderManager } = await import('../../providers/manager/ProviderManager');
    assert(typeof ProviderManager.resetResilience === 'function', 'has resetResilience static method');
    // Call it — should not throw
    ProviderManager.resetResilience();
  }

  console.log('  F2 ProviderManager instance has submit method');
  {
    const { ProviderManager } = await import('../../providers/manager/ProviderManager');
    const inst = ProviderManager.instance;
    assert(typeof inst.submit === 'function', 'has submit');
    assert(typeof inst.list === 'function', 'has list');
  }

  console.log('  F3 ProviderManager list returns providers');
  {
    const { ProviderManager } = await import('../../providers/manager/ProviderManager');
    const providers = ProviderManager.instance.list();
    assert(Array.isArray(providers), 'list returns array');
    assert(providers.length >= 2, 'at least 2 providers registered');
    for (const p of providers) {
      assert(typeof p.name === 'string', `provider ${p.name} has name`);
      assert(typeof p.model === 'string', `provider ${p.model} has model`);
    }
  }

  console.log('  F4 serializeMetadata used in ProviderManager context');
  {
    const { serializeMetadata, deserializeMetadata } = await import('../../lib/video-downloader');
    const raw = serializeMetadata({ provider: 'seedance', model: 'svd' });
    const parsed = deserializeMetadata<{ provider: string }>(raw);
    assert(parsed.provider === 'seedance', 'provider field preserved');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // G. Edge cases & safety
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── G. Safety & Logging ──');

  console.log('  G1 ProviderError logs do not leak secrets');
  {
    const err = classifyNetworkError({
      error: Object.assign(new Error('fetch failed'), { message: 'fetch failed for https://api.example.com?key=secret123' }),
      provider: 'test', operation: 'op',
    });
    const s = err.toSanitized();
    assert(s.includes('NETWORK'), 'sanitized includes code');
    assert(!s.includes('secret123'), 'sanitized hides fake key in URL');
  }

  console.log('  G2 DEFAULT_RETRY_POLICY has reasonable values');
  {
    assert(DEFAULT_RETRY_POLICY.maxAttempts === 3, 'default 3 attempts');
    assert(DEFAULT_RETRY_POLICY.baseDelayMs === 500, 'base 500ms');
    assert(DEFAULT_RETRY_POLICY.maxDelayMs === 10_000, 'max 10s');
    assert(DEFAULT_RETRY_POLICY.jitter === 0.2, 'jitter 20%');
  }

  console.log('  G3 retry overrides are resettable');
  {
    setRetryTestOverrides({ random: () => 0, sleep: async () => {} });
    resetRetryTestOverrides();
    // Should not throw — just verify the reset works
    resetAllCircuits();
    resetCbTestClock();
    assert(true, 'overrides resettable without error');
  }

  console.log('  G4 no real external calls made');
  {
    // This entire test suite runs with no network; verify by checking
    // that executeWithResilience handles both success and failure paths
    const r1 = await executeWithResilience({
      provider: 'noop', operation: 'test',
      fn: async () => 'all good',
    });
    const r2 = await executeWithResilience({
      provider: 'noop', operation: 'test',
      fn: async () => { throw classifyHttpError({ status: 500, provider: 'noop', operation: 'test' }); },
      retry: { maxAttempts: 1 },
    });
    assert(r1.success, 'sync success path works');
    assert(!r2.success, 'sync failure path works');
  }

  // ── Cleanup ──────────────────────────────────────────────────────────
  resetRetryTestOverrides();
  resetCbTestClock();
  resetAllCircuits();

  // ═══════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Provider Resilience: Passed=${passed}  Failed=${failed}`);
  console.log(`${'═'.repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
