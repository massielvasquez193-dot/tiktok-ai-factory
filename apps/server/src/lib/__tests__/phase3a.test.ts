/**
 * Phase 3A Integration Tests — Infrastructure modules + metadata fix.
 *
 * Run: npx tsx apps/server/src/lib/__tests__/phase3a.test.ts
 */
import { LLMClient, parseJSON } from '../llm-client';
import {
  isReal, isDisabled,
  setProviderMode, resetProviderModes, getAllProviderModes,
  getProviderMode,
} from '../provider-mode';
import { PipelineRunner, defineStep } from '../pipeline-runner';
import { downloadVideo, isVideoUrl, serializeMetadata, deserializeMetadata } from '../video-downloader';
import * as fs from 'fs';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

async function main(): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. LLM Client
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── LLM Client ──');

  console.log('  1.1 Default mode is disabled');
  {
    const c = new LLMClient({ provider: 'deepseek' });
    assert(c.mode === 'disabled', 'deepseek defaults to disabled');
    assert(!c.isReal, 'isReal returns false');
  }

  console.log('  1.2 Explicit mock mode');
  {
    const c = new LLMClient({ provider: 'deepseek', mode: 'mock' });
    assert(c.mode === 'mock', 'mode is mock');
    assert(!c.isReal, 'isReal returns false');
  }

  console.log('  1.3 Mock chat returns placeholder');
  {
    const c = new LLMClient({ provider: 'deepseek', mode: 'mock' });
    const r = await c.chat({ messages: [{ role: 'user', content: 'Hello' }] });
    assert(r.content.includes('_mock'), 'mock response contains _mock flag');
    assert(r.model.includes('mock'), 'model name indicates mock');
  }

  console.log('  1.4 Mock chatJSON parses JSON');
  {
    const c = new LLMClient({ provider: 'openai', mode: 'mock' });
    const obj = await c.chatJSON<{ _mock: boolean }>({
      messages: [{ role: 'user', content: 'Return JSON' }],
    });
    assert(obj._mock === true, 'chatJSON returns parsed mock object');
  }

  console.log('  1.5 parseJSON handles markdown fence');
  {
    const raw = '```json\n{"key": "value"}\n```';
    const obj = parseJSON<{ key: string }>(raw);
    assert(obj.key === 'value', 'extracts JSON from markdown fence');
  }

  console.log('  1.6 parseJSON handles inline JSON');
  {
    const raw = 'Some text {"a": 1} more text';
    const obj = parseJSON<{ a: number }>(raw);
    assert(obj.a === 1, 'extracts inline JSON');
  }

  console.log('  1.7 parseJSON handles array');
  {
    const raw = '[1, 2, 3]';
    const arr = parseJSON<number[]>(raw);
    assert(Array.isArray(arr) && arr.length === 3, 'extracts JSON array');
  }

  console.log('  1.8 parseJSON throws on invalid input');
  {
    let threw = false;
    try { parseJSON('no json here'); } catch { threw = true; }
    assert(threw, 'throws on non-JSON input');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Provider Mode
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── Provider Mode ──');

  console.log('  2.1 All defaults (video=mock, LLM=disabled)');
  {
    resetProviderModes();
    const all = getAllProviderModes();
    // Video providers default to mock
    const videoOk = ['seedance','kling','veo','runway'].every(n => (all as any)[n]?.mode === 'mock');
    assert(videoOk, 'video providers default to mock');
    // LLM providers default to disabled
    const llmOk = ['deepseek','openai','anthropic'].every(n => (all as any)[n]?.mode === 'disabled');
    assert(llmOk, 'LLM providers default to disabled');
    // TTS defaults to mock
    assert(all.tts?.mode === 'mock', 'tts defaults to mock');
  }

  console.log('  2.2 isReal/isDisabled helpers');
  {
    assert(!isReal('seedance'), 'seedance isReal=false by default');
    assert(!isDisabled('seedance'), 'seedance isDisabled=false (mock, not disabled)');
  }

  console.log('  2.3 In-memory override works');
  {
    process.env.KLING_API_KEY = 'test-key-phase3a';
    setProviderMode('kling', 'real');
    assert(isReal('kling'), 'kling isReal=true after override');
    assert(getProviderMode('kling').mode === 'real', 'getProviderMode returns real');
    setProviderMode('kling', undefined); // clear
    assert(!isReal('kling'), 'kling isReal=false after clearing override');
    delete process.env.KLING_API_KEY;
  }

  console.log('  2.4 setProviderMode disabled');
  {
    setProviderMode('veo', 'disabled');
    assert(isDisabled('veo'), 'veo isDisabled=true');
    setProviderMode('veo', undefined);
  }

  console.log('  2.5 resetProviderModes clears all');
  {
    setProviderMode('seedance', 'real');
    setProviderMode('kling', 'disabled');
    resetProviderModes();
    const all = getAllProviderModes();
    let ok = true;
    for (const [, info] of Object.entries(all)) {
      if (info.source !== 'default') ok = false;
    }
    assert(ok, 'resetProviderModes clears all overrides');
  }

  console.log('  2.6 getAllProviderModes covers all providers');
  {
    const all = getAllProviderModes();
    const names = Object.keys(all);
    assert(names.includes('seedance'), 'includes seedance');
    assert(names.includes('kling'), 'includes kling');
    assert(names.includes('veo'), 'includes veo');
    assert(names.includes('runway'), 'includes runway');
    assert(names.length === 8, 'exactly 8 providers (4 video + 3 LLM + TTS)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Pipeline Runner
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── Pipeline Runner ──');

  const progressLog: string[] = [];
  function logProgress(_idx: number, name: string, pct: number, _msg?: string) {
    progressLog.push(`${name}:${pct}%`);
  }

  console.log('  3.1 Basic pipeline execution');
  {
    progressLog.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runner = new PipelineRunner<any>({ onProgress: logProgress });
    const result = await runner.run([
      defineStep<any>('step1', async (ctx) => ({ a: 1 })),
      defineStep<any>('step2', async (ctx) => ({ b: (ctx.a as number) + 1 })),
    ], {});
    assert(result.success, 'pipeline succeeded');
    assert(result.context.a === 1, 'step1 merged into context');
    assert(result.context.b === 2, 'step2 reads from context');
    assert(result.steps.length === 2, '2 step results recorded');
    assert(result.steps[0].success, 'step1 result success');
    assert(result.steps[1].success, 'step2 result success');
  }

  console.log('  3.2 Progress callback invoked');
  {
    assert(progressLog.length >= 4, 'progress called at least 4 times');
    assert(progressLog.includes('step2:100%'), 'last progress is 100%');
  }

  console.log('  3.3 Error handling — continue by default');
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runner = new PipelineRunner<any>();
    const result = await runner.run([
      defineStep<any>('good', async () => ({ ok: true })),
      defineStep<any>('bad', async () => { throw new Error('intentional'); }),
      defineStep<any>('after', async () => ({ recovered: true })),
    ], {});
    assert(!result.success, 'overall success=false when a step fails');
    assert(result.steps[0].success, 'first step succeeded');
    assert(!result.steps[1].success, 'second step failed');
    assert(result.steps[1].error === 'intentional', 'error message captured');
    assert(result.steps[2].success, 'third step still ran (continue on error)');
    assert(result.context.recovered === true, 'context has post-error values');
  }

  console.log('  3.4 stopOnError mode');
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runner = new PipelineRunner<any>({ stopOnError: true });
    const result = await runner.run([
      defineStep<any>('good', async () => ({ ok: true })),
      defineStep<any>('bad', async () => { throw new Error('stop here'); }),
      defineStep<any>('never', async () => ({ ran: true })),
    ], {});
    assert(!result.success, 'pipeline failed');
    const step3 = result.steps.find(s => s.name === 'never');
    assert(!step3, 'third step was NOT run (stopOnError)');
    assert(result.context.ran === undefined, 'context does not have third step value');
  }

  console.log('  3.5 defineStep helper');
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const step = defineStep<any>('test', async (_ctx) => ({ x: 1 }));
    assert(step.name === 'test', 'step has name');
    const r = await step.execute({});
    assert(r.x === 1, 'step executes');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Video Downloader
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── Video Downloader ──');

  console.log('  4.1 Download fails cleanly on bad URL');
  {
    const tmpDir = `/tmp/vf-test-${Date.now()}`;
    let threw = false;
    try {
      await downloadVideo('http://127.0.0.1:1/nope.mp4', `${tmpDir}/vid.mp4`, {
        maxRetries: 0,
        timeoutMs: 2000,
      });
    } catch {
      threw = true;
    }
    assert(threw, 'downloadVideo throws on unreachable URL');
    // downloadVideo creates the output dir before fetching, so it may exist even on failure
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ok */ }
  }

  console.log('  4.2 isVideoUrl helper');
  {
    assert(isVideoUrl('https://cdn.example.com/video.mp4'), 'mp4 is video URL');
    assert(isVideoUrl('https://cdn.example.com/video.mov'), 'mov is video URL');
    assert(isVideoUrl('https://cdn.example.com/video.webm'), 'webm is video URL');
    assert(isVideoUrl('http://example.com/stream'), 'http URL is video URL');
    assert(!isVideoUrl(''), 'empty string is not video URL');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Metadata Serialization / Deserialization
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── Metadata Helpers ──');

  console.log('  5.1 serializeMetadata produces valid JSON string');
  {
    const obj = { provider: 'seedance', model: 'v2', fps: 30 };
    const raw = serializeMetadata(obj);
    assert(raw === '{"provider":"seedance","model":"v2","fps":30}', 'serialized to correct JSON string');
    assert(typeof raw === 'string', 'returns a string type');
  }

  console.log('  5.2 serializeMetadata handles empty object');
  {
    assert(serializeMetadata({}) === '{}', 'empty object → "{}"');
  }

  console.log('  5.3 serializeMetadata handles null/undefined');
  {
    assert(serializeMetadata(null) === '{}', 'null → "{}"');
    assert(serializeMetadata(undefined) === '{}', 'undefined → "{}"');
  }

  console.log('  5.4 deserializeMetadata parses valid JSON string');
  {
    const raw = '{"provider":"kling","resolution":"1080p"}';
    const obj = deserializeMetadata(raw);
    assert(obj.provider === 'kling', 'parses provider');
    assert(obj.resolution === '1080p', 'parses resolution');
  }

  console.log('  5.5 deserializeMetadata handles empty string');
  {
    const obj = deserializeMetadata('');
    assert(typeof obj === 'object' && obj !== null, 'returns an object');
    assert(Object.keys(obj).length === 0, 'returns empty object for ""');
  }

  console.log('  5.6 deserializeMetadata handles "[object Object]" (the Prisma string-column bug)');
  {
    const obj = deserializeMetadata('[object Object]');
    assert(typeof obj === 'object' && obj !== null, 'returns an object');
    assert(Object.keys(obj).length === 0, 'returns empty object for the buggy default');
  }

  console.log('  5.7 deserializeMetadata handles null/undefined');
  {
    const a = deserializeMetadata(null);
    const b = deserializeMetadata(undefined);
    assert(typeof a === 'object' && a !== null, 'null → empty object');
    assert(typeof b === 'object' && b !== null, 'undefined → empty object');
  }

  console.log('  5.8 deserializeMetadata handles invalid JSON');
  {
    const obj = deserializeMetadata('not json at all');
    assert(typeof obj === 'object' && obj !== null, 'invalid JSON → empty object');
    assert(Object.keys(obj).length === 0, 'invalid JSON yields empty object');
  }

  console.log('  5.9 serializeMetadata → deserializeMetadata round-trip');
  {
    const original = { provider: 'veo', resolution: '4K', fps: 60, tags: ['cinematic', 'slow-mo'] };
    const roundTripped = deserializeMetadata(serializeMetadata(original));
    assert(roundTripped.provider === 'veo', 'round-trip: provider preserved');
    assert(roundTripped.resolution === '4K', 'round-trip: resolution preserved');
    assert(roundTripped.fps === 60, 'round-trip: fps preserved');
    assert(Array.isArray(roundTripped.tags) && roundTripped.tags.length === 2, 'round-trip: array preserved');
  }

  console.log('  5.10 metadata survives Prisma emulation (string → DB → string → parse)');
  {
    // Simulate: JS object → serializeMetadata → store in DB → read from DB → deserializeMetadata
    const input = {
      provider: 'seedance',
      model: 'doubao-seedance-2-0-260128',
      resolution: '720p',
      mode: 'mock',
      completedAt: new Date().toISOString(),
    };
    const stored = serializeMetadata(input);
    // Emulate Prisma returning the stored string
    const dbRaw = stored;
    const parsed = deserializeMetadata<typeof input>(dbRaw);
    assert(parsed.provider === input.provider, 'emulation: provider');
    assert(parsed.model === input.model, 'emulation: model');
    assert(parsed.resolution === input.resolution, 'emulation: resolution');
    assert(parsed.mode === input.mode, 'emulation: mode');
    assert(typeof parsed.completedAt === 'string', 'emulation: completedAt is string');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Passed: ${passed}  |  Failed: ${failed}`);
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
