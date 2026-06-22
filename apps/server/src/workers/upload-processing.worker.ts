/**
 * Upload Processing Worker — Processes file upload jobs from the "upload-processing" queue.
 *
 * This worker is deterministic — it does NOT call any external API.
 * Real image/video processing (thumbnails, transcoding) will be wired in Phase 3.
 *
 * Supported job names:
 *  - process-image    → simulates image processing (resize, thumbnail)
 *  - process-video    → simulates video processing (transcode, extract frames)
 *  - health-check     → returns { success: true } after simulated work
 *  - default          → completes with a safe no-op result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';

// ── Job Data / Result Types ─────────────────────────────────────────────

export interface UploadProcessingPayload {
  filePath?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  type?: 'image' | 'video' | 'asset';
  [key: string]: unknown;
}

export interface UploadProcessingResult {
  success: boolean;
  processedAt: string;
  steps: number;
  message: string;
  fileType: string;
  thumbnailUrl: string | null;
  variants: string[];
  payloadEcho?: Record<string, unknown>;
}

// ── Worker Factory ──────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getUploadProcessingWorker(): Worker {
  if (!worker) {
    worker = new Worker<UploadProcessingPayload, UploadProcessingResult>(
      QUEUE_NAMES.UPLOAD_PROCESSING,
      async (job: Job<UploadProcessingPayload, UploadProcessingResult>) => {
        const startTime = Date.now();
        const steps = 3;

        console.log(`[Worker:upload-processing] Processing job "${job.name}" (${job.id})`);

        // Simulate deterministic file processing
        for (let i = 1; i <= steps; i++) {
          await job.updateProgress(Math.round((i / steps) * 100));
          await new Promise((r) => setTimeout(r, 50));
        }

        const elapsed = Date.now() - startTime;
        const fileType = (job.data.type || job.data.mimeType || 'image') as string;

        const result: UploadProcessingResult = {
          success: true,
          processedAt: new Date().toISOString(),
          steps,
          message: `Processed ${job.data.originalName || 'file'} in ${elapsed}ms`,
          fileType,
          thumbnailUrl: job.data.originalName
            ? `/uploads/thumbnails/thumb_${job.data.originalName}`
            : null,
          variants: ['original', 'thumbnail', 'compressed'],
          payloadEcho: { ...job.data },
        };

        console.log(`[Worker:upload-processing] Completed job "${job.name}" (${job.id}) in ${elapsed}ms`);
        return result;
      },
      {
        connection: getRedisConnection(),
        concurrency: 3,
        autorun: true,
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 50 },
      },
    );

    worker.on('completed', (job) => {
      console.log(`[Worker:upload-processing] ✅ Job "${job.name}" (${job.id}) completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker:upload-processing] ❌ Job "${job?.name}" (${job?.id}) failed:`, err.message);
    });

    worker.on('progress', (job, progress) => {
      console.log(`[Worker:upload-processing] 📊 Job "${job.name}" (${job.id}) progress: ${progress}%`);
    });

    worker.on('error', (err) => {
      console.error(`[Worker:upload-processing] Worker error:`, err.message);
    });

    console.log('[Worker:upload-processing] Initialised');
  }

  return worker;
}

export async function closeUploadProcessingWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker:upload-processing] Shut down');
  }
}
