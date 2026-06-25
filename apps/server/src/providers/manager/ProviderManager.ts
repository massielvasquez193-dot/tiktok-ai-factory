import { IVideoProvider, ProviderName, CreateTaskInput } from '../interfaces/IVideoProvider';
import { SeedanceProvider } from '../seedance/SeedanceProvider';
import { KlingProvider } from '../kling/KlingProvider';
import { VeoProvider } from '../veo/VeoProvider';
import { prisma } from '../../lib/prisma';
import { v4 as uuid } from 'uuid';
import { serializeMetadata } from '../../lib/video-downloader';
import { executeWithResilience, ProviderError, resetAllCircuits } from '../resilience';
import { logStartupAudit } from '../../lib/provider-mode';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubmitOptions {
  /** Stable idempotency key — prevents duplicate createTask calls. */
  idempotencyKey?: string;
  /** When true, resume polling for an existing task rather than creating new. */
  resumeExisting?: boolean;
}

/** Live (non-terminal) statuses — tasks that are still in-flight. */
const LIVE_STATUSES = ['pending', 'submitted', 'processing'];

// ── Helper: is this provider capable of real API calls? ──────────────────────

function isRealProvider(provider: IVideoProvider): boolean {
  const p = provider as any;
  if (typeof p.realReady === 'boolean') return p.realReady === true;
  if (typeof p.mode === 'string') return p.mode === 'real';
  return false;
}

// ── Helper: compute a stable idempotency key ─────────────────────────────────

function idemKey(promptId: string, provider: string): string {
  return `ik:${provider}:${promptId}`;
}

// ── Helper: build submission metadata (no secrets) ───────────────────────────

function buildMetadata(provider: string, externalTaskId: string, submittedAt: Date): string {
  return serializeMetadata({
    provider,
    externalTaskId,
    submittedAt: submittedAt.toISOString(),
    lastPolledAt: submittedAt.toISOString(),
    attempt: 1,
  });
}

function bumpMetadata(existingMeta: string, attempt: number): string {
  try {
    const m = JSON.parse(existingMeta);
    return serializeMetadata({ ...m, lastPolledAt: new Date().toISOString(), attempt });
  } catch {
    return serializeMetadata({ lastPolledAt: new Date().toISOString(), attempt });
  }
}

// ── ProviderManager ──────────────────────────────────────────────────────────

export class ProviderManager {
  private providers = new Map<ProviderName, IVideoProvider>();
  /** In-memory poller handles — DB is the source of truth for recovery. */
  private pollers = new Map<string, NodeJS.Timeout>();

  private static _instance: ProviderManager;

  static get instance(): ProviderManager {
    if (!this._instance) {
      this._instance = new ProviderManager();
      this._instance.register(new SeedanceProvider({
        apiKey: process.env.SEEDANCE_API_KEY,
        baseUrl: process.env.SEEDANCE_BASE_URL,
      }));
      this._instance.register(new KlingProvider({
        apiKey: process.env.KLING_API_KEY,
        baseUrl: process.env.KLING_BASE_URL,
      }));
      this._instance.register(new VeoProvider({
        apiKey: process.env.VEO_API_KEY,
        baseUrl: process.env.VEO_BASE_URL,
      }));
      logStartupAudit();
    }
    return this._instance;
  }

  register(provider: IVideoProvider): void { this.providers.set(provider.name, provider); }
  get(name: ProviderName): IVideoProvider | undefined { return this.providers.get(name); }

  list(): { name: ProviderName; model: string; baseUrl: string; mode?: string; realReady?: boolean }[] {
    return Array.from(this.providers.values()).map(p => {
      const ext = p as any;
      return { name: p.name, model: p.config.model, baseUrl: p.config.baseUrl, mode: ext.mode, realReady: ext.realReady };
    });
  }

  get activeCount(): number { return this.pollers.size; }
  static resetResilience(): void { resetAllCircuits(); }

  // ── Submit (idempotent) ──────────────────────────────────────────────────

