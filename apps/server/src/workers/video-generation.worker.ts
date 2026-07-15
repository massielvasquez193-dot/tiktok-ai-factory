/**
 * Video Generation Worker — BullMQ Worker + pure handler.
 *
 * The handler is exported separately so tests can call it without Redis.
 * In production the Worker invokes the same handler via BullMQ.
 *
 * Pipeline steps:
 *   1. validate  — check payload and create DB records if needed
 *   2. generate  — submit prompts to ProviderManager (mock or real)
 *   3. finalize  — update completion metadata
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';
import { PipelineRunner, defineStep, PipelineContext, PipelineResult } from '../lib/pipeline-runner';
import { ProviderManager } from '../providers/manager/ProviderManager';
import { prisma } from '../lib/prisma';

// ── Types ──────────────────────────────────────────────────────────────────

export interface VideoGenPayload {
  promptId?: string;
  taskId?: string;           // Pre-created task (credits already charged via VideoTaskService)
  message?: string;
  [key: string]: unknown;
}

export interface VideoGenContext extends PipelineContext {
  promptId?: string;
  taskId?: string;
  validated: boolean;
  taskCount: number;
  finalStatus: string;
}

export interface VideoGenResult {
  success: boolean;
  processedAt: string;
  steps: number;
  message: string;
  taskCount: number;
  payloadEcho?: Record<string, unknown>;
}

// ── Pure Handler (testable without Redis) ─────────────────────────────────

export async function handleVideoGeneration(
  payload: VideoGenPayload,
  onProgress?: (stepIndex: number, stepName: string, percent: number) => void,
): Promise<VideoGenResult> {
  const runner = new PipelineRunner<VideoGenContext>({ onProgress });
  const ctx: VideoGenContext = {
    promptId: payload.promptId,
    validated: false,
    taskCount: 0,
    finalStatus: 'completed',
  };

  const result: PipelineResult<VideoGenContext> = await runner.run([
    defineStep<VideoGenContext>('validate', async (c) => {
      // If a promptId is provided, verify it exists
      if (c.promptId) {
        const prompt = await prisma.prompt.findUnique({ where: { id: c.promptId } });
        if (!prompt) throw new Error(`Prompt not found: ${c.promptId}`);
      }
      return { validated: true };
    }),

    defineStep<VideoGenContext>('generate', async (c) => {
      let count = 0;
      if (c.taskId) {
        // Pre-created task (credits already charged) — use submitTask
        try { await ProviderManager.instance.submitTask(c.taskId); count = 1; } catch {}
      } else if (c.promptId) {
        // Legacy: submit by promptId (no credits context — backward compat)
        try { await ProviderManager.instance.submit(c.promptId, 'seedance'); count = 1; } catch {}
      }
      // If no specific ID, find recent prompts and submit them
      if (count === 0) {
        const prompts = await prisma.prompt.findMany({ take: 2, orderBy: { createdAt: 'desc' } });
        for (const p of prompts) {
          // Legacy path — credits may not be charged
          try { await ProviderManager.instance.submit(p.id, 'seedance'); count++; } catch {}
        }
      }
      return { taskCount: count, finalStatus: count > 0 ? 'completed' : 'skipped' };
    }),

    defineStep<VideoGenContext>('finalize', async (c) => {
      return {
        finalStatus: c.taskCount > 0 ? 'completed' : 'skipped',
      };
    }),
  ], ctx);

  return {
    success: result.success,
    processedAt: new Date().toISOString(),
    steps: result.steps.length,
    message: `Generated ${result.context.taskCount} video task(s)`,
    taskCount: result.context.taskCount,
    payloadEcho: { ...payload },
  };
}

// ── Worker Factory ────────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getVideoGenerationWorker(): Worker {
  if (!worker) {
    worker = new Worker<VideoGenPayload, VideoGenResult>(
      QUEUE_NAMES.VIDEO_GENERATION,
      async (job: Job<VideoGenPayload, VideoGenResult>) => {
        console.log(`[Worker:video-generation] Processing job "${job.name}" (${job.id})`);

        const result = await handleVideoGeneration(
          job.data,
          (_idx, _name, pct) => {
            job.updateProgress(pct).catch(() => {});
          },
        );

        console.log(`[Worker:video-generation] Completed job "${job.name}" (${job.id}): ${result.message}`);
        return result;
      },
      {
        connection: getRedisConnection(),
        concurrency: 2,
        autorun: true,
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 50 },
      },
    );

    worker.on('completed', (job) => {
      console.log(`[Worker:video-generation] ✅ Job "${job.name}" (${job.id}) completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker:video-generation] ❌ Job "${job?.name}" (${job?.id}) failed:`, err.message);
    });

    worker.on('progress', (job, progress) => {
      console.log(`[Worker:video-generation] 📊 Job "${job.name}" (${job.id}) progress: ${progress}%`);
    });

    worker.on('error', (err) => {
      console.error(`[Worker:video-generation] Worker error:`, err.message);
    });

    console.log('[Worker:video-generation] Initialised');
  }

  return worker;
}

export async function closeVideoGenerationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker:video-generation] Shut down');
  }
}
