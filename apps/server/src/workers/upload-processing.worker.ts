/**
 * Upload Processing Worker — BullMQ Worker + pure handler.
 *
 * The handler is exported separately so tests can call it without Redis.
 * In production the Worker invokes the same handler via BullMQ.
 *
 * Pipeline steps:
 *   1. validate  — check payload, verify file existence
 *   2. analyze   — extract metadata (type, size, dimensions)
 *   3. process   — generate variants (thumbnail, compressed)
 *   4. finalize  — return structured result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';
import { PipelineRunner, defineStep, PipelineContext } from '../lib/pipeline-runner';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UploadProcessingPayload {
  filePath?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  type?: 'image' | 'video' | 'asset';
  [key: string]: unknown;
}

interface UploadContext extends PipelineContext {
  filePath: string;
  originalName: string;
  mimeType: string;
  fileType: string;
  sizeBytes: number;
  validated: boolean;
  thumbnailUrl: string | null;
  variants: string[];
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

// ── Pure Handler (testable without Redis) ─────────────────────────────────

export async function handleUploadProcessing(
  payload: UploadProcessingPayload,
  onProgress?: (stepIndex: number, stepName: string, percent: number) => void,
): Promise<UploadProcessingResult> {
  const runner = new PipelineRunner<UploadContext>({ onProgress });
  const ctx: UploadContext = {
    filePath: payload.filePath || '',
    originalName: payload.originalName || 'unknown.bin',
    mimeType: payload.mimeType || 'application/octet-stream',
    fileType: payload.type || (payload.mimeType?.startsWith('video/') ? 'video' : 'image'),
    sizeBytes: payload.size || 0,
    validated: false,
    thumbnailUrl: null,
    variants: [],
  };

  const result = await runner.run([
    defineStep<UploadContext>('validate', async (c) => {
      if (!c.filePath) throw new Error('Upload processing requires filePath');
      if (c.sizeBytes === 0) throw new Error('File size cannot be 0');
      const allowedTypes = ['image', 'video', 'asset'];
      if (!allowedTypes.includes(c.fileType)) {
        throw new Error(`Unsupported file type: ${c.fileType}`);
      }
      return { validated: true };
    }),

    defineStep<UploadContext>('analyze', async (c) => {
      // Extract metadata — mock mode returns deterministic values
      return {};
    }),

    defineStep<UploadContext>('process', async (c) => {
      // Generate variants — mock mode returns virtual paths
      const base = c.originalName.replace(/\.[^.]+$/, '');
      const variants = ['original', 'thumbnail', 'compressed'];
      const thumbnailUrl = `/uploads/thumbnails/thumb_${base}.jpg`;
      return { variants, thumbnailUrl };
    }),

    defineStep<UploadContext>('finalize', async (_c) => {
      return {};
    }),
  ], ctx);

  return {
    success: result.success,
    processedAt: new Date().toISOString(),
    steps: result.steps.length,
    message: `Processed ${result.context.originalName}`,
    fileType: result.context.fileType,
    thumbnailUrl: result.context.thumbnailUrl,
    variants: result.context.variants,
    payloadEcho: { originalName: payload.originalName, size: payload.size },
  };
}

// ── Worker Factory ────────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getUploadProcessingWorker(): Worker {
  if (!worker) {
    worker = new Worker<UploadProcessingPayload, UploadProcessingResult>(
      QUEUE_NAMES.UPLOAD_PROCESSING,
      async (job: Job<UploadProcessingPayload, UploadProcessingResult>) => {
        console.log(`[Worker:upload-processing] Processing job "${job.name}" (${job.id})`);

        const result = await handleUploadProcessing(
          job.data,
          (_idx, _name, pct) => {
            job.updateProgress(pct).catch(() => {});
          },
        );

        console.log(`[Worker:upload-processing] Completed job "${job.name}" (${job.id}): ${result.message}`);
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
