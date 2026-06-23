/**
 * Automation Worker — BullMQ Worker + pure handler.
 *
 * The handler is exported separately so tests can call it without Redis.
 * In production the Worker invokes the same handler via BullMQ.
 *
 * Pipeline steps:
 *   1. validate   — check payload and resolve task type
 *   2. execute    — execute the automation action
 *   3. finalize   — return structured result
 *
 * Supported actions:
 *   - campaign-trigger  → start a campaign pipeline
 *   - scheduled-task    → execute a scheduled automation task
 *   - health-check      → diagnostic no-op
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { QUEUE_NAMES } from '../lib/queue-registry';
import { PipelineRunner, defineStep, PipelineContext } from '../lib/pipeline-runner';
import { ProviderManager } from '../providers/manager/ProviderManager';
import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AutomationPayload {
  taskType?: string;
  targetId?: string;
  schedule?: string;
  action?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

interface AutomationContext extends PipelineContext {
  taskType: string;
  action: string;
  targetId: string;
  validated: boolean;
  executed: boolean;
  stepsExecuted: number;
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

// ── Pure Handler (testable without Redis) ─────────────────────────────────

export async function handleAutomation(
  payload: AutomationPayload,
  onProgress?: (stepIndex: number, stepName: string, percent: number) => void,
): Promise<AutomationResult> {
  const runner = new PipelineRunner<AutomationContext>({ onProgress });
  const ctx: AutomationContext = {
    taskType: payload.taskType || payload.action || 'default',
    action: payload.action || 'execute',
    targetId: payload.targetId || '',
    validated: false,
    executed: false,
    stepsExecuted: 0,
  };

  const result = await runner.run([
    defineStep<AutomationContext>('validate', async (c) => {
      const validTasks = ['campaign-trigger', 'scheduled-task', 'health-check', 'default'];
      if (!validTasks.includes(c.taskType) && !validTasks.includes(c.action)) {
        // Don't throw — treat unknown types as a default no-op
        return { validated: true, taskType: 'default' };
      }
      return { validated: true };
    }),

    defineStep<AutomationContext>('execute', async (c) => {
      let executed = false;
      let stepsExecuted = 0;

      const taskType = c.taskType || c.action;

      if (taskType === 'campaign-trigger' || taskType === 'scheduled-task') {
        // Execute the automation pipeline:
        // 1. Find a product
        const product = c.targetId
          ? await prisma.product.findUnique({ where: { id: c.targetId } })
          : await prisma.product.findFirst({ orderBy: { createdAt: 'desc' } });

        if (product) {
          // 2. Create an agent run to track this automation
          const runId = uuid();
          await prisma.agentRun.create({
            data: {
              id: runId,
              productId: product.id,
              name: `Automation: ${taskType}`,
              countries: '["US"]',
              language: 'en',
              scriptCount: 2,
              status: 'running',
              step: 'init',
              progress: 5,
              startedAt: new Date(),
            },
          });
          stepsExecuted++;

          // 3. Submit any existing prompts through ProviderManager
          const prompts = await prisma.prompt.findMany({ take: 2, orderBy: { createdAt: 'desc' } });
          for (const p of prompts) {
            try { await ProviderManager.instance.submit(p.id, 'seedance'); stepsExecuted++; } catch {}
          }

          await prisma.agentRun.update({
            where: { id: runId },
            data: { status: 'completed', progress: 100, completedAt: new Date() },
          });
          executed = true;
        }
      }

      if (taskType === 'health-check') {
        // Diagnostic no-op — always succeeds
        executed = true;
      }

      return { executed, stepsExecuted };
    }),

    defineStep<AutomationContext>('finalize', async (_c) => {
      return {};
    }),
  ], ctx);

  return {
    success: result.success,
    processedAt: new Date().toISOString(),
    steps: result.steps.length,
    message: result.context.executed ? `Automation "${result.context.taskType}" executed` : `Automation "${result.context.taskType}" skipped (no targets)`,
    taskType: result.context.taskType,
    action: result.context.action,
    executed: result.context.executed,
    payloadEcho: { taskType: payload.taskType, targetId: payload.targetId },
  };
}

// ── Worker Factory ────────────────────────────────────────────────────────

let worker: Worker | null = null;

export function getAutomationWorker(): Worker {
  if (!worker) {
    worker = new Worker<AutomationPayload, AutomationResult>(
      QUEUE_NAMES.AUTOMATION,
      async (job: Job<AutomationPayload, AutomationResult>) => {
        console.log(`[Worker:automation] Processing job "${job.name}" (${job.id})`);

        const result = await handleAutomation(
          job.data,
          (_idx, _name, pct) => {
            job.updateProgress(pct).catch(() => {});
          },
        );

        console.log(`[Worker:automation] Completed job "${job.name}" (${job.id}): ${result.message}`);
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
