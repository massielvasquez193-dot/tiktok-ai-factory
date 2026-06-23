/**
 * Provider Error Classification — unified error types for all external providers.
 *
 * Every error from a provider SHOULD be wrapped in ProviderError before
 * being thrown or returned, so the retry / circuit-breaker layers can
 * make consistent decisions.
 */

// ── Error Code ───────────────────────────────────────────────────────────

export type ProviderErrorCode =
  | 'AUTHENTICATION'     // 401 — never retry
  | 'AUTHORIZATION'      // 403 — never retry
  | 'RATE_LIMIT'         // 429 — retry after Retry-After
  | 'TIMEOUT'            // request timeout — retryable
  | 'NETWORK'            // DNS / TCP / TLS / ECONNRESET / ETIMEDOUT — retryable
  | 'PROVIDER_5XX'       // 500, 502, 503, 504 — retryable
  | 'INVALID_REQUEST'    // 400 / 422 — never retry
  | 'NOT_FOUND'          // 404 — never retry
  | 'DISABLED'           // provider disabled — never retry
  | 'CONFIGURATION'      // missing key / bad config — never retry
  | 'MALFORMED_RESPONSE' // unparseable / unexpected shape — never retry
  | 'CIRCUIT_OPEN'       // circuit breaker tripped — retry later
  | 'UNKNOWN';           // catch-all — single retry

// ── ProviderError class ───────────────────────────────────────────────────

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly statusCode?: number;
  readonly provider: string;
  readonly operation: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly cause?: unknown;

  constructor(opts: {
    code: ProviderErrorCode;
    message: string;
    provider: string;
    operation: string;
    statusCode?: number;
    retryAfterMs?: number;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = 'ProviderError';
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.provider = opts.provider;
    this.operation = opts.operation;
    this.retryable = RETRYABLE_CODES.has(opts.code);
    this.retryAfterMs = opts.retryAfterMs;
    this.cause = opts.cause;
    Object.setPrototypeOf(this, ProviderError.prototype);
  }

  toSanitized(): string {
    // Never include the response body in logs — it may contain tokens, keys, or PII
    return `[${this.provider}] ${this.operation}: ${this.code} (status=${this.statusCode ?? '-'})`;
  }
}

// ── Retryable? ───────────────────────────────────────────────────────────

const RETRYABLE_CODES: ReadonlySet<ProviderErrorCode> = new Set([
  'TIMEOUT', 'NETWORK', 'PROVIDER_5XX', 'RATE_LIMIT',
]);

const NEVER_RETRY_CODES: ReadonlySet<ProviderErrorCode> = new Set([
  'AUTHENTICATION', 'AUTHORIZATION', 'INVALID_REQUEST', 'NOT_FOUND',
  'DISABLED', 'CONFIGURATION', 'MALFORMED_RESPONSE',
]);

export function isRetryable(code: ProviderErrorCode): boolean {
  return RETRYABLE_CODES.has(code);
}

export function isNeverRetry(code: ProviderErrorCode): boolean {
  return NEVER_RETRY_CODES.has(code);
}

// ── Classifier ───────────────────────────────────────────────────────────

/**
 * Classify a raw HTTP response into a ProviderError.
 */
export function classifyHttpError(opts: {
  status: number;
  body?: string;
  provider: string;
  operation: string;
  retryAfterMs?: number;
  cause?: unknown;
}): ProviderError {
  const { status, body, provider, operation, retryAfterMs, cause } = opts;

  if (status === 401) return new ProviderError({ code: 'AUTHENTICATION', message: body || 'Unauthorized', provider, operation, statusCode: status, cause });
  if (status === 403) return new ProviderError({ code: 'AUTHORIZATION', message: body || 'Forbidden', provider, operation, statusCode: status, cause });
  if (status === 429) return new ProviderError({ code: 'RATE_LIMIT', message: body || 'Rate limited', provider, operation, statusCode: status, retryAfterMs, cause });
  if (status === 400) return new ProviderError({ code: 'INVALID_REQUEST', message: body || 'Bad request', provider, operation, statusCode: status, cause });
  if (status === 422) return new ProviderError({ code: 'INVALID_REQUEST', message: body || 'Unprocessable', provider, operation, statusCode: status, cause });
  if (status === 404) return new ProviderError({ code: 'NOT_FOUND', message: body || 'Not found', provider, operation, statusCode: status, cause });
  if (status >= 500 && status < 600) return new ProviderError({ code: 'PROVIDER_5XX', message: body ? body.slice(0, 200) : `HTTP ${status}`, provider, operation, statusCode: status, cause });
  // Any other status (e.g. 301, 308) — don't retry
  return new ProviderError({ code: 'UNKNOWN', message: `Unexpected HTTP ${status}`, provider, operation, statusCode: status, cause });
}

/**
 * Classify a fetch/network error into a ProviderError.
 */
export function classifyNetworkError(opts: {
  error: Error & { code?: string; type?: string };
  provider: string;
  operation: string;
}): ProviderError {
  const { error, provider, operation } = opts;
  const name = error.name || '';
  const msg = error.message || '';

  if (error.name === 'AbortError' || msg.includes('aborted')) {
    return new ProviderError({ code: 'TIMEOUT', message: 'Request aborted (timeout)', provider, operation, cause: error });
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET') || msg.includes('ECONNREFUSED') ||
      msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN') || msg.includes('fetch failed')) {
    return new ProviderError({ code: 'NETWORK', message: msg.slice(0, 200), provider, operation, cause: error });
  }
  return new ProviderError({ code: 'NETWORK', message: msg.slice(0, 200), provider, operation, cause: error });
}

/**
 * Classify a malformed / unparseable response.
 */
export function classifyMalformed(opts: {
  message: string;
  provider: string;
  operation: string;
  cause?: unknown;
}): ProviderError {
  return new ProviderError({ code: 'MALFORMED_RESPONSE', message: opts.message.slice(0, 200), provider: opts.provider, operation: opts.operation, cause: opts.cause });
}

/**
 * Classify a disabled provider error.
 */
export function classifyDisabled(provider: string, operation: string): ProviderError {
  return new ProviderError({ code: 'DISABLED', message: `Provider ${provider} is disabled`, provider, operation });
}
