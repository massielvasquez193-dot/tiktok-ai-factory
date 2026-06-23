/**
 * TTS Worker — BullMQ Worker + pure handler.
 *
 * The handler is exported separately so tests can call it without Redis.
 * In production the Worker invokes the same handler via BullMQ.
 *
 * Pipeline steps:
 *   1. validate  — check payload
 *   2. synthesize — simulate or run TTS generation
 *   3. finalize  — return structured audio metadata
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';
import { PipelineRunner, defineStep, PipelineContext } from '../lib/pipeline-runner';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TtsPayload {
  text?: string;
  language?: string;
  engine?: string;
  voice?: string;
  [key: string]: unknown;
}

interface TtsContext extends PipelineContext {
  text: string;
  language: string;
  engine: string;
  validated: boolean;
  audioUrl: string;
  duration: number;
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

// ── Pure Handler (testable without Redis) ─────────────────────────────────

export async function handleTts(
  payload: TtsPayload,
  onProgress?: (stepIndex: number, stepName: string, percent: number) => void,
): Promise<TtsResult> {
  const runner = new PipelineRunner<TtsContext>({ onProgress });
  const ctx: TtsContext = {
    text: payload.text || '',
    language: payload.language || 'en',
    engine: payload.engine || 'openai',
    validated: false,
    audioUrl: '',
    duration: 0,
  };

  const result = await runner.run([
    defineStep<TtsContext>('validate', async (c) => {
      if (!c.text || c.text.trim().length === 0) {
        throw new Error('TTS job requires non-empty text');
      }
      if (!['en', 'ms', 'th', 'fil', 'es'].includes(c.language)) {
        throw new Error(`Unsupported TTS language: ${c.language}`);
      }
      return { validated: true };
    }),

    defineStep<TtsContext>('synthesize', async (c) => {
      // In mock mode, generate a deterministic audio URL
      const duration = Math.max(1, Math.round(c.text.length / 15));
      const audioUrl = `/output/audio/tts_${Date.now()}.mp3`;
      return { audioUrl, duration };
    }),

    defineStep<TtsContext>('finalize', async (_c) => {
      return {};
    }),
  ], ctx);

  return {
    success: result.success,
    processedAt: new Date().toISOString(),
    steps: result.steps.length,
    message: `TTS synthesized in ${result.context.duration}s`,
    audioUrl: result.context.audioUrl || null,
    duration: result.context.duration,
    payloadEcho: { language: payload.language, engine: payload.engine },
  };
}

// ── Worker Factory ────────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getTtsWorker(): Worker {
  if (!worker) {
    worker = new Worker<TtsPayload, TtsResult>(
      QUEUE_NAMES.TTS,
      async (job: Job<TtsPayload, TtsResult>) => {
        console.log(`[Worker:tts] Processing job "${job.name}" (${job.id})`);

        const result = await handleTts(
          job.data,
          (_idx, _name, pct) => {
            job.updateProgress(pct).catch(() => {});
          },
        );

        console.log(`[Worker:tts] Completed job "${job.name}" (${job.id}): ${result.message}`);
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
