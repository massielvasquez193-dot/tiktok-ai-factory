/**
 * TTS Worker — Processes text-to-speech jobs from the "tts" queue.
 *
 * This worker is deterministic — it does NOT call any external / paid TTS API.
 * Real TTS integration will be wired in Phase 3.
 *
 * Supported job names:
 *  - tts-generate   → simulates TTS generation with deterministic progress
 *  - health-check   → returns { success: true } after simulated work
 *  - default        → completes with a safe no-op result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';

// ── Job Data / Result Types ─────────────────────────────────────────────

export interface TtsPayload {
  text?: string;
  language?: string;
  engine?: string;
  voice?: string;
  [key: string]: unknown;
}

export interface TtsResult {
  success: boolean;
  processedAt: string;
  steps: number;
  message: string;
  audioUrl: string | null;
  duration: number;
  payloadEcho?: Record<string, unknown>;
}

// ── Worker Factory ──────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getTtsWorker(): Worker {
  if (!worker) {
    worker = new Worker<TtsPayload, TtsResult>(
      QUEUE_NAMES.TTS,
      async (job: Job<TtsPayload, TtsResult>) => {
        const startTime = Date.now();
        const steps = 3;

        console.log(`[Worker:tts] Processing job "${job.name}" (${job.id})`);

        // Simulate deterministic TTS generation
        for (let i = 1; i <= steps; i++) {
          await job.updateProgress(Math.round((i / steps) * 100));
          await new Promise((r) => setTimeout(r, 50));
        }

        const elapsed = Date.now() - startTime;

        const result: TtsResult = {
          success: true,
          processedAt: new Date().toISOString(),
          steps,
          message: `TTS "${job.name}" processed in ${elapsed}ms`,
          audioUrl: `/output/audio/tts_${job.id}.mp3`,
          duration: Math.round(elapsed / 100) / 10,
          payloadEcho: { ...job.data },
        };

        console.log(`[Worker:tts] Completed job "${job.name}" (${job.id}) in ${elapsed}ms`);
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
      console.log(`[Worker:tts] ✅ Job "${job.name}" (${job.id}) completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker:tts] ❌ Job "${job?.name}" (${job?.id}) failed:`, err.message);
    });

    worker.on('progress', (job, progress) => {
      console.log(`[Worker:tts] 📊 Job "${job.name}" (${job.id}) progress: ${progress}%`);
    });

    worker.on('error', (err) => {
      console.error(`[Worker:tts] Worker error:`, err.message);
    });

    console.log('[Worker:tts] Initialised');
  }

  return worker;
}

export async function closeTtsWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker:tts] Shut down');
  }
}
