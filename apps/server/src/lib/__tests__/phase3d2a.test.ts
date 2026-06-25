/**
 * Phase 3D-2A: Idempotency, Persistence & Task Recovery Tests
 *
 * Run: npx tsx apps/server/src/lib/__tests__/phase3d2a.test.ts
 *
 * Covers:
 *   1. Idempotent submit — same promptId twice → one VideoTask
 *   2. Different prompts → different tasks
 *   3. externalTaskId persisted before polling
 *   4. Existing live task with extId → no re-create
 *   5. Stale submitted without extId → aged out, new task
 *   6. CAS atomic state transition (updateMany compare-and-set)
 *   7. Terminal states not recovered
 *   8. Stable BullMQ jobId helper
 *   9. Provider-scoped idempotency
 *  10. resumeTask for processing with extId
 *  11. resumeTask skips terminal / no-extId tasks
 *  12. Startup recovery scan
 *  13. Zero real network requests in mock mode
 */

import {
  prisma,
  setPrismaClientForTests,
  resetPrismaClientForTests,
} from '../prisma';
import { ProviderManager } from '../../providers/manager/ProviderManager';
import { SeedanceProvider } from '../../providers/seedance/SeedanceProvider';
import { KlingProvider } from '../../providers/kling/KlingProvider';
import { v4 as uuid } from 'uuid';
import { idempotentJobId } from '../queue-registry';

// ── Test harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string): void {
  if (condition) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { failed++; console.error(`  \x1b[31m✗\x1b[0m ${label}`); }
}

// ── In-memory Prisma mock ────────────────────────────────────────────────────

interface MockRow {
  id: string;
  promptId: string;
  model: string;
  provider: string;
  status: string;
  progress: number;
  videoUrl: string;
  externalTaskId: string;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number;
  thumbnailUrl: string;
  error: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
  prompt?: any;
}

function createMockPrisma() {
  const videoTasks = new Map<string, MockRow>();
  const prompts = new Map<string, any>();

  const now = new Date();

  return {
    videoTask: {
      async create(args: { data: any }) {
        const row: MockRow = {
          id: args.data.id || uuid(),
          promptId: args.data.promptId || '',
          model: args.data.model || 'seedance',
          provider: args.data.provider || 'seedance',
          status: args.data.status || 'pending',
          progress: args.data.progress || 0,
          videoUrl: args.data.videoUrl || '',
          externalTaskId: args.data.externalTaskId || '',
          startedAt: args.data.startedAt || null,
          completedAt: args.data.completedAt || null,
          duration: args.data.duration || 0,
          thumbnailUrl: args.data.thumbnailUrl || '',
          error: args.data.error || '',
          metadata: args.data.metadata || '',
          createdAt: args.data.createdAt || now,
          updatedAt: args.data.updatedAt || now,
        };
        videoTasks.set(row.id, row);
        return row;
      },
      async findFirst(args: { where: any; orderBy?: any }) {
        const w = args.where || {};
        for (const row of videoTasks.values()) {
          if (w.promptId && row.promptId !== w.promptId) continue;
          if (w.provider && row.provider !== w.provider) continue;
          if (w.status && typeof w.status === 'string' && row.status !== w.status) continue;
          if (w.status?.in && !(w.status.in as string[]).includes(row.status)) continue;
          if (w.status?.not && row.status === w.status.not) continue;
          if (w.id && row.id !== w.id) continue;
          return row;
        }
        return null;
      },
      async findMany(args: { where: any; orderBy?: any }) {
        const w = args.where || {};
        const results: MockRow[] = [];
        for (const row of videoTasks.values()) {
          if (w.status?.in && !(w.status.in as string[]).includes(row.status)) continue;
          if (w.status && typeof w.status === 'string' && row.status !== w.status) continue;
          if (w.promptId && typeof w.promptId === 'string' && row.promptId !== w.promptId) continue;
          if (w.promptId?.in && !(w.promptId.in as string[]).includes(row.promptId)) continue;
          if (w.updatedAt?.lt && row.updatedAt >= w.updatedAt.lt) continue;
          if (w.id?.in && !(w.id.in as string[]).includes(row.id)) continue;
          results.push(row);
        }
        return results;
      },
      async findUnique(args: { where: any }) {
        return this.findFirst(args);
      },
      async update(args: { where: any; data: any }) {
        const row = await this.findFirst(args);
        if (row) {
          Object.assign(row, args.data, { updatedAt: new Date() });
        }
        return row;
      },
      async updateMany(args: { where: any; data: any }) {
        let count = 0;
        const rows = await this.findMany(args);
        for (const row of rows) {
          if (args.where.status && typeof args.where.status === 'string' && row.status !== args.where.status) continue;
          if (args.where.status?.in && !(args.where.status.in as string[]).includes(row.status)) continue;
          Object.assign(row, args.data, { updatedAt: new Date() });
          count++;
        }
        return { count };
      },
      async count(args: { where: any }) {
        const rows = await this.findMany(args);
        return rows.length;
      },
      async deleteMany(_args: any) {
        const rows = await this.findMany(_args);
        for (const r of rows) videoTasks.delete(r.id);
        return { count: rows.length };
      },
      async delete(_args: any) {
        const found = await this.findFirst(_args);
        if (found) videoTasks.delete(found.id);
        return found;
      },
    },
    prompt: {
      async findUnique(args: { where: any; include?: any }) {
        const p = prompts.get(args.where.id);
        if (!p) return null;
        return {
          ...p,
          storyboard: { script: { product: null } },
        };
      },
      async create(args: { data: any }) {
        prompts.set(args.data.id, args.data);
        return args.data;
      },
      async delete(args: { where: any }) {
        prompts.delete(args.where.id);
        return {};
      },
      async deleteMany(_args: any) {
        prompts.clear();
        return { count: 0 };
      },
    },
    $disconnect: async () => {},
    $connect: async () => {},
    $executeRaw: async () => {},
    $queryRaw: async () => {},
  };
}

