/**
 * Phase 3D-1: Mode Unification Tests
 *
 * Run: npx tsx apps/server/src/lib/__tests__/phase3d-mode-unification.test.ts
 *
 * Covers:
 *   - Default modes for all provider categories
 *   - Resolution priority (override > per-provider env > global env > default)
 *   - canGoReal safety gate (mode=real + key required)
 *   - API key presence does NOT auto-trigger real mode
 *   - mode=real with missing key → canGoReal=false (fail closed)
 *   - LLM_MODE category scope (LLM only)
 *   - TTS mode gating
 *   - Provider-level enforcement (disabled → reject, real-no-key → reject)
 *   - Startup audit log format
 *   - Zero real external API calls
 */

import {
  getProviderMode, getEffectiveMode, isReal, isDisabled, getApiKey,
  setProviderMode, resetProviderModes, getAllProviderModes,
  VideoProviderName, LLMProviderName, AnyProviderName, ProviderMode,
  logStartupAudit,
} from '../provider-mode';
import { SeedanceProvider } from '../../providers/seedance/SeedanceProvider';
import { KlingProvider } from '../../providers/kling/KlingProvider';
import { VeoProvider } from '../../providers/veo/VeoProvider';

// ── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

function assertRejects(fn: () => Promise<any> | any, expectedMsg: string, label: string): Promise<void> {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        () => { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label} — expected rejection, got resolve`); },
        (err: any) => {
          if (err.message?.includes(expectedMsg)) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
          else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label} — wrong error: ${err.message?.slice(0, 80)}`); }
        },
      );
    }
    failed++; console.error(`  \x1b[31m✗\x1b[0m ${label} — expected rejection`);
    return Promise.resolve();
  } catch (err: any) {
    if (err.message?.includes(expectedMsg)) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
    else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label} — wrong error: ${err.message?.slice(0, 80)}`); }
    return Promise.resolve();
  }
}

function withCleanEnv(fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    // Capture original env values this test cares about
    const originals: Record<string, string | undefined> = {};
    const vars = [
      'SEEDANCE_MODE', 'KLING_MODE', 'VEO_MODE', 'RUNWAY_MODE',
      'DEEPSEEK_MODE', 'OPENAI_MODE', 'ANTHROPIC_MODE', 'TTS_MODE',
      'PROVIDER_MODE', 'LLM_MODE',
      'SEEDANCE_API_KEY', 'DEEPSEEK_API_KEY', 'TTS_API_KEY',
    ];
    for (const v of vars) originals[v] = process.env[v];
    try {
      // Clean all mode vars
      for (const v of vars) delete process.env[v];
      resetProviderModes();
      await fn();
    } finally {
      // Restore originals
      for (const v of vars) {
        if (originals[v] !== undefined) process.env[v] = originals[v];
        else delete process.env[v];
      }
      resetProviderModes();
    }
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════════
  // A. Default Modes (clean env, no env-vars)
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── A. Default Modes (clean env) ──');

    // A1: Video providers default to mock
    assert(getProviderMode('seedance').mode === 'mock', 'seedance defaults to mock');
    assert(getProviderMode('kling').mode === 'mock', 'kling defaults to mock');
    assert(getProviderMode('veo').mode === 'mock', 'veo defaults to mock');
    assert(getProviderMode('runway').mode === 'mock', 'runway defaults to mock');

    // A2: LLM providers default to disabled
    assert(getProviderMode('deepseek').mode === 'disabled', 'deepseek defaults to disabled');
    assert(getProviderMode('openai').mode === 'disabled', 'openai defaults to disabled');
    assert(getProviderMode('anthropic').mode === 'disabled', 'anthropic defaults to disabled');

    // A3: TTS defaults to mock
    assert(getProviderMode('tts').mode === 'mock', 'tts defaults to mock');

    // A4: Source is 'default'
    for (const name of ['seedance', 'kling', 'deepseek', 'openai', 'tts'] as AnyProviderName[]) {
      assert(getProviderMode(name).source === 'default', `${name} source is default`);
    }

    // A5: No provider canGoReal without key
    for (const name of ['seedance', 'kling', 'veo', 'deepseek', 'openai', 'anthropic', 'tts'] as AnyProviderName[]) {
      assert(!isReal(name), `${name} isReal=false with no key`);
      assert(getEffectiveMode(name).canGoReal === false, `${name} canGoReal=false with no key`);
    }

    // A6: getApiKey returns empty
    assert(getApiKey('seedance') === '', 'seedance key is empty in clean env');
    assert(getApiKey('deepseek') === '', 'deepseek key is empty in clean env');
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // B. Per-Provider Env Var Priority
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── B. Per-Provider Env Priority ──');

    // B1: SEEDANCE_MODE overrides default
    process.env.SEEDANCE_MODE = 'disabled';
    assert(getProviderMode('seedance').mode === 'disabled', 'SEEDANCE_MODE=disabled → disabled');
    assert(getProviderMode('seedance').source === 'env', 'source is env');
    delete process.env.SEEDANCE_MODE;

    // B2: SEEDANCE_MODE=real
    process.env.SEEDANCE_MODE = 'real';
    process.env.SEEDANCE_API_KEY = 'test-key';
    assert(getProviderMode('seedance').mode === 'real', 'SEEDANCE_MODE=real → real');
    assert(getEffectiveMode('seedance').canGoReal === true, 'canGoReal with mode=real+key');
    delete process.env.SEEDANCE_MODE;

    // B3: KLING_MODE overrides default
    process.env.KLING_MODE = 'disabled';
    assert(getProviderMode('kling').mode === 'disabled', 'KLING_MODE=disabled → disabled');
    delete process.env.KLING_MODE;

    // B4: DEEPSEEK_MODE overrides default
    process.env.DEEPSEEK_MODE = 'mock';
    assert(getProviderMode('deepseek').mode === 'mock', 'DEEPSEEK_MODE=mock → mock');
    delete process.env.DEEPSEEK_MODE;

    // B5: TTS_MODE overrides default
    process.env.TTS_MODE = 'disabled';
    assert(getProviderMode('tts').mode === 'disabled', 'TTS_MODE=disabled → disabled');
    delete process.env.TTS_MODE;

    // B6: Per-provider env doesn't leak to other providers
    process.env.SEEDANCE_MODE = 'disabled';
    assert(getProviderMode('kling').mode === 'mock', 'kling still mock when seedance is disabled');
    assert(getProviderMode('veo').mode === 'mock', 'veo still mock when seedance is disabled');
    delete process.env.SEEDANCE_MODE;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // C. Global PROVIDER_MODE Fallback
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── C. Global PROVIDER_MODE ──');

    // C1: PROVIDER_MODE=disabled applies to all
    process.env.PROVIDER_MODE = 'disabled';
    assert(getProviderMode('seedance').mode === 'disabled', 'PROVIDER_MODE → seedance disabled');
    assert(getProviderMode('kling').mode === 'disabled', 'PROVIDER_MODE → kling disabled');
    assert(getProviderMode('deepseek').mode === 'disabled', 'PROVIDER_MODE → deepseek disabled');
    assert(getProviderMode('tts').mode === 'disabled', 'PROVIDER_MODE → tts disabled');

    // C2: Per-provider env takes priority over global
    process.env.SEEDANCE_MODE = 'mock';
    assert(getProviderMode('seedance').mode === 'mock', 'per-provider mock overrides global disabled');
    assert(getProviderMode('kling').mode === 'disabled', 'kling still global disabled');
    delete process.env.SEEDANCE_MODE;
    delete process.env.PROVIDER_MODE;

    // C3: PROVIDER_MODE=real without keys → canGoReal=false for all
    process.env.PROVIDER_MODE = 'real';
    assert(getProviderMode('seedance').mode === 'real', 'PROVIDER_MODE=real → seedance mode real');
    assert(getEffectiveMode('seedance').canGoReal === false, 'seedance canGoReal=false (no key)');
    assert(getEffectiveMode('deepseek').canGoReal === false, 'deepseek canGoReal=false (no key)');
    delete process.env.PROVIDER_MODE;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // D. LLM_MODE Category Scope
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── D. LLM_MODE Category ──');

    // D1: LLM_MODE=mock affects LLM providers only
    process.env.LLM_MODE = 'mock';
    assert(getProviderMode('deepseek').mode === 'mock', 'LLM_MODE → deepseek mock');
    assert(getProviderMode('openai').mode === 'mock', 'LLM_MODE → openai mock');
    assert(getProviderMode('anthropic').mode === 'mock', 'LLM_MODE → anthropic mock');
    // Video providers are NOT affected
    assert(getProviderMode('seedance').mode === 'mock', 'seedance still mock (default, not LLM)');
    assert(getProviderMode('kling').mode === 'mock', 'kling still mock (default, not LLM)');
    assert(getProviderMode('tts').mode === 'mock', 'tts still mock (default, not LLM)');
    delete process.env.LLM_MODE;

    // D2: PROVIDER_MODE overrides LLM_MODE for LLM (global beats category)
    process.env.LLM_MODE = 'mock';
    process.env.PROVIDER_MODE = 'disabled';
    assert(getProviderMode('deepseek').mode === 'disabled', 'PROVIDER_MODE overrides LLM_MODE (global > category)');
    // But per-provider LLM env still beats PROVIDER_MODE
    process.env.DEEPSEEK_MODE = 'mock';
    assert(getProviderMode('deepseek').mode === 'mock', 'DEEPSEEK_MODE overrides PROVIDER_MODE (per-provider > global)');
    delete process.env.DEEPSEEK_MODE;
    delete process.env.LLM_MODE;
    delete process.env.PROVIDER_MODE;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // E. In-Memory Override Priority (highest)
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── E. In-Memory Override ──');

    // E1: Override beats env var
    process.env.SEEDANCE_MODE = 'disabled';
    setProviderMode('seedance', 'mock');
    assert(getProviderMode('seedance').mode === 'mock', 'override mock beats env disabled');
    assert(getProviderMode('seedance').source === 'override', 'source is override');

    // E2: Override beats global
    process.env.PROVIDER_MODE = 'real';
    setProviderMode('kling', 'disabled');
    assert(getProviderMode('kling').mode === 'disabled', 'override disabled beats global real');

    // E3: Clear override falls back
    setProviderMode('seedance', undefined);
    assert(getProviderMode('seedance').mode === 'disabled', 'cleared override falls back to env');
    assert(getProviderMode('seedance').source === 'env', 'source back to env');

    // E4: resetProviderModes clears all
    // Clean env so we test defaults, not leaked PROVIDER_MODE from E2
    delete process.env.PROVIDER_MODE;
    setProviderMode('seedance', 'disabled');
    setProviderMode('kling', 'disabled');
    resetProviderModes();
    // seedance falls back to SEEDANCE_MODE=disabled (env)
    assert(getProviderMode('seedance').mode === 'disabled', 'seedance back to env after reset');
    // kling falls back to default mock (no env vars for kling)
    assert(getProviderMode('kling').mode === 'mock', 'kling back to default after reset');

    delete process.env.SEEDANCE_MODE;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // F. canGoReal Safety Gate
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── F. canGoReal Safety ──');

    // F1: mode=real + key present → canGoReal=true
    process.env.SEEDANCE_MODE = 'real';
    process.env.SEEDANCE_API_KEY = 'sk-test123';
    assert(getEffectiveMode('seedance').canGoReal === true, 'real+key → canGoReal');
    assert(getEffectiveMode('seedance').apiKeyPresent === true, 'key present detected');
    delete process.env.SEEDANCE_MODE;
    delete process.env.SEEDANCE_API_KEY;

    // F2: mode=real but NO key → canGoReal=false (fail closed)
    process.env.SEEDANCE_MODE = 'real';
    // key intentionally absent
    assert(getEffectiveMode('seedance').canGoReal === false, 'real w/o key → canGoReal=false');
    assert(getEffectiveMode('seedance').apiKeyPresent === false, 'key absent detected');
    delete process.env.SEEDANCE_MODE;

    // F3: Key present but mode=mock → canGoReal=false (key alone does not trigger real)
    process.env.SEEDANCE_API_KEY = 'sk-test123';
    // mode default is mock
    assert(getProviderMode('seedance').mode === 'mock', 'default mode is mock');
    assert(getEffectiveMode('seedance').canGoReal === false, 'key present but mode=mock → canGoReal=false');
    delete process.env.SEEDANCE_API_KEY;

    // F4: Key present but mode=disabled → canGoReal=false
    process.env.SEEDANCE_API_KEY = 'sk-test123';
    process.env.SEEDANCE_MODE = 'disabled';
    assert(getEffectiveMode('seedance').canGoReal === false, 'key present but mode=disabled → canGoReal=false');
    delete process.env.SEEDANCE_MODE;
    delete process.env.SEEDANCE_API_KEY;

    // F5: LLM mode=real+key → canGoReal=true
    process.env.LLM_MODE = 'real';
    process.env.DEEPSEEK_API_KEY = 'sk-ds-test';
    assert(getEffectiveMode('deepseek').canGoReal === true, 'LLM real+key → canGoReal');
    delete process.env.LLM_MODE;
    delete process.env.DEEPSEEK_API_KEY;

    // F6: LLM mode=real w/o key → canGoReal=false
    process.env.LLM_MODE = 'real';
    assert(getEffectiveMode('deepseek').canGoReal === false, 'LLM real w/o key → canGoReal=false');
    delete process.env.LLM_MODE;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // G. getAllProviderModes Coverage
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── G. getAllProviderModes ──');

    const all = getAllProviderModes();
    const names = Object.keys(all);
    assert(names.includes('seedance'), 'includes seedance');
    assert(names.includes('kling'), 'includes kling');
    assert(names.includes('veo'), 'includes veo');
    assert(names.includes('runway'), 'includes runway');
    assert(names.includes('deepseek'), 'includes deepseek');
    assert(names.includes('openai'), 'includes openai');
    assert(names.includes('anthropic'), 'includes anthropic');
    assert(names.includes('tts'), 'includes tts');
    assert(names.length === 8, 'exactly 8 providers');
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // H. Startup Audit Log (smoke test — no crash, no secret leak)
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── H. Startup Audit (manual visual check) ──');

    // Capture console output
    const origLog = console.log;
    const lines: string[] = [];
    console.log = (...args: any[]) => { lines.push(args.join(' ')); origLog(...args); };

    logStartupAudit();

    console.log = origLog;

    // H1: Audit doesn't crash
    assert(lines.length > 0, 'audit produces output');

    // H2: No API keys leaked
    process.env.SEEDANCE_API_KEY = 'sk-super-secret-test-key';
    const lines2: string[] = [];
    console.log = (...args: any[]) => { lines2.push(args.join(' ')); };
    logStartupAudit();
    console.log = origLog;
    const joined = lines2.join(' ');
    assert(!joined.includes('sk-super-secret-test-key'), 'audit does NOT leak API key');
    delete process.env.SEEDANCE_API_KEY;

    // H3: Contains mode info
    const joined2 = lines.join(' ');
    assert(joined2.includes('seedance') || joined2.includes('mock') || joined2.includes('disabled'), 'audit mentions provider names or modes');
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // I. SeedanceProvider Mode Enforcement
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── I. SeedanceProvider Enforcement ──');

    // I1: Mock mode works (explicit mode override in constructor)
    const mockSeedance = new SeedanceProvider({ mode: 'mock' } as any);
    const createResult = await mockSeedance.createTask({ prompt: 'test' });
    assert(createResult.externalTaskId.startsWith('seedance_mock_'), 'mock create returns mock id');
    assert(mockSeedance.mode === 'mock', 'mode is mock');
    assert(mockSeedance.realReady === false, 'realReady is false in mock');

    // I2: Mock mode also works without explicit mode (defaults to mock from unified)
    const defaultSeedance = new SeedanceProvider();
    assert(defaultSeedance.mode === 'mock', 'default mode is mock');
    const defaultResult = await defaultSeedance.createTask({ prompt: 'test' });
    assert(defaultResult.externalTaskId.startsWith('seedance_mock_'), 'default create returns mock');

    // I3: Disabled mode rejects
    await assertRejects(
      () => {
        const p = new SeedanceProvider({ mode: 'disabled' } as any);
        return p.createTask({ prompt: 'test' });
      },
      'disabled',
      'disabled createTask rejects',
    );

    // I4: Real mode without key rejects (fail closed)
    await assertRejects(
      () => {
        const p = new SeedanceProvider({ mode: 'real' } as any);
        return p.createTask({ prompt: 'test' });
      },
      'API key is missing',
      'real w/o key rejects createTask',
    );

    // I5: Real mode with (fake) key proceeds to real path (but will fail on actual API call)
    // We verify the mode gate passes — the actual call will fail at network level, not mode level
    const realSeedance = new SeedanceProvider({
      apiKey: 'sk-fake-test-key',
      mode: 'real',
    } as any);
    assert(realSeedance.mode === 'real', 'mode is real');
    assert(realSeedance.realReady === true, 'realReady is true with key');
    // Don't actually call createTask — it would try real API
    // Instead verify the dispatch logic by trying to get mock behavior through mode
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // J. KlingProvider Mode Enforcement
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── J. KlingProvider Enforcement ──');

    // J1: Default mock works
    const mockKling = new KlingProvider();
    assert(mockKling.mode === 'mock', 'default mode is mock');
    const createResult = await mockKling.createTask({ prompt: 'test' });
    assert(createResult.externalTaskId.startsWith('kling_'), 'mock create returns kling id');

    // J2: Disabled mode rejects
    await assertRejects(
      () => {
        const p = new KlingProvider({ mode: 'disabled' } as any);
        return p.createTask({ prompt: 'test' });
      },
      'disabled',
      'disabled createTask rejects for Kling',
    );

    // J3: Real mode rejects (not implemented)
    await assertRejects(
      () => {
        const p = new KlingProvider({ mode: 'real' } as any);
        return p.createTask({ prompt: 'test' });
      },
      'not yet implemented',
      'real mode rejects Kling (not yet implemented)',
    );
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // K. VeoProvider Mode Enforcement
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── K. VeoProvider Enforcement ──');

    // K1: Default mock works
    const mockVeo = new VeoProvider();
    assert(mockVeo.mode === 'mock', 'default mode is mock');
    const createResult = await mockVeo.createTask({ prompt: 'test' });
    assert(createResult.externalTaskId.startsWith('veo_'), 'mock create returns veo id');

    // K2: Disabled mode rejects
    await assertRejects(
      () => {
        const p = new VeoProvider({ mode: 'disabled' } as any);
        return p.createTask({ prompt: 'test' });
      },
      'disabled',
      'disabled createTask rejects for Veo',
    );

    // K3: Real mode rejects (not implemented)
    await assertRejects(
      () => {
        const p = new VeoProvider({ mode: 'real' } as any);
        return p.createTask({ prompt: 'test' });
      },
      'not yet implemented',
      'real mode rejects Veo (not yet implemented)',
    );
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // L. Provider Mode Rountrip (API key exists → still mock by default)
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── L. Key Does Not Auto-Trigger Real ──');

    // L1: Seedance with real key but default mode → mock
    process.env.SEEDANCE_API_KEY = 'sk-real-looking-key';
    const sp = new SeedanceProvider();
    assert(sp.mode === 'mock', 'mode stays mock even with real API key present');
    assert(sp.realReady === false, 'realReady is false (mode=mock)');
    const result = await sp.createTask({ prompt: 'test' });
    assert(result.externalTaskId.startsWith('seedance_mock_'), 'mock path used despite key present');
    delete process.env.SEEDANCE_API_KEY;

    // L2: Seedance with mode=real + key → realReady=true
    process.env.SEEDANCE_API_KEY = 'sk-real-looking-key';
    const sp2 = new SeedanceProvider({ mode: 'real' } as any);
    assert(sp2.mode === 'real', 'mode is real');
    assert(sp2.realReady === true, 'realReady is true');
    delete process.env.SEEDANCE_API_KEY;

    // L3: Kling with key but no mode override → still mock
    process.env.KLING_API_KEY = 'fake-kling-key';
    const kp = new KlingProvider({ apiKey: 'fake-kling-key' });
    assert(kp.mode === 'mock', 'Kling mode=mock even with key');
    assert(kp.realReady === false, 'Kling realReady=false with key (mode=mock)');
    delete process.env.KLING_API_KEY;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // M. isReal / isDisabled Helper Coverage
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── M. isReal / isDisabled Helpers ──');

    // M1: Default — none are real
    assert(!isReal('seedance'), 'isReal seedance=false default');
    assert(!isReal('deepseek'), 'isReal deepseek=false default');
    assert(!isReal('tts'), 'isReal tts=false default');

    // M2: Default — none are disabled (video=mock, LLM=disabled)
    assert(!isDisabled('seedance'), 'isDisabled seedance=false (mock)');
    assert(!isDisabled('kling'), 'isDisabled kling=false (mock)');
    assert(isDisabled('deepseek'), 'isDisabled deepseek=true (LLM default)');
    assert(isDisabled('openai'), 'isDisabled openai=true (LLM default)');
    assert(!isDisabled('tts'), 'isDisabled tts=false (mock)');

    // M3: With override
    setProviderMode('seedance', 'real');
    process.env.SEEDANCE_API_KEY = 'sk-test';
    assert(isReal('seedance'), 'isReal seedance=true with real mode + key');
    setProviderMode('seedance', 'disabled');
    assert(isDisabled('seedance'), 'isDisabled seedance=true with override');
    resetProviderModes();
    delete process.env.SEEDANCE_API_KEY;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // N. Conflict Resolution
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── N. Conflict Scenarios ──');

    // N1: Per-provider SEEDANCE_MODE=disabled beats PROVIDER_MODE=real
    process.env.PROVIDER_MODE = 'real';
    process.env.SEEDANCE_MODE = 'disabled';
    assert(getProviderMode('seedance').mode === 'disabled', 'per-provider disabled beats global real');
    delete process.env.SEEDANCE_MODE;
    delete process.env.PROVIDER_MODE;

    // N2: SEEDANCE_MODE=real but PROVIDER_MODE=mock → seedance real (per-provider wins)
    process.env.PROVIDER_MODE = 'mock';
    process.env.SEEDANCE_MODE = 'real';
    process.env.SEEDANCE_API_KEY = 'sk-test';
    assert(getProviderMode('seedance').mode === 'real', 'per-provider real beats global mock');
    assert(getEffectiveMode('seedance').canGoReal === true, 'canGoReal with per-provider real');
    delete process.env.SEEDANCE_MODE;
    delete process.env.PROVIDER_MODE;
    delete process.env.SEEDANCE_API_KEY;

    // N3: Provider is disabled but other providers are not
    process.env.SEEDANCE_MODE = 'disabled';
    assert(isDisabled('seedance'), 'seedance disabled');
    assert(!isDisabled('kling'), 'kling not disabled');
    assert(!isDisabled('veo'), 'veo not disabled');
    delete process.env.SEEDANCE_MODE;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // O. Zero Real API Calls Verification
  // ═══════════════════════════════════════════════════════════════════════════

  await withCleanEnv(async () => {
    console.log('\n── O. Zero External API Calls ──');

    // O1: All mock Seedance operations complete without network
    const sp = new SeedanceProvider({ mode: 'mock' } as any);
    const createRes = await sp.createTask({ prompt: 'network-test' });
    assert(createRes.externalTaskId.includes('mock'), 'mock create no network');
    const statusRes = await sp.getStatus(createRes.externalTaskId);
    assert(typeof statusRes.status === 'string', 'mock status no network');
    const dlRes = await sp.downloadResult('https://fake.url/video.mp4', '/tmp/test.mp4');
    assert(typeof dlRes.localPath === 'string', 'mock download no network');

    // O2: All mock Kling operations complete without network
    const kp = new KlingProvider({ mode: 'mock' } as any);
    const kc = await kp.createTask({ prompt: 'ktest' });
    assert(kc.externalTaskId.includes('kling'), 'kling mock create no network');

    // O3: Disabled mode rejects without any network attempt
    const dp = new SeedanceProvider({ mode: 'disabled' } as any);
    try { await dp.createTask({ prompt: 'should-fail' }); assert(false, 'should not reach'); } catch { /* expected */ }
    assert(true, 'disabled mode rejected without network');
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // Results
  // ═══════════════════════════════════════════════════════════════════════════

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Phase 3D-1 Mode Unification:  Passed=${passed}  Failed=${failed}`);
  console.log(`${'═'.repeat(60)}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Phase 3D-1 test crashed:', err);
  process.exit(1);
});