  /**
   * Submit a prompt to its provider and start polling.
   *
   * Idempotent: calling submit() with the same promptId+providerName will
   * return the existing task (if still live) rather than creating a duplicate.
   */
  async submit(
    promptId: string,
    providerName: ProviderName,
    opts?: SubmitOptions,
  ): Promise<{ dbTaskId: string; externalTaskId: string }> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);

    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: { storyboard: { include: { script: { include: { product: true } } } } },
    });
    if (!prompt) throw new Error('Prompt not found');

    // ═══ Idempotency guard ═══════════════════════════════════════════════════
    // Check whether a live task already exists for this promptId + provider.
    const existing = await prisma.videoTask.findFirst({
      where: { promptId, provider: providerName, status: { in: LIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      console.log(`[ProviderManager] Found existing live task ${existing.id} (${existing.status}) for prompt ${promptId}`);
      // If it already has an externalTaskId and is in 'processing', resume polling
      if (existing.externalTaskId && existing.status === 'processing' && !this.pollers.has(existing.id)) {
        this._startPolling(existing.id, existing.externalTaskId, provider, existing.metadata);
      }
      // If stuck in 'submitted' without externalTaskId, we cannot resume —
      // the remote task was never linked. Mark as failed for safety.
      if (existing.status === 'submitted' && !existing.externalTaskId) {
        const age = Date.now() - existing.createdAt.getTime();
        if (age > 300_000) { // 5 min grace period
          await prisma.videoTask.update({
            where: { id: existing.id },
            data: { status: 'failed', error: 'Stuck in submitted without externalTaskId — resubmit required' },
          });
          // Fall through to create a new task
        } else {
          return { dbTaskId: existing.id, externalTaskId: '' };
        }
      } else {
        return { dbTaskId: existing.id, externalTaskId: existing.externalTaskId || '' };
      }
    }

    // ═══ Create new task ═════════════════════════════════════════════════════
    const dbTaskId = uuid();
    await prisma.videoTask.create({
      data: {
        id: dbTaskId, promptId, model: providerName, provider: providerName,
        status: 'pending', progress: 0,
      },
    });

    try {
      // Atomic CAS: only proceed if still 'pending' (prevents duplicate processing)
      const cas = await prisma.videoTask.updateMany({
        where: { id: dbTaskId, status: 'pending' },
        data: { status: 'submitted', progress: 5, startedAt: new Date() },
      });
      if (cas.count === 0) {
        throw new Error('Task already claimed by another worker');
      }

      const isReal = isRealProvider(provider);
      const result = await executeWithResilience({
        provider: providerName,
        operation: 'createTask',
        fn: () => provider.createTask({
          prompt: prompt.prompt,
          negativePrompt: prompt.negativePrompt,
          duration: 5,
          aspectRatio: '9:16',
          resolution: '720p',
        }),
        idempotencyKey: idemKey(promptId, providerName),
        bypassResilience: !isReal,
        retry: { maxAttempts: 3 },
        onAttempt: (attempt, delay) => {
          console.log(`[ProviderManager] ${providerName} createTask attempt ${attempt} (delay=${delay}ms)`);
        },
      });

      if (!result.success || !result.data) {
        throw result.error || new Error('Provider resilience failed without error');
      }

      const { externalTaskId } = result.data;

      // Persist externalTaskId IMMEDIATELY (before polling) — closes crash window
      const submittedAt = new Date();
      await prisma.videoTask.update({
        where: { id: dbTaskId },
        data: {
          externalTaskId, status: 'processing', progress: 10,
          metadata: buildMetadata(providerName, externalTaskId, submittedAt),
        },
      });

      this._startPolling(dbTaskId, externalTaskId, provider);
      return { dbTaskId, externalTaskId };
    } catch (err: any) {
      await prisma.videoTask.update({
        where: { id: dbTaskId },
        data: { status: 'failed', error: `Submit: ${err.message}` },
      });
      throw err;
    }
  }

  // ── Batch submit ─────────────────────────────────────────────────────────

  async submitBatch(promptIds: string[]): Promise<{ dbTaskId: string }[]> {
    const results = [];
    for (const pid of promptIds) {
      const prompt = await prisma.prompt.findUnique({ where: { id: pid } });
      if (!prompt) continue;
      const providerName = (prompt.model || 'seedance') as ProviderName;
      const r = await this.submit(pid, providerName);
      results.push(r);
    }
    return results;
  }

  // ── Resume existing task (recovery path) ─────────────────────────────────

  /**
   * Resume polling for an existing task that was interrupted (e.g. server restart).
   * Never calls createTask — only recovers from an already-persisted externalTaskId.
   */
  async resumeTask(dbTaskId: string): Promise<boolean> {
    const task = await prisma.videoTask.findUnique({ where: { id: dbTaskId } });
    if (!task) return false;
    if (!LIVE_STATUSES.includes(task.status)) return false;
    if (!task.externalTaskId) return false;

    const provider = this.providers.get(task.provider as ProviderName);
    if (!provider) return false;

    console.log(`[ProviderManager] Resuming task ${dbTaskId} (${task.provider}/${task.externalTaskId})`);
    this._startPolling(task.id, task.externalTaskId, provider, task.metadata);
    return true;
  }

  // ── Startup recovery: scan for stale tasks ───────────────────────────────

  /**
   * Scan the database for tasks stuck in LIVE statuses and recover or fail them.
   * Called once at server startup.
   */
  static async recoverStaleTasks(manager: ProviderManager): Promise<{ recovered: number; failed: number }> {
    let recovered = 0;
    let failed = 0;

    try {
      // Find all tasks stuck in live statuses older than 2× pollInterval
      const staleThreshold = new Date(Date.now() - 120_000); // 2 min — ample for any inflight
      const stale = await prisma.videoTask.findMany({
        where: {
          status: { in: LIVE_STATUSES },
          updatedAt: { lt: staleThreshold },
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const task of stale) {
        try {
          if (task.externalTaskId) {
            // Has externalTaskId → can resume polling
            const ok = await manager.resumeTask(task.id);
            if (ok) { recovered++; }
          } else if (task.status === 'submitted' || task.status === 'pending') {
            // No externalTaskId and was being submitted → mark failed
            await prisma.videoTask.update({
              where: { id: task.id, status: { in: ['pending', 'submitted'] } },
              data: { status: 'failed', error: 'Server restart: task lost during submission — resubmit required' },
            });
            failed++;
          } else if (task.status === 'processing') {
            // processing without externalTaskId should not happen, but mark failed
            await prisma.videoTask.update({
              where: { id: task.id, status: 'processing' },
              data: { status: 'failed', error: 'Server restart: processing but missing externalTaskId' },
            });
            failed++;
          }
        } catch (e: any) {
          console.error(`[Recovery] Failed to recover task ${task.id}: ${e.message}`);
        }
      }

      console.log(`[Recovery] Scanned ${stale.length} stale tasks → recovered=${recovered} failed=${failed}`);
    } catch (err: any) {
      console.error('[Recovery] Stale task scan failed:', err.message);
    }

    return { recovered, failed };
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  cancel(dbTaskId: string): boolean {
    const interval = this.pollers.get(dbTaskId);
    if (interval) { clearInterval(interval); this.pollers.delete(dbTaskId); return true; }
    return false;
  }

  // ── Polling (idempotent re-entry safe) ────────────────────────────────────

  private _startPolling(
    dbTaskId: string,
    externalTaskId: string,
    provider: IVideoProvider,
    existingMetadata?: string,
  ): void {
    // Idempotent: don't start a second poller for the same task
    if (this.pollers.has(dbTaskId)) return;

    const timeout = setTimeout(() => {
      this.cancel(dbTaskId);
      prisma.videoTask.update({
        where: { id: dbTaskId },
        data: { status: 'failed', error: 'Timed out after 10min' },
      }).catch(() => {});
    }, provider.config.maxWaitMs);

    const interval = setInterval(async () => {
      try {
        const isReal = isRealProvider(provider);
        const currentTask = await prisma.videoTask.findUnique({ where: { id: dbTaskId } });
        const metaAttempt = currentTask?.metadata
          ? (() => { try { return JSON.parse(currentTask.metadata).attempt || 1; } catch { return 1; } })()
          : 1;

        // Poll status with resilience
        const statusResult = await executeWithResilience({
          provider: provider.name,
          operation: 'getStatus',
          fn: () => provider.getStatus(externalTaskId),
          bypassResilience: !isReal,
          retry: { maxAttempts: 2, baseDelayMs: 300, maxDelayMs: 2000 },
          idempotencyKey: externalTaskId,
        });

        if (!statusResult.success || !statusResult.data) {
          clearInterval(interval); clearTimeout(timeout); this.pollers.delete(dbTaskId);
          await prisma.videoTask.update({
            where: { id: dbTaskId, status: 'processing' },
            data: { status: 'failed', error: `Poll error: ${statusResult.error?.toSanitized()}` },
          });
          return;
        }
        const status = statusResult.data;

        // Update metadata on each poll cycle
        const meta = currentTask?.metadata ? bumpMetadata(currentTask.metadata, metaAttempt + 1) : buildMetadata(provider.name, externalTaskId, new Date());

        if (status.status === 'completed') {
          clearInterval(interval); clearTimeout(timeout); this.pollers.delete(dbTaskId);

          const dlResult = await executeWithResilience({
            provider: provider.name,
            operation: 'downloadResult',
            fn: () => provider.downloadResult(status.videoUrl, `output/videos/${provider.name}/${dbTaskId}.mp4`),
            bypassResilience: !isReal,
            retry: { maxAttempts: 3, baseDelayMs: 1000 },
            idempotencyKey: externalTaskId,
          });

          const dl = dlResult.success && dlResult.data ? dlResult.data : { localPath: status.videoUrl, sizeBytes: 0 };

          await prisma.videoTask.update({
            where: { id: dbTaskId, status: 'processing' },
            data: {
              status: 'completed', progress: 100, videoUrl: dl.localPath,
              thumbnailUrl: status.thumbnailUrl, duration: status.duration,
              completedAt: new Date(), metadata: serializeMetadata({ ...JSON.parse(meta), completedAt: new Date().toISOString() }),
            },
          });
        } else if (status.status === 'failed') {
          clearInterval(interval); clearTimeout(timeout); this.pollers.delete(dbTaskId);
          await prisma.videoTask.update({
            where: { id: dbTaskId, status: 'processing' },
            data: { status: 'failed', progress: status.progress, error: status.error, metadata: meta },
          });
        } else {
          await prisma.videoTask.update({
            where: { id: dbTaskId, status: 'processing' },
            data: { progress: Math.max(10, status.progress), metadata: meta },
          });
        }
      } catch (err: any) {
        clearInterval(interval); clearTimeout(timeout); this.pollers.delete(dbTaskId);
        const msg = err instanceof ProviderError ? err.toSanitized() : err.message;
        await prisma.videoTask.update({
          where: { id: dbTaskId, status: 'processing' },
          data: { status: 'failed', error: `Poll: ${msg}` },
        }).catch(() => {});
      }
    }, provider.config.pollIntervalMs);

    this.pollers.set(dbTaskId, interval);
    console.log(`[ProviderManager] Polling started for ${dbTaskId} (${provider.name}/${externalTaskId})`);
  }
}
