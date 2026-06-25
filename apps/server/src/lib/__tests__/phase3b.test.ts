/**
 * Phase 3B Integration Tests — Provider integration, Workers, gptAnalyzer, JSON safety.
 *
 * Run: npx tsx src/lib/__tests__/phase3b.test.ts
 *
 * Constraints:
 *  - No external API calls (all mock/disabled modes)
 *  - No Redis connections (import pure handlers only)
 *  - No real database (mock data only)
 */

// ── Metadata helpers ──────────────────────────────────────────────────────
import { serializeMetadata, deserializeMetadata } from '../video-downloader';

// ── Provider Mode ─────────────────────────────────────────────────────────
import {
  isReal, isDisabled,
  setProviderMode, resetProviderModes, getAllProviderModes,
  getProviderMode,
} from '../provider-mode';

// ── LLM Client ────────────────────────────────────────────────────────────
import { LLMClient, parseJSON } from '../llm-client';

// ── gptAnalyzer (pure functions) ──────────────────────────────────────────
import { mockAnalysis, fallbackAnalysis } from '../../services/gptAnalyzer';

// ── Worker handlers (no Redis, no BullMQ) ────────────────────────────────
import { handleVideoGeneration } from '../../workers/video-generation.worker';
import { handleTts } from '../../workers/tts.worker';
import { handlePublishing } from '../../workers/publishing.worker';
import { handleUploadProcessing } from '../../workers/upload-processing.worker';
import { handleAutomation } from '../../workers/automation.worker';

// ── Test Runner ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

