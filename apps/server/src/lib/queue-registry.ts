/**
 * Queue Registry — Centralised BullMQ queue management.
 *
 * Responsibilities:
 *  - Provide named queues via getQueue()
 *  - addJob / getJob / getJobState helpers
 *  - Graceful shutdown (closeQueues)
 *
 * Queue names are defined once as constants — no magic strings elsewhere.
 */

import { Queue, Job, JobsOptions } from 'bullmq';
import { getRedisConnection } from './redis';

// ── Queue Name Constants ────────────────────────────────────────────────

export const QUEUE_NAMES = {
  VIDEO_GENERATION: 'video-generation',
  TTS: 'tts',
  PUBLISHING: 'publishing',
  UPLOAD_PROCESSING: 'upload-processing',
  AUTOMATION: 'automation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const VALID_QUEUE_NAMES: ReadonlySet<string> = new Set(Object.values(QUEUE_NAMES));

export function isValidQueueName(name: string): name is QueueName {
  return VALID_QUEUE_NAMES.has(name);
}

// ── Registry ────────────────────────────────────────────────────────────

const queues = new Map<string, Queue>();

/**
 * Get (or lazily create) a BullMQ Queue by name.
 * Uses raw connection options (not an IORedis instance) for BullMQ v5 compat.
 */
export function getQueue(name: QueueName | string): Queue {
  if (!isValidQueueName(name)) {
    throw new Error(`Invalid queue name: "${name}". Allowed: ${[...VALID_QUEUE_NAMES].join(', ')}`);
  }

  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getRedisConnection() });
    queues.set(name, queue);
  }
  return queue;
}

// ── Job Helpers ─────────────────────────────────────────────────────────

export interface AddJobResult {
  jobId: string;
  queueName: string;
}

/**
 * Add a job to the named queue.
 *
 * @param queueName  One of QUEUE_NAMES
 * @param jobName    Human-readable job name (e.g. 'health-check')
 * @param data       Arbitrary serialisable payload
 * @param opts       BullMQ JobsOptions (attempts, backoff, delay, etc.)
 */
export async function addJob<T = Record<string, unknown>>(
  queueName: QueueName | string,
  jobName: string,
  data: T,
  opts?: JobsOptions,
): Promise<AddJobResult> {
  const queue = getQueue(queueName);
  const job = await queue.add(jobName, data, opts);
  return { jobId: job.id!, queueName };
}

/**
 * Fetch a BullMQ Job by queue name and job id.
 * Returns null when the job doesn't exist.
 */
export async function getJob(queueName: QueueName | string, jobId: string): Promise<Job | null> {
  const queue = getQueue(queueName);
  return (await queue.getJob(jobId)) ?? null;
}

/**
 * Return the job's current state (e.g. 'waiting', 'active', 'completed', 'failed').
 */
export async function getJobState(queueName: QueueName | string, jobId: string): Promise<string> {
  const job = await getJob(queueName, jobId);
  if (!job) throw new Error(`Job "${jobId}" not found in queue "${queueName}"`);
  return job.getState();
}

// ── Shutdown ────────────────────────────────────────────────────────────

/**
 * Close all registered queues.
 * Call during graceful shutdown.
 */
export async function closeQueues(): Promise<void> {
  for (const [name, queue] of queues) {
    try {
      await queue.close();
      console.log(`[Queue] Closed: ${name}`);
    } catch (err: any) {
      console.error(`[Queue] Error closing "${name}":`, err.message);
    }
  }
  queues.clear();
}
