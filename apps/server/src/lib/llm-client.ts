/**
 * Unified LLM Client — single interface for DeepSeek, OpenAI, and compatible APIs.
 *
 * Phase 3A: infrastructure only. Real API calls are disabled by default.
 * Enable via LLM_MODE=real and set the corresponding API key.
 *
 * Usage:
 *   import { createLLMClient } from '../lib/llm-client';
 *   const llm = createLLMClient({ provider: 'deepseek' });
 *   const reply = await llm.chat([{ role: 'user', content: 'Hello' }]);
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type LLMProvider = 'deepseek' | 'openai' | 'anthropic';
export type LLMMode = 'real' | 'mock' | 'disabled';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMChatParams {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}

export interface LLMChatResult {
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
  finishReason: string;
}

export interface LLMClientConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  mode?: LLMMode;
  maxRetries?: number;
  timeoutMs?: number;
}

// ── Provider defaults ────────────────────────────────────────────────────────

const PROVIDER_DEFAULTS: Record<LLMProvider, { baseUrl: string; model: string; envKey: string }> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
  },
  openai: {
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-haiku-4-5-20251001',
    envKey: 'ANTHROPIC_API_KEY',
  },
};

// ── Resolve mode ─────────────────────────────────────────────────────────────

function resolveMode(provider: LLMProvider, explicit?: LLMMode): LLMMode {
  if (explicit) return explicit;
  const globalMode = process.env.LLM_MODE as LLMMode | undefined;
  if (globalMode) return globalMode;
  // Safe default: disabled — caller must opt in.
  return 'disabled';
}

function resolveApiKey(provider: LLMProvider, explicit?: string): string {
  if (explicit) return explicit;
  const def = PROVIDER_DEFAULTS[provider];
  return process.env[def.envKey] || '';
}

// ── LLMClient class ──────────────────────────────────────────────────────────

export class LLMClient {
  readonly provider: LLMProvider;
  readonly mode: LLMMode;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(config: LLMClientConfig) {
    this.provider = config.provider;
    this.mode = resolveMode(config.provider, config.mode);
    this.apiKey = resolveApiKey(config.provider, config.apiKey);
    this.baseUrl = config.baseUrl || PROVIDER_DEFAULTS[config.provider].baseUrl;
    this.model = config.model || PROVIDER_DEFAULTS[config.provider].model;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  /** Whether this client is capable of making real API calls. */
  get isReal(): boolean {
    return this.mode === 'real' && this.apiKey.length > 0;
  }

  /**
   * Send a chat completion request.
   * In mock/disabled mode returns a placeholder without calling any API.
   */
  async chat(params: LLMChatParams): Promise<LLMChatResult> {
    if (!this.isReal) {
      return this._mockChat(params);
    }
    return this._realChat(params);
  }

  /**
   * Attempt to parse JSON from an LLM response.
   * Handles markdown code fences and leading/trailing text.
   */
  async chatJSON<T = Record<string, unknown>>(params: LLMChatParams): Promise<T> {
    const result = await this.chat(params);
    return parseJSON<T>(result.content);
  }

  // ── Private: real API call ───────────────────────────────────────────────

  private async _realChat(params: LLMChatParams): Promise<LLMChatResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const r = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: params.messages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 2000,
            ...(params.responseFormat === 'json_object'
              ? { response_format: { type: 'json_object' } }
              : {}),
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!r.ok) {
          const body = await r.text().catch(() => '');
          throw new Error(`[${this.provider}] HTTP ${r.status}: ${body.slice(0, 200)}`);
        }

        const d: any = await r.json();
        const choice = d.choices?.[0];
        return {
          content: choice?.message?.content || '',
          usage: d.usage
            ? { promptTokens: d.usage.prompt_tokens, completionTokens: d.usage.completion_tokens, totalTokens: d.usage.total_tokens }
            : undefined,
          model: d.model || this.model,
          finishReason: choice?.finish_reason || 'stop',
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 10_000);
          await sleep(delay);
        }
      }
    }

    throw new Error(`[${this.provider}] All ${this.maxRetries + 1} attempts failed. Last: ${lastError?.message}`);
  }

  // ── Private: mock fallback ────────────────────────────────────────────────

  private _mockChat(params: LLMChatParams): LLMChatResult {
    const userMsg = params.messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
    return {
      content: JSON.stringify({
        _mock: true,
        mode: this.mode,
        provider: this.provider,
        echo: userMsg.slice(0, 80),
      }),
      model: `${this.model} (mock)`,
      finishReason: 'stop',
    };
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create an LLMClient with env-based defaults.
 *
 *   const llm = createLLMClient('deepseek');
 *   const llm  = createLLMClient('deepseek', { mode: 'real' });
 */
export function createLLMClient(provider: LLMProvider, overrides?: Partial<LLMClientConfig>): LLMClient {
  return new LLMClient({ provider, ...overrides });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse JSON from LLM output, stripping markdown fences. */
export function parseJSON<T = Record<string, unknown>>(text: string): T {
  let clean = text.trim();
  // Remove markdown code fences
  const fence = clean.match(/^```(?:json)?\s*\n?/);
  if (fence) {
    clean = clean.slice(fence[0].length);
    const end = clean.lastIndexOf('```');
    if (end >= 0) clean = clean.slice(0, end);
  }
  // Find outermost { or [
  const i1 = Math.min(
    clean.indexOf('{') >= 0 ? clean.indexOf('{') : Infinity,
    clean.indexOf('[') >= 0 ? clean.indexOf('[') : Infinity,
  );
  if (i1 === Infinity) throw new MalformedLLMOutputError('No JSON object/array found in LLM output', text);
  const closer = clean[i1] === '{' ? '}' : ']';
  const i2 = clean.lastIndexOf(closer);
  if (i2 <= i1) throw new MalformedLLMOutputError('Unterminated JSON in LLM output', text);
  const candidate = clean.substring(i1, i2 + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch (parseErr: any) {
    throw new MalformedLLMOutputError(
      `Invalid JSON: ${parseErr.message}`,
      text,
      candidate,
    );
  }
}

/**
 * Thrown when parseJSON cannot extract valid JSON from an LLM response.
 * Includes the original raw text and (when available) the extracted candidate
 * so callers can log or retry intelligently.
 */
export class MalformedLLMOutputError extends Error {
  readonly rawText: string;
  readonly candidate?: string;
  constructor(message: string, rawText: string, candidate?: string) {
    super(message);
    this.name = 'MalformedLLMOutputError';
    this.rawText = rawText;
    this.candidate = candidate;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
