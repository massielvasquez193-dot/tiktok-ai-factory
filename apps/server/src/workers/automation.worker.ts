/**
 * Automation Worker — Processes automation/scheduling jobs from the "automation" queue.
 *
 * This worker is deterministic — it does NOT call any external API.
 * Real automation (cron-based scheduling, campaign triggers) will be wired in Phase 3.
 *
 * Supported job names:
 *  - campaign-trigger    → simulates campaign automation trigger
 *  - scheduled-task      → simulates a scheduled automation task
 *  - health-check        → returns { success: true } after simulated work
 *  - default             → completes with a safe no-op result
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';

// ── Job Data / Result Types ─────────────────────────────────────────────

export interface AutomationPayload {
  taskType?: string;
  targetId?: string;
  schedule?: string;
  action?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AutomationResult {
  success: boolean;
  processedAt: string;
  steps: number;
  message: string;
  taskType: string;
  action: string;
  executed: boolean;
  payloadEcho?: Record<string, unknown>;
}

// ── Worker Factory ──────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getAutomationWorker(): Worker {
  if (!worker) {
    worker = new Worker<AutomationPayload, AutomationResult>(
      QUEUE_NAMES.AUTOMATION,
      async (job: Job<AutomationPayload, AutomationResult>) => {
        const startTime = Date.now();
        const steps = 4;

        console.log(`[Worker:automation] Processing job "${job.name}" (${job.id})`);

        // Simulate deterministic automation workflow
        for (let i = 1; i <= steps; i++) {
          await job.updateProgress(Math.round((i / steps) * 100));
          await new Promise((r) => setTimeout(r, 50));
        }

        const elapsed = Date.now() - startTime;

        const result: AutomationResult = {
          success: true,
          processedAt: new Date().toISOString(),
          steps,
          message: `Automation "${job.name}" executed in ${elapsed}ms`,
          taskType: (job.data.taskType || job.name) as string,
          action: (job.data.action || 'execute') as string,
          executed: true,
          payloadEcho: { ...job.data },
        };

        console.log(`[Worker:automation] Completed job "${job.name}" (${job.id}) in ${elapsed}ms`);
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
      console.log(`[Worker:automation] ✅ Job "${job.name}" (${job.id}) completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker:automation] ❌ Job "${job?.name}" (${job?.id}) failed:`, err.message);
    });

    worker.on('progress', (job, progress) => {
      console.log(`[Worker:automation] 📊 Job "${job.name}" (${job.id}) progress: ${progress}%`);
    });

    worker.on('error', (err) => {
      console.error(`[Worker:automation] Worker error:`, err.message);
    });

    console.log('[Worker:automation] Initialised');
  }

  return worker;
}

export async function closeAutomationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Worker:automation] Shut down');
  }
}
