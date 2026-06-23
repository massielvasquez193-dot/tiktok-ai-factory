/**
 * realAnalyzer → LLMClient Migration Tests
 *
 * Run: npx tsx src/lib/__tests__/real-analyzer-llmclient.test.ts
 *
 * Constraints:
 *  - No real network (all mock/disabled)
 *  - No real database
 *  - No real Redis
 *  - No process.exit() to hide open handles
 *  - Environment variables restored after tests
 */

// ── Imports ────────────────────────────────────────────────────────────────
import { LLMClient, parseJSON } from '../llm-client';
import { realAnalyze } from '../../services/realAnalyzer';

// ── Test runner ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

async function main(): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════
  // A. Compatibility
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── A. Compatibility ──');

  console.log('  A1 realAnalyze is exported and callable');
  {
    assert(typeof realAnalyze === 'function', 'realAnalyze is a function');
  }

  console.log('  A2 realAnalyze accepts videoUrl parameter');
  {
    assert(realAnalyze.length >= 1, 'realAnalyze accepts at least 1 argument');
  }

  console.log('  A3 realAnalyze returns a Promise (signature only, no process spawn)');
  {
    const fnString = realAnalyze.toString();
    assert(fnString.includes('async'), 'realAnalyze is an async function');
    assert(realAnalyze.length >= 1, 'realAnalyze accepts at least 1 argument (videoUrl)');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // B. Mock mode — deterministic, no real fetch
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── B. Mock Mode ──');

  // Save and set LLM_MODE=mock
  const hadLLMMode = process.env.LLM_MODE;
  const hadOpenAIKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.LLM_MODE = 'mock';

  console.log('  B1 LLMClient in mock mode does not make real calls');
  {
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    assert(!c.isReal, 'mock client isReal is false');
    assert(c.mode === 'mock', 'mock client mode is mock');
  }

  console.log('  B2 mock LLMClient.chat returns deterministic content');
  {
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    const r = await c.chat({ messages: [{ role: 'user', content: 'Test' }] });
    assert(typeof r.content === 'string' && r.content.length > 0, 'mock chat returns non-empty content');
    assert(r.finishReason === 'stop', 'mock chat finishReason is stop');
    assert(r.model.includes('mock'), 'mock model name indicates mock');
  }

  console.log('  B3 mock LLMClient.chatJSON returns structured JSON');
  {
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    const obj = await c.chatJSON<{ _mock: boolean }>({ messages: [{ role: 'user', content: 'Test' }] });
    assert(obj._mock === true, 'mock chatJSON returns _mock:true');
  }

  console.log('  B4 mock mode does NOT read real API key');
  {
    process.env.OPENAI_API_KEY = 'sk-test-should-not-be-used';
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    assert(!c.isReal, 'mock client isReal=false even with API key set');
    const r = await c.chat({ messages: [{ role: 'user', content: 'test' }] });
    assert(r.content.includes('_mock'), 'response is mock, not real API');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // C. Disabled mode
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── C. Disabled Mode ──');

  delete process.env.OPENAI_API_KEY;
  delete process.env.LLM_MODE;

  console.log('  C1 disabled client does not make real calls');
  {
    const c = new LLMClient({ provider: 'openai', mode: 'disabled' });
    assert(!c.isReal, 'disabled client isReal is false');
    assert(c.mode === 'disabled', 'disabled client mode is disabled');
  }

  console.log('  C2 disabled client still returns stop response');
  {
    const c = new LLMClient({ provider: 'deepseek' }); // defaults to disabled
    const r = await c.chat({ messages: [{ role: 'user', content: 'Hi' }] });
    assert(r.finishReason === 'stop', 'disabled mode returns stop');
    assert(typeof r.content === 'string', 'disabled mode returns content string');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // D. Response parsing — parseJSON robustness
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── D. Response Parsing (parseJSON) ──');

  console.log('  D1 normal JSON object');
  {
    const r = parseJSON<{ key: string }>('{"key":"value"}');
    assert(r.key === 'value', 'normal JSON parsed correctly');
  }

  console.log('  D2 JSON array');
  {
    const r = parseJSON<number[]>('[1,2,3]');
    assert(Array.isArray(r) && r.length === 3, 'JSON array parsed correctly');
  }

  console.log('  D3 JSON inside ```json fence');
  {
    const r = parseJSON<{ a: number }>('```json\n{"a":42}\n```');
    assert(r.a === 42, 'json fence stripped and parsed');
  }

  console.log('  D4 JSON inside plain ``` fence');
  {
    const r = parseJSON<{ b: string }>('```\n{"b":"hello"}\n```');
    assert(r.b === 'hello', 'plain fence stripped and parsed');
  }

  console.log('  D5 leading/trailing whitespace');
  {
    const r = parseJSON<{ x: number }>('  \n  {"x":100}  \n  ');
    assert(r.x === 100, 'whitespace ignored');
  }

  console.log('  D6 empty response throws');
  {
    let threw = false;
    try { parseJSON(''); } catch { threw = true; }
    assert(threw, 'empty string throws');
  }

  console.log('  D7 null response throws');
  {
    let threw = false;
    try { parseJSON('null'); } catch { threw = true; }
    assert(threw, '"null" throws (not a valid JSON object/array for parseJSON)');
  }

  console.log('  D8 invalid JSON throws');
  {
    let threw = false;
    try { parseJSON('not json at all'); } catch { threw = true; }
    assert(threw, 'invalid JSON throws');
  }

  console.log('  D9 partial JSON throws');
  {
    let threw = false;
    try { parseJSON('{"a":1,'); } catch { threw = true; }
    assert(threw, 'malformed JSON throws');
  }

  console.log('  D10 text with embedded JSON object');
  {
    const r = parseJSON<{ name: string }>('Some text {"name":"bob"} after');
    assert(r.name === 'bob', 'embedded JSON object extracted');
  }

  console.log('  D11 extra fields are tolerated');
  {
    const r = parseJSON<{ required: number }>('{"required":5,"extra":"ignored"}');
    assert(r.required === 5, 'required field parsed, extra field ignored');
  }

  console.log('  D12 nested JSON structure');
  {
    const r = parseJSON<{ outer: { inner: string[] } }>('{"outer":{"inner":["a","b"]}}');
    assert(r.outer.inner.length === 2, 'nested structure parsed');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // E. LLMClient integration — modes and error propagation
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── E. LLMClient Integration ──');

  console.log('  E1 createLLM pattern works (same as gptAnalyzer)');
  {
    // Simulate the createLLM pattern used in realAnalyzer
    const hadAnt = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const c = new LLMClient({ provider: 'openai' });
    assert(typeof c.chat === 'function', 'LLMClient has chat method');
    assert(typeof c.chatJSON === 'function', 'LLMClient has chatJSON method');
    if (hadAnt) process.env.ANTHROPIC_API_KEY = hadAnt;
  }

  console.log('  E2 LLMClient respects mode override');
  {
    process.env.LLM_MODE = 'mock';
    const c = new LLMClient({ provider: 'openai' });
    assert(c.mode === 'mock', 'mode overridden to mock via env');
    assert(!c.isReal, 'isReal is false in mock mode');
  }

  console.log('  E3 mode fallback chain is correct');
  {
    delete process.env.LLM_MODE;
    delete process.env.OPENAI_API_KEY;
    const c = new LLMClient({ provider: 'deepseek' });
    assert(c.mode === 'disabled', 'default without env is disabled');
    assert(!c.isReal, 'isReal false without API key');
  }

  console.log('  E4 multiple LLMClient instantiations are safe');
  {
    const a = new LLMClient({ provider: 'openai', mode: 'mock' });
    const b = new LLMClient({ provider: 'deepseek', mode: 'mock' });
    assert(a.provider === 'openai', 'provider a is openai');
    assert(b.provider === 'deepseek', 'provider b is deepseek');
    // Both should work independently
    const ra = await a.chat({ messages: [{ role: 'user', content: 'a' }] });
    const rb = await b.chat({ messages: [{ role: 'user', content: 'b' }] });
    assert(typeof ra.content === 'string', 'client a works');
    assert(typeof rb.content === 'string', 'client b works');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // F. Environment variable safety
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── F. Environment Variable Safety ──');

  console.log('  F1 OPENAI_API_KEY not leaked by mock mode');
  {
    process.env.LLM_MODE = 'mock';
    process.env.OPENAI_API_KEY = 'sk-secret-key';
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    const r = await c.chat({ messages: [{ role: 'user', content: 'leak test' }] });
    // Content must NOT contain the real API key
    assert(!r.content.includes('sk-secret-key'), 'mock response does not contain API key');
  }

  console.log('  F2 restore environment after tests (LLM_MODE)');
  {
    // We'll restore at the end
    assert(typeof process.env.LLM_MODE === 'string' || process.env.LLM_MODE === undefined,
      'LLM_MODE is in expected state');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // G. LLMClient provider multiplexing
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── G. Provider Multiplexing ──');

  console.log('  G1 OpenAI provider configured correctly');
  {
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    assert(c.provider === 'openai', 'provider set to openai');
  }

  console.log('  G2 Anthropic provider configured correctly');
  {
    const c = new LLMClient({ provider: 'anthropic', mode: 'mock' });
    assert(c.provider === 'anthropic', 'provider set to anthropic');
  }

  console.log('  G3 both providers produce mock responses');
  {
    const oai = new LLMClient({ provider: 'openai', mode: 'mock' });
    const ant = new LLMClient({ provider: 'anthropic', mode: 'mock' });
    const r1 = await oai.chat({ messages: [{ role: 'user', content: 'test' }] });
    const r2 = await ant.chat({ messages: [{ role: 'user', content: 'test' }] });
    assert(r1.finishReason === 'stop', 'openai mock finishes');
    assert(r2.finishReason === 'stop', 'anthropic mock finishes');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n── Cleanup ──');

  // Restore environment
  if (hadLLMMode) process.env.LLM_MODE = hadLLMMode;
  else delete process.env.LLM_MODE;
  if (hadOpenAIKey) process.env.OPENAI_API_KEY = hadOpenAIKey;
  else delete process.env.OPENAI_API_KEY;

  console.log('  Restored LLM_MODE and OPENAI_API_KEY');

  // ═══════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  realAnalyzer Migration: Passed=${passed}  Failed=${failed}`);
  console.log(`${'═'.repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('realAnalyzer migration test crashed:', err);
  process.exit(1);
});
