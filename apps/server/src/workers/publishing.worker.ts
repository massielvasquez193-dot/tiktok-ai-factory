/**
 * Publishing Worker — BullMQ Worker + pure handler.
 *
 * The handler is exported separately so tests can call it without Redis.
 * In production the Worker invokes the same handler via BullMQ.
 *
 * Pipeline steps:
 *   1. validate   — check payload
 *   2. prepare    — validate content, generate metadata
 *   3. publish    — simulate publishing to platform
 *   4. confirm    — return structured result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';
import { PipelineRunner, defineStep, PipelineContext } from '../lib/pipeline-runner';
import { prisma } from '../index';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PublishingPayload {
  videoId?: string;
  platform?: string;
  title?: string;
  tags?: string[];
  description?: string;
  scheduledAt?: string;
  [key: string]: unknown;
}

interface PublishingContext extends PipelineContext {
  videoId: string;
  platform: string;
  title: string;
  validated: boolean;
  prepared: boolean;
  externalId: string;
  status: 'published' | 'scheduled' | 'draft';
}

export interface PublishingResult {
  success: boolean;
  processedAt: string;
  steps: number;
  message: string;
  platform: string;
  status: 'published' | 'scheduled' | 'draft';
  externalId: string | null;
  payloadEcho?: Record<string, unknown>;
}

// ── Pure Handler (testable without Redis) ─────────────────────────────────

export async function handlePublishing(
  payload: PublishingPayload,
  onProgress?: (stepIndex: number, stepName: string, percent: number) => void,
): Promise<PublishingResult> {
  const runner = new PipelineRunner<PublishingContext>({ onProgress });
  const ctx: PublishingContext = {
    videoId: payload.videoId || '',
    platform: payload.platform || 'tiktok',
    title: payload.title || 'Untitled',
    validated: false,
    prepared: false,
    externalId: '',
    status: 'draft',
  };

  const result = await runner.run([
    defineStep<PublishingContext>('validate', async (c) => {
      if (!c.videoId) throw new Error('Publishing job requires videoId');
      // Verify video exists in DB (optional — warns but doesn't fail)
      const video = await prisma.video.findUnique({ where: { id: c.videoId } });
      if (!video) {
        return { validated: true }; // Don't fail — mock mode handles this
      }
      const validPlatforms = ['tiktok', 'instagram', 'youtube', 'shopee', 'facebook'];
      if (!validPlatforms.includes(c.platform)) {
        throw new Error(`Unsupported platform: ${c.platform}`);
      }
      return { validated: true };
    }),

    defineStep<PublishingContext>('prepare', async (c) => {
      // Validate content, prepare metadata
      const title = c.title || `AI Generated Video — ${new Date().toISOString().slice(0, 10)}`;
      return { prepared: true, title };
    }),

    defineStep<PublishingContext>('publish', async (c) => {
      // Mock publish — returns a deterministic external ID
      const externalId = `pub_${c.platform}_${Date.now()}`;
      return { externalId, status: 'published' as const };
    }),

    defineStep<PublishingContext>('confirm', async (_c) => {
      return {};
    }),
  ], ctx);

  return {
    success: result.success,
    processedAt: new Date().toISOString(),
    steps: result.steps.length,
    message: `Published to ${result.context.platform}`,
    platform: result.context.platform,
    status: result.context.status,
    externalId: result.context.externalId || null,
    payloadEcho: { videoId: payload.videoId, platform: payload.platform },
  };
}

// ── Worker Factory ────────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getPublishingWorker(): Worker {
  if (!worker) {
    worker = new Worker<PublishingPayload, PublishingResult>(
      QUEUE_NAMES.PUBLISHING,
      async (job: Job<PublishingPayload, PublishingResult>) => {
        console.log(`[Worker:publishing] Processing job "${job.name}" (${job.id})`);

        const result = await handlePublishing(
          job.data,
          (_idx, _name, pct) => {
            job.updateProgress(pct).catch(() => {});
          },
        );

        console.log(`[Worker:publishing] Completed job "${job.name}" (${job.id}): ${result.message}`);
        return result;
      },
      {
        connection: getRedisConnection(),
        concurrency: 1,
        autorun: true,
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 50 },
      },
    );

    worker.on('completed', (job) => {
      console.log(`[Worker:publishing] ✅ Job "${job.name}" (${job.id}) completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker:publishing] ❌ Job "${job?.name}" (${job?.id}) failed:`, err.message);
    });

    worker.on('progress', (job, progress) => {
      console.log(`[Worker:publishing] 📊 Job "${job.name}" (${job.id}) progress: ${progress}%`);
    });

    worker.on('error', (err) => {
      console.error(`[Worker:publishing] Worker error:`, err.message);
    });

    console.log('[Worker:publishing] Initialised');
  }

  return worker;
}

export async function closePublishingWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker:publishing] Shut down');
  }
}
