/**
 * Video Generation Worker — Example BullMQ Worker.
 *
 * Processes jobs from the "video-generation" queue.
 * This worker is deterministic — it does NOT call any external / paid API.
 *
 * Supported job names:
 *  - health-check  → returns { success: true, timestamp } after simulated progress
 *  - test          → alias for health-check
 *  - default       → completes with a safe no-op result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';

// ── Job Data / Result Types ─────────────────────────────────────────────

export interface VideoGenPayload {
  message?: string;
  [key: string]: unknown;
}

export interface VideoGenResult {
  success: boolean;
  processedAt: string;
  steps: number;
  message: string;
  payloadEcho?: Record<string, unknown>;
}

// ── Worker Factory ──────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getVideoGenerationWorker(): Worker {
  if (!worker) {
    worker = new Worker<VideoGenPayload, VideoGenResult>(
      QUEUE_NAMES.VIDEO_GENERATION,
      async (job: Job<VideoGenPayload, VideoGenResult>) => {
        const startTime = Date.now();
        const steps = 4;

        console.log(`[Worker:video-generation] Processing job "${job.name}" (${job.id})`);

        // Simulate deterministic progress
        for (let i = 1; i <= steps; i++) {
          await job.updateProgress(Math.round((i / steps) * 100));
          // small deterministic delay to simulate real work
          await new Promise((r) => setTimeout(r, 50));
        }

        const elapsed = Date.now() - startTime;

        const result: VideoGenResult = {
          success: true,
          processedAt: new Date().toISOString(),
          steps,
          message: `Job "${job.name}" processed in ${elapsed}ms`,
          payloadEcho: { ...job.data },
        };

        console.log(`[Worker:video-generation] Completed job "${job.name}" (${job.id}) in ${elapsed}ms`);
        return result;
      },
      {
        connection: getRedisConnection(),
        concurrency: 2,
        autorun: true,
        removeOnComplete: { age: 3600, count: 100 }, // keep last 100 for 1 hour
        removeOnFail: { age: 86400, count: 50 },
      },
    );

    // ── Worker Events ──────────────────────────────────────────────────

    worker.on('completed', (job, result) => {
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

// ── Graceful Shutdown ───────────────────────────────────────────────────

export async function closeVideoGenerationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker:video-generation] Shut down');
  }
}
