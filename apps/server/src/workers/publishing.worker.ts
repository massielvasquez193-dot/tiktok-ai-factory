/**
 * Publishing Worker — Processes publishing/distribution jobs from the "publishing" queue.
 *
 * This worker is deterministic — it does NOT call any external API.
 * Real TikTok/Shopee publishing integration will be wired in Phase 3.
 *
 * Supported job names:
 *  - publish-video   → simulates video publishing with deterministic progress
 *  - health-check    → returns { success: true } after simulated work
 *  - default         → completes with a safe no-op result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';

// ── Job Data / Result Types ─────────────────────────────────────────────

export interface PublishingPayload {
  videoId?: string;
  platform?: string;
  title?: string;
  tags?: string[];
  description?: string;
  scheduledAt?: string;
  [key: string]: unknown;
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

// ── Worker Factory ──────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getPublishingWorker(): Worker {
  if (!worker) {
    worker = new Worker<PublishingPayload, PublishingResult>(
      QUEUE_NAMES.PUBLISHING,
      async (job: Job<PublishingPayload, PublishingResult>) => {
        const startTime = Date.now();
        const steps = 5;

        console.log(`[Worker:publishing] Processing job "${job.name}" (${job.id})`);

        // Simulate deterministic publishing workflow
        // Step 1-2: validate content, Step 3-4: upload, Step 5: confirm
        for (let i = 1; i <= steps; i++) {
          await job.updateProgress(Math.round((i / steps) * 100));
          await new Promise((r) => setTimeout(r, 50));
        }

        const elapsed = Date.now() - startTime;
        const platform = (job.data.platform || 'tiktok') as string;

        const result: PublishingResult = {
          success: true,
          processedAt: new Date().toISOString(),
          steps,
          message: `Published to ${platform} in ${elapsed}ms`,
          platform,
          status: 'published',
          externalId: `mock_pub_${job.id}`,
          payloadEcho: { ...job.data },
        };

        console.log(`[Worker:publishing] Completed job "${job.name}" (${job.id}) in ${elapsed}ms`);
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