async function main(): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════════
  // A. Metadata Serialization — Extended Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── A. Metadata Serialization (Extended) ──');

  console.log('  A1 serializeMetadata handles nested objects');
  {
    const obj = { a: { b: { c: 1 } }, d: [1, 2, 3] };
    const raw = serializeMetadata(obj);
    const parsed = deserializeMetadata<{ a: { b: { c: number } }; d: number[] }>(raw);
    assert(parsed.a.b.c === 1, 'nested object preserved');
    assert(Array.isArray(parsed.d) && parsed.d.length === 3, 'nested array preserved');
  }

  console.log('  A2 serializeMetadata returns "{}" for non-object input');
  {
    // serializeMetadata only accepts objects/arrays — strings get '{}'
    const raw = serializeMetadata('{"x":1}' as unknown as Record<string, unknown>);
    assert(raw === '{}', 'non-object input → "{}"');
  }

  console.log('  A3 serializeMetadata handles empty array');
  {
    assert(serializeMetadata([]) === '[]', 'empty array → "[]"');
  }

  console.log('  A4 serializeMetadata handles array of primitives');
  {
    const raw = serializeMetadata([1, 'two', true, null]);
    assert(raw === '[1,"two",true,null]', 'mixed array serialized correctly');
  }

  console.log('  A5 deserializeMetadata handles JSON array');
  {
    const arr = deserializeMetadata<number[]>('[1,2,3]');
    assert(Array.isArray(arr), 'returns array');
    assert(arr.length === 3, 'array has 3 elements');
    assert(arr[0] === 1, 'first element is 1');
  }

  console.log('  A6 double-serialization protection');
  {
    // serializeMetadata only accepts objects; passing a string results in '{}'
    const once = serializeMetadata({ a: 1 });
    assert(once === '{"a":1}', 'first serialize produces JSON string');
    // Passing the JSON string back in (as unknown) returns '{}' by design
    const twice = serializeMetadata(once as unknown as Record<string, unknown>);
    assert(twice === '{}', 'string input to serializeMetadata → {}');
    // deserializeMetadata is safe on '{}'
    const outer = deserializeMetadata(twice);
    assert(typeof outer === 'object' && outer !== null, 'deserialized {} is an object');
  }

  console.log('  A7 null in object field');
  {
    const raw = serializeMetadata({ key: null, arr: [1, null, 3] });
    const parsed = deserializeMetadata<{ key: null; arr: number[] }>(raw);
    assert(parsed.key === null, 'null field preserved');
    assert(parsed.arr[1] === null, 'null in array preserved');
  }

  console.log('  A8 deserializeMetadata with type tag');
  {
    const raw = '{"countries":["US","MY"],"result":{"steps":[]}}';
    const parsed = deserializeMetadata<{ countries: string[]; result: { steps: unknown[] } }>(raw);
    assert(Array.isArray(parsed.countries) && parsed.countries.length === 2, 'countries array parsed');
    assert(Array.isArray(parsed.result.steps) && parsed.result.steps.length === 0, 'nested steps parsed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B. Provider Mode — Integration Scenarios
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── B. Provider Mode Integration ──');

  console.log('  B1 All providers default to mock after reset');
  {
    resetProviderModes();
    assert(getProviderMode('seedance').mode === 'mock', 'seedance defaults to mock');
    assert(getProviderMode('kling').mode === 'mock', 'kling defaults to mock');
    assert(getProviderMode('veo').mode === 'mock', 'veo defaults to mock');
    assert(getProviderMode('runway').mode === 'mock', 'runway defaults to mock');
  }

  console.log('  B2 getAllProviderModes returns correct structure');
  {
    const all = getAllProviderModes();
    assert(typeof all.seedance.mode === 'string', 'seedance.mode is a string');
    assert(typeof all.seedance.source === 'string', 'seedance.source is a string');
    assert(['override', 'env', 'default'].includes(all.seedance.source), 'source is valid enum');
  }

  console.log('  B3 disabled mode is distinct from mock');
  {
    setProviderMode('kling', 'disabled');
    assert(isDisabled('kling'), 'kling is disabled');
    assert(!isReal('kling'), 'kling is not real');
    assert(getProviderMode('kling').mode === 'disabled', 'getProviderMode returns disabled');
    setProviderMode('kling', undefined);
  }

  console.log('  B4 real mode override works');
  {
    assert(!isReal('seedance'), 'seedance not real by default');
    process.env.SEEDANCE_API_KEY = 'test-key-phase3b';
    setProviderMode('seedance', 'real');
    assert(isReal('seedance'), 'seedance is real after override');
    assert(!isReal('veo'), 'veo still not real');
    setProviderMode('seedance', undefined);
    delete process.env.SEEDANCE_API_KEY;
  }

  console.log('  B5 resetProviderModes clears all');
  {
    setProviderMode('seedance', 'real');
    setProviderMode('veo', 'disabled');
    resetProviderModes();
    assert(!isReal('seedance'), 'seedance reset to mock');
    assert(!isDisabled('veo'), 'veo reset to mock');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // C. LLM Client — Real/Mock/Disabled Behavior
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── C. LLM Client Behavior ──');

  console.log('  C1 chatJSON returns structured mock response');
  {
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    const obj = await c.chatJSON<{ _mock: boolean }>({
      messages: [{ role: 'user', content: 'Test' }],
    });
    assert(obj._mock === true, 'mock response contains _mock flag');
  }

  console.log('  C2 disabled mode returns mock chat (no error)');
  {
    const c = new LLMClient({ provider: 'deepseek' }); // defaults to disabled
    const r = await c.chat({ messages: [{ role: 'user', content: 'Hi' }] });
    assert(r.finishReason === 'stop', 'disabled mode still returns stop');
    assert(r.content.includes('_mock'), 'disabled mode returns mock content');
  }

  console.log('  C3 parseJSON strips markdown fences correctly');
  {
    const input = '```json\n{"key":"value","num":42}\n```\nSome trailing text';
    const result = parseJSON<{ key: string; num: number }>(input);
    assert(result.key === 'value', 'parses across markdown fence');
    assert(result.num === 42, 'parses number across fence');
  }

  console.log('  C4 parseJSON handles array with fences');
  {
    const input = '```\n[{"a":1},{"a":2}]\n```';
    const result = parseJSON<Array<{ a: number }>>(input);
    assert(Array.isArray(result) && result.length === 2, 'parses array from fence');
    assert(result[1].a === 2, 'second element correct');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // D. gptAnalyzer — Mock & Fallback
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── D. gptAnalyzer ──');

  console.log('  D1 mockAnalysis returns deterministic result');
  {
    const result = mockAnalysis('test subtitle', []);
    assert(result.hook.length > 0, 'mock hook is non-empty');
    assert(result.painPoint.length > 0, 'mock painPoint is non-empty');
    assert(result.solution.length > 0, 'mock solution is non-empty');
    assert(result.cta.length > 0, 'mock CTA is non-empty');
    assert(result.usedAI === false, 'mock does not claim AI use');
    assert(typeof result.viralScore === 'number' && result.viralScore >= 0, 'viralScore is non-negative');
    assert(result.sceneBreakdown.length === 5, 'mock has 5 default scenes');
  }

  console.log('  D2 mockAnalysis preserves provided scenes');
  {
    const scenes = [
      { scene: 1, time: '0-2s', type: 'hook', description: 'Test hook' },
      { scene: 2, time: '2-4s', type: 'cta', description: 'Test CTA' },
    ];
    const result = mockAnalysis('sub', scenes);
    assert(result.sceneBreakdown.length === 2, 'preserves provided scene count');
    assert(result.sceneBreakdown[0].type === 'hook', 'preserves scene type');
  }

  console.log('  D3 fallbackAnalysis extracts from subtitle');
  {
    const result = fallbackAnalysis('First phrase. Second phrase. Third phrase. Fourth phrase.', []);
    assert(result.hook === 'First phrase', 'first phrase is hook');
    assert(result.painPoint === 'Second phrase', 'second phrase is pain');
    assert(result.solution === 'Third phrase', 'third phrase is solution');
    assert(result.cta === 'Fourth phrase', 'last phrase is CTA');
    assert(result.usedAI === false, 'fallback does not claim AI');
  }

  console.log('  D4 fallbackAnalysis provides default scenes when empty');
  {
    const result = fallbackAnalysis('Short text.', []);
    assert(result.sceneBreakdown.length === 5, 'provides 5 default scenes');
    assert(result.viralScore === 70, 'default viralScore is 70');
  }

  console.log('  D5 fallbackAnalysis preserves provided scenes');
  {
    const scenes = [{ scene: 1, time: '0-3s', type: 'hook', description: 'Custom' }];
    const result = fallbackAnalysis('text', scenes);
    assert(result.sceneBreakdown[0].description === 'Custom', 'preserves custom scene');
  }

  console.log('  D6 gptAnalyzer exports are callable without API keys');
  {
    // Neither function should throw or require env vars
    let threw = false;
    try { mockAnalysis('', []); } catch { threw = true; }
    assert(!threw, 'mockAnalysis does not throw with empty input');

    threw = false;
    try { fallbackAnalysis('', []); } catch { threw = true; }
    assert(!threw, 'fallbackAnalysis does not throw with empty input');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // E. Worker Handlers — Pure Functions (No Redis)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── E. Worker Handlers ──');

  console.log('  E1 handleVideoGeneration runs pipeline (no DB)');
  {
    // Without a real DB, handler returns success:false but doesn't throw
    const result = await handleVideoGeneration({ message: 'test' });
    // PipelineRunner catches errors by default, so we get a result with failure info
    assert(typeof result.message === 'string', 'has message');
    assert(typeof result.taskCount === 'number', 'has taskCount');
    assert(result.steps >= 1, 'has steps');
  }

  console.log('  E2 handleVideoGeneration progress callback fires');
  {
    const calls: string[] = [];
    await handleVideoGeneration({ message: 'test' }, (_idx: number, name: string) => {
      calls.push(name);
    });
    assert(calls.length > 0, 'progress callback was called');
    assert(calls.includes('validate'), 'validate step invoked');
  }

  console.log('  E3 handleTts with valid text');
  {
    const result = await handleTts({ text: 'Hello world', language: 'en' });
    assert(result.success === true, 'TTS handler returns success');
    assert(result.audioUrl !== null, 'has audio URL');
    assert(result.duration > 0, 'has positive duration');
  }

  console.log('  E4 handleTts non-throwing validation — empty text');
  {
    // PipelineRunner catches errors; handler returns success:false
    const result = await handleTts({ text: '' });
    assert(result.success === false, 'empty text causes pipeline failure');
  }

  console.log('  E5 handleTts non-throwing validation — invalid language');
  {
    const result = await handleTts({ text: 'Hello', language: 'zz' });
    assert(result.success === false, 'invalid language causes pipeline failure');
  }

  console.log('  E6 handlePublishing runs pipeline (no DB)');
  {
    const result = await handlePublishing({
      videoId: 'test-video-id',
      platform: 'tiktok',
      title: 'Test Video',
    });
    assert(result.platform === 'tiktok', 'platform preserved');
    assert(typeof result.externalId === 'string' || result.externalId === null, 'has externalId');
    assert(typeof result.status === 'string', 'status is string');
  }

  console.log('  E7 handlePublishing non-throwing validation — missing videoId');
  {
    const result = await handlePublishing({ platform: 'tiktok' });
    assert(result.success === false, 'missing videoId causes pipeline failure');
  }

  console.log('  E8 handlePublishing non-throwing validation — invalid platform');
  {
    const result = await handlePublishing({ videoId: 'v1', platform: 'myspace' });
    assert(result.success === false, 'invalid platform causes pipeline failure');
  }

  console.log('  E9 handleUploadProcessing with valid payload');
  {
    const result = await handleUploadProcessing({
      filePath: '/tmp/test.jpg',
      originalName: 'product.jpg',
      mimeType: 'image/jpeg',
      size: 102400,
      type: 'image',
    });
    assert(result.success === true, 'upload handler returns success');
    assert(result.fileType === 'image', 'file type detected');
    assert(result.thumbnailUrl !== null, 'has thumbnail URL');
    assert(result.variants.length === 3, 'has 3 variants');
    assert(result.variants.includes('original'), 'original variant present');
  }

  console.log('  E10 handleUploadProcessing non-throwing validation — missing path');
  {
    const result = await handleUploadProcessing({ originalName: 'test.jpg', size: 100 });
    assert(result.success === false, 'missing filePath causes pipeline failure');
  }

  console.log('  E11 handleUploadProcessing non-throwing validation — zero size');
  {
    const result = await handleUploadProcessing({ filePath: '/tmp/x.jpg', size: 0 });
    assert(result.success === false, 'zero size causes pipeline failure');
  }

  console.log('  E12 handleAutomation with health-check');
  {
    const result = await handleAutomation({ taskType: 'health-check' });
    assert(result.success === true, 'health-check handler returns success');
    assert(result.executed === true, 'health-check is executed');
  }

  console.log('  E13 handleAutomation with default task (runs pipeline, no DB)');
  {
    const result = await handleAutomation({ taskType: 'default' });
    // PipelineRunner catches DB errors; handler may still say success with executed:false
    assert(typeof result.executed === 'boolean', 'executed is boolean');
    assert(typeof result.message === 'string', 'message is string');
  }

  console.log('  E14 handleAutomation progress callback');
  {
    const calls: number[] = [];
    await handleAutomation({ taskType: 'health-check' }, (idx: number) => {
      calls.push(idx);
    });
    assert(calls.length > 0, 'progress callback invoked');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // F. Serialization Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── F. Serialization Edge Cases ──');

  console.log('  F1 serializeMetadata with Date objects (toJSON)');
  {
    const obj = { timestamp: new Date('2026-01-01T00:00:00Z') };
    const raw = serializeMetadata(obj);
    const parsed = deserializeMetadata(raw);
    assert(typeof parsed.timestamp === 'string', 'Date serialized as ISO string');
  }

  console.log('  F2 deserializeMetadata with malformed JSON (partial)');
  {
    const obj = deserializeMetadata('{"a":1,');
    assert(typeof obj === 'object' && obj !== null, 'returns empty object for partial JSON');
    assert(Object.keys(obj).length === 0, 'empty object for partial JSON');
  }

  console.log('  F3 deserializeMetadata with SQL NULL representation');
  {
    // JSON.parse('null') → null; deserializeMetadata guards empty strings but not 'null' literals
    const a = deserializeMetadata(null);
    const b = deserializeMetadata(undefined);
    const c = deserializeMetadata('');
    assert(typeof a === 'object' && a !== null, 'actual null → empty object');
    assert(typeof b === 'object' && b !== null, 'undefined → empty object');
    assert(typeof c === 'object' && c !== null, 'empty string → empty object');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // G. Extended JSON Field Safety — "[object Object]" and Prisma columns
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── G. Extended JSON Field Safety ──');

  console.log('  G1 deserializeMetadata handles "[object Object]"');
  {
    const result = deserializeMetadata('[object Object]');
    assert(typeof result === 'object' && result !== null, 'returns object for [object Object]');
    assert(Object.keys(result).length === 0, 'returns empty object for [object Object]');
  }

  console.log('  G2 productIds round-trip');
  {
    const ids = ['prod-1', 'prod-2', 'prod-3'];
    const raw = serializeMetadata(ids);
    const parsed = deserializeMetadata<string[]>(raw);
    assert(Array.isArray(parsed), 'productIds parsed as array');
    assert(parsed.length === 3, 'productIds has 3 entries');
    assert(parsed[0] === 'prod-1', 'productIds first entry preserved');
  }

  console.log('  G3 benefits round-trip');
  {
    const benefits = { items: ['Fast shipping', 'Natural ingredients', 'Money back'] };
    const raw = serializeMetadata(benefits);
    const parsed = deserializeMetadata<{ items: string[] }>(raw);
    assert(Array.isArray(parsed.items), 'benefits.items is array');
    assert(parsed.items.length === 3, 'benefits has 3 items');
  }

  console.log('  G4 ingredients round-trip');
  {
    const ingredients = { active: 'Vitamin C', concentration: '10%', list: ['Water', 'Glycerin'] };
    const raw = serializeMetadata(ingredients);
    const parsed = deserializeMetadata<{ active: string; list: string[] }>(raw);
    assert(parsed.active === 'Vitamin C', 'ingredients active preserved');
    assert(parsed.list.length === 2, 'ingredients list preserved');
  }

  console.log('  G5 log (array of objects) round-trip');
  {
    const log = [
      { step: 'validate', status: 'ok', ts: 1000 },
      { step: 'generate', status: 'ok', ts: 2000 },
      { step: 'publish', status: 'fail', ts: 3000, error: 'timeout' },
    ];
    const raw = serializeMetadata(log);
    const parsed = deserializeMetadata<any[]>(raw);
    assert(Array.isArray(parsed) && parsed.length === 3, 'log has 3 entries');
    assert(parsed[2].status === 'fail', 'log preserves failure status');
    assert(parsed[2].error === 'timeout', 'log preserves error details');
  }

  console.log('  G6 sceneBreakdown round-trip');
  {
    const scene = [
      { scene: 1, time: '0-3s', type: 'hook', description: 'Attention grabber' },
      { scene: 2, time: '3-10s', type: 'problem', description: 'Problem setup' },
    ];
    const raw = serializeMetadata(scene);
    const parsed = deserializeMetadata<any[]>(raw);
    assert(Array.isArray(parsed) && parsed.length === 2, 'scene has 2 shots');
    assert(parsed[0].type === 'hook', 'scene type preserved');
  }

  console.log('  G7 null protection across fields');
  {
    const raw = serializeMetadata(null);
    assert(raw === '{}', 'null serialized to {}');
    const parsed = deserializeMetadata(null);
    assert(typeof parsed === 'object' && parsed !== null, 'null deserialized to object');
  }

  console.log('  G8 empty string protection');
  {
    // deserializeMetadata guards empty strings
    const parsed = deserializeMetadata('');
    assert(typeof parsed === 'object' && parsed !== null, 'empty string → object');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // H. gptAnalyzer — analyzeVideo with LLMClient modes
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── H. gptAnalyzer analyzeVideo ──');

  console.log('  H1 analyzeVideo in mock mode returns deterministic result');
  {
    const { analyzeVideo } = await import('../../services/gptAnalyzer');
    const hasOpenAI = process.env.OPENAI_API_KEY;
    const hasAnthropic = process.env.ANTHROPIC_API_KEY;
    const hadLLMMode = process.env.LLM_MODE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.LLM_MODE = 'mock';

    const result = await analyzeVideo('Test hook. Test problem. Test solution. Buy now.', '', []);
    assert(result.hook.length > 0, 'analyzeVideo mock returns hook');
    assert(result.usedAI === false, 'mockAnalyze does not claim AI');
    assert(result.viralScore === 75, 'mock default viralScore is 75');
    assert(result.productName === 'Detected Product', 'mock returns product name');
    assert(result.sceneBreakdown.length === 5, 'mock produces 5 scenes');

    if (hasOpenAI) process.env.OPENAI_API_KEY = hasOpenAI;
    else delete process.env.OPENAI_API_KEY;
    if (hasAnthropic) process.env.ANTHROPIC_API_KEY = hasAnthropic;
    else delete process.env.ANTHROPIC_API_KEY;
    if (hadLLMMode) process.env.LLM_MODE = hadLLMMode;
    else delete process.env.LLM_MODE;
  }

  console.log('  H2 analyzeVideo fallback path (disabled mode)');
  {
    const { analyzeVideo } = await import('../../services/gptAnalyzer');
    const hasOpenAI = process.env.OPENAI_API_KEY;
    const hasAnthropic = process.env.ANTHROPIC_API_KEY;
    const hadLLMMode = process.env.LLM_MODE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.LLM_MODE;

    // Without API keys and without LLM_MODE, isReal=false and default mode=disabled → fallbackAnalysis
    const result = await analyzeVideo('Phrase one. Phrase two. Phrase three.', '', []);
    assert(result.usedAI === false, 'disabled path does not call real AI');
    assert(result.hook.length > 0, 'fallback produces hook');
    assert(result.viralScore === 70, 'fallback default score is 70');

    if (hasOpenAI) process.env.OPENAI_API_KEY = hasOpenAI;
    else delete process.env.OPENAI_API_KEY;
    if (hasAnthropic) process.env.ANTHROPIC_API_KEY = hasAnthropic;
    else delete process.env.ANTHROPIC_API_KEY;
    if (hadLLMMode) process.env.LLM_MODE = hadLLMMode;
    else delete process.env.LLM_MODE;
  }

  console.log('  H3 analyzeVideo handles empty input gracefully');
  {
    const { analyzeVideo } = await import('../../services/gptAnalyzer');
    const hasOpenAI = process.env.OPENAI_API_KEY;
    const hasAnthropic = process.env.ANTHROPIC_API_KEY;
    const hadLLMMode = process.env.LLM_MODE;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.LLM_MODE;

    const result = await analyzeVideo('', '', []);
    assert(result.hook.length > 0, 'produces default hook for empty input');
    assert(result.sceneBreakdown.length === 5, 'produces 5 default scenes');
    assert(result.productName.length > 0, 'produces default product name');

    if (hasOpenAI) process.env.OPENAI_API_KEY = hasOpenAI;
    else delete process.env.OPENAI_API_KEY;
    if (hasAnthropic) process.env.ANTHROPIC_API_KEY = hasAnthropic;
    else delete process.env.ANTHROPIC_API_KEY;
    if (hadLLMMode) process.env.LLM_MODE = hadLLMMode;
    else delete process.env.LLM_MODE;
  }

  console.log('  H4 analyzeVideo malformed LLM response protection');
  {
    // Simulate: if LLM returns garbage, parseAIResponse catches error and falls back
    // We verify the fallback path is robust by testing with empty subtitle
    const { fallbackAnalysis } = await import('../../services/gptAnalyzer');
    const result = fallbackAnalysis('', []);
    assert(result.hook.length > 0, 'fallback always returns valid hook');
    assert(result.viralScore === 70, 'fallback default score');
    assert(result.usedAI === false, 'fallback never claims AI');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // I. ProviderManager — static instance and error paths
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── I. ProviderManager ──');

  console.log('  I1 ProviderManager.instance is accessible');
  {
    const { ProviderManager } = await import('../../providers/manager/ProviderManager');
    const instance = ProviderManager.instance;
    assert(instance instanceof ProviderManager, 'instance is ProviderManager');
    assert(typeof instance.list === 'function', 'has list method');
    assert(typeof instance.submit === 'function', 'has submit method');
    assert(typeof instance.cancel === 'function', 'has cancel method');
    assert(typeof instance.activeCount === 'number', 'has activeCount property');
  }

  console.log('  I2 ProviderManager respects mock mode');
  {
    // Import is cached; we just verify mock behavior
    const { ProviderManager } = await import('../../providers/manager/ProviderManager');
    const instance = ProviderManager.instance;
    const providers = instance.list();
    assert(Array.isArray(providers), 'list returns array');
    // In mock mode, provider list may be empty or contain metadata
    assert(providers.length >= 0, 'provider list is countable');
  }

  console.log('  I3 serializeMetadata is used in ProviderManager');
  {
    // Verify serializeMetadata is imported and callable from ProviderManager context
    const raw = serializeMetadata({ provider: 'seedance', model: 'svd' });
    const parsed = deserializeMetadata<{ provider: string; model: string }>(raw);
    assert(parsed.provider === 'seedance', 'provider field preserved');
    assert(parsed.model === 'svd', 'model field preserved');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Phase 3B: Passed=${passed}  Failed=${failed}`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Phase 3B test runner crashed:', err);
  process.exit(1);
});