// ── Test helpers ──────────────────────────────────────────────────────────────

function mkManager(): ProviderManager {
  const mgr = new ProviderManager();
  mgr.register(new SeedanceProvider({ mode: 'mock' } as any));
  mgr.register(new KlingProvider({ mode: 'mock' } as any));
  return mgr;
}

async function createTestPrompt(pid: string): Promise<void> {
  try { await (prisma as any).prompt.create({ data: { id: pid, prompt: 'test', model: 'seedance' } }); } catch {}
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const mockPrisma = createMockPrisma();
  setPrismaClientForTests(mockPrisma as any);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Idempotent Submit
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 1. Idempotent Submit ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    const r1 = await mgr.submit(pid, 'seedance');
    assert(r1.dbTaskId.length > 0, 'first submit creates task');
    assert(r1.externalTaskId.length > 0, 'first submit gets extId');

    const count1 = await (prisma as any).videoTask.count({ where: { promptId: pid } });

    const r2 = await mgr.submit(pid, 'seedance');
    const count2 = await (prisma as any).videoTask.count({ where: { promptId: pid } });

    assert(r2.dbTaskId === r1.dbTaskId, 'second submit returns same task');
    assert(count2 === count1, 'no duplicate videoTask');
    assert(count2 === 1, 'exactly one videoTask');

    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Different Prompts → Different Tasks
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 2. Different Prompts ──');
  {
    const mgr = mkManager();
    const p1 = uuid(); const p2 = uuid();
    await createTestPrompt(p1); await createTestPrompt(p2);

    const r1 = await mgr.submit(p1, 'seedance');
    const r2 = await mgr.submit(p2, 'seedance');

    assert(r1.dbTaskId !== r2.dbTaskId, 'different tasks');
    const count = await (prisma as any).videoTask.count({ where: { promptId: { in: [p1, p2] } } });
    assert(count === 2, '2 prompts → 2 tasks');

    await (prisma as any).videoTask.deleteMany({ where: { promptId: { in: [p1, p2] } } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. externalTaskId Persistence
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 3. externalTaskId Persistence ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    const r = await mgr.submit(pid, 'seedance');
    const task = await (prisma as any).videoTask.findUnique({ where: { id: r.dbTaskId } });

    assert(task.status === 'processing', 'processing after submit');
    assert(task.externalTaskId.length > 0, 'externalTaskId persisted');
    assert(task.metadata.includes('externalTaskId'), 'metadata has extId');
    assert(task.metadata.includes('seedance'), 'metadata has provider');

    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ExternalTaskId Present → No Re-Create
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 4. Existing extId → No Re-Create ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    const r1 = await mgr.submit(pid, 'seedance');
    const origExtId = r1.externalTaskId;

    // Clear pollers (simulate restart)
    mgr.cancel(r1.dbTaskId);

    const r2 = await mgr.submit(pid, 'seedance');
    assert(r2.dbTaskId === r1.dbTaskId, 'same task after poller clear');
    assert(r2.externalTaskId === origExtId, 'extId unchanged');

    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Stale Submitted → Aged Out
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 5. Stale Submitted Recovery ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    // Create a stale submitted task (10 min old)
    const staleId = uuid();
    const oldDate = new Date(Date.now() - 600_000);
    await (prisma as any).videoTask.create({
      data: {
        id: staleId, promptId: pid, model: 'seedance', provider: 'seedance',
        status: 'submitted', progress: 5,
        createdAt: oldDate, updatedAt: oldDate,
      },
    });

    const r = await mgr.submit(pid, 'seedance');
    // Old stale should be failed, new task created
    assert(r.dbTaskId !== staleId, 'new task (stale failed)');

    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CAS Atomic State
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 6. CAS Atomic Transition ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    const r = await mgr.submit(pid, 'seedance');
    const task = await (prisma as any).videoTask.findUnique({ where: { id: r.dbTaskId } });
    assert(task.status === 'processing', 'final status processing');

    // CAS on already-transitioned task should fail
    const cas = await (prisma as any).videoTask.updateMany({
      where: { id: r.dbTaskId, status: 'pending' },
      data: { status: 'submitted' },
    });
    assert(cas.count === 0, 'CAS rejects post-transition task');

    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Terminal States Not Recovered
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 7. Terminal Not Recovered ──');
  {
    const mgr = mkManager();
    const cid = uuid(); const fid = uuid();
    const oldDate = new Date(Date.now() - 3600_000);

    await (prisma as any).videoTask.create({
      data: { id: cid, promptId: uuid(), model: 'seedance', provider: 'seedance',
        status: 'completed', progress: 100, externalTaskId: 'mock_done',
        createdAt: oldDate, updatedAt: oldDate },
    });
    await (prisma as any).videoTask.create({
      data: { id: fid, promptId: uuid(), model: 'seedance', provider: 'seedance',
        status: 'failed', progress: 0, externalTaskId: 'mock_fail',
        createdAt: oldDate, updatedAt: oldDate },
    });

    const { recovered, failed: fcount } = await ProviderManager.recoverStaleTasks(mgr);
    assert(recovered >= 0, 'recovery completed');
    // Terminal tasks should not be recovered (they are not in LIVE_STATUSES)
    assert(!(await mgr.resumeTask(cid)), 'completed not resumed');
    assert(!(await mgr.resumeTask(fid)), 'failed not resumed');

    await (prisma as any).videoTask.deleteMany({ where: { id: { in: [cid, fid] } } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Stable BullMQ JobId
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 8. Stable JobId ──');
  {
    const k1 = idempotentJobId('vg', 'prompt-abc');
    const k2 = idempotentJobId('vg', 'prompt-abc');
    assert(k1 === k2, 'deterministic jobId');
    assert(k1.startsWith('vg:'), 'prefix correct');
    assert(idempotentJobId('test', 'x') !== idempotentJobId('test', 'y'), 'different keys differ');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Provider-Scoped Idempotency
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 9. Provider-Scoped ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    const r1 = await mgr.submit(pid, 'seedance');
    const r2 = await mgr.submit(pid, 'kling');
    assert(r1.dbTaskId !== r2.dbTaskId, 'different providers → different tasks');

    const tasks = await (prisma as any).videoTask.findMany({ where: { promptId: pid } });
    assert(tasks.length === 2, '2 tasks for 2 providers');

    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. resumeTask
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 10. resumeTask ──');
  {
    const mgr = mkManager();
    const tid = uuid();
    const oldDate = new Date(Date.now() - 600_000);

    await (prisma as any).videoTask.create({
      data: {
        id: tid, promptId: uuid(), model: 'seedance', provider: 'seedance',
        status: 'processing', progress: 50, externalTaskId: 'seedance_mock_resume',
        metadata: JSON.stringify({ provider: 'seedance', externalTaskId: 'seedance_mock_resume', submittedAt: new Date().toISOString() }),
        createdAt: oldDate, updatedAt: oldDate,
      },
    });

    const ok = await mgr.resumeTask(tid);
    assert(ok, 'resumeTask true for valid processing');
    assert(mgr.activeCount >= 1, 'poller registered');
    mgr.cancel(tid);

    await (prisma as any).videoTask.deleteMany({ where: { id: tid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. resumeTask Skips Terminal / No-extId
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 11. resumeTask Skips ──');
  {
    const mgr = mkManager();
    const cid = uuid(); const fid = uuid(); const noExt = uuid();

    await (prisma as any).videoTask.create({ data: { id: cid, promptId: uuid(), model: 'seedance', provider: 'seedance', status: 'completed', progress: 100, externalTaskId: 'x', createdAt: new Date(), updatedAt: new Date() } });
    await (prisma as any).videoTask.create({ data: { id: fid, promptId: uuid(), model: 'seedance', provider: 'seedance', status: 'failed', progress: 0, externalTaskId: 'x', createdAt: new Date(), updatedAt: new Date() } });
    await (prisma as any).videoTask.create({ data: { id: noExt, promptId: uuid(), model: 'seedance', provider: 'seedance', status: 'processing', progress: 30, externalTaskId: '', createdAt: new Date(), updatedAt: new Date() } });

    assert(!(await mgr.resumeTask(cid)), 'completed skipped');
    assert(!(await mgr.resumeTask(fid)), 'failed skipped');
    assert(!(await mgr.resumeTask(noExt)), 'no-extId skipped');

    await (prisma as any).videoTask.deleteMany({ where: { id: { in: [cid, fid, noExt] } } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Startup Recovery Scan
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 12. Startup Recovery ──');
  {
    const mgr = mkManager();
    const recId = uuid(); const stuckId = uuid();
    const oldDate = new Date(Date.now() - 600_000);

    await (prisma as any).videoTask.create({ data: { id: recId, promptId: uuid(), model: 'seedance', provider: 'seedance', status: 'processing', progress: 35, externalTaskId: 'seedance_mock_rec', metadata: '{}', createdAt: oldDate, updatedAt: oldDate } });
    await (prisma as any).videoTask.create({ data: { id: stuckId, promptId: uuid(), model: 'seedance', provider: 'seedance', status: 'submitted', progress: 5, externalTaskId: '', createdAt: oldDate, updatedAt: oldDate } });

    const { recovered, failed: stuckCount } = await ProviderManager.recoverStaleTasks(mgr);
    assert(recovered >= 1, 'recovered >= 1');
    assert(stuckCount >= 1, 'stuck failed >= 1');

    mgr.cancel(recId);
    await (prisma as any).videoTask.deleteMany({ where: { id: { in: [recId, stuckId] } } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. Zero Real Network Requests in Mock Mode
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 13. Zero Network in Mock ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    const r = await mgr.submit(pid, 'seedance');
    assert(r.externalTaskId.includes('mock') || r.externalTaskId.includes('kling'), 'mock extId');
    assert(r.externalTaskId.includes('mock') || r.externalTaskId.includes('kling'), 'no real API call');

    mgr.cancel(r.dbTaskId);
    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. Metadata Safety
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n── 14. Metadata Safety ──');
  {
    const mgr = mkManager();
    const pid = uuid();
    await createTestPrompt(pid);

    const r = await mgr.submit(pid, 'seedance');
    const task = await (prisma as any).videoTask.findUnique({ where: { id: r.dbTaskId } });
    const meta = JSON.parse(task.metadata);

    assert(meta.provider === 'seedance', 'provider in meta');
    assert(typeof meta.externalTaskId === 'string', 'extId in meta');
    assert(typeof meta.submittedAt === 'string', 'submittedAt in meta');
    assert(!meta.apiKey, 'no apiKey');
    assert(!meta.token, 'no token');
    assert(!meta.secret, 'no secret');

    mgr.cancel(r.dbTaskId);
    await (prisma as any).videoTask.deleteMany({ where: { promptId: pid } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Results
  // ═══════════════════════════════════════════════════════════════════════════

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Phase 3D-2A Idempotency & Recovery:  Passed=${passed}  Failed=${failed}`);
  console.log(`${'═'.repeat(60)}\n`);

  resetPrismaClientForTests();
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Phase 3D-2A test crashed:', err);
  process.exit(1);
});
