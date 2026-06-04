/**
 * BullMQ Queue Service — Async video production pipeline.
 *
 * Queues:
 *   product-analysis    — Analyze product, extract selling points
 *   script-generation   — Generate scripts from product analysis
 *   video-generation    — Call Seedance API to create videos
 *   voice-generation    — Call TTS API to create voiceovers
 *   video-composition   — Assemble final video
 *
 * Usage:
 *   import { addProductAnalysisJob, getJobStatus } from './services/queue';
 *   const job = await addProductAnalysisJob(productId);
 *   const status = await getJobStatus(job.id);
 */

import { Queue, Worker, Job, QueueScheduler, JobsOptions } from 'bullmq';
import { prisma } from '../index';

// ── Redis connection ────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  url: REDIS_URL,
  maxRetriesPerRequest: null,
};

// ── Queue definitions ───────────────────────────────────────────────────

export const productAnalysisQueue = new Queue('product-analysis', { connection });
export const scriptGenerationQueue = new Queue('script-generation', { connection });
export const videoGenerationQueue = new Queue('video-generation', { connection });
export const voiceGenerationQueue = new Queue('voice-generation', { connection });
export const videoCompositionQueue = new Queue('video-composition', { connection });

// Alias for the main pipeline queue
export const pipelineQueue = productAnalysisQueue;

/**
 * All queues for bulk operations.
 */
export const ALL_QUEUES = [
  productAnalysisQueue,
  scriptGenerationQueue,
  videoGenerationQueue,
  voiceGenerationQueue,
  videoCompositionQueue,
];

// ── Job helpers ─────────────────────────────────────────────────────────

export interface PipelineJobData {
  productId: string;
  campaignId: string;
  languages?: string[];
  scriptTypes?: string[];
  generateVideo?: boolean;
}

export async function addProductAnalysisJob(data: PipelineJobData): Promise<Job> {
  return productAnalysisQueue.add('analyze', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  });
}

export async function addScriptGenerationJob(data: PipelineJobData): Promise<Job> {
  return scriptGenerationQueue.add('generate', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 1000 },
    removeOnComplete: 50,
  });
}

export async function addVideoGenerationJob(data: {
  campaignId: string;
  prompt: string;
  label: string;
  provider?: string;
}): Promise<Job> {
  return videoGenerationQueue.add('generate-video', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 600_000, // 10 minutes
    removeOnComplete: 20,
  });
}

export async function addVoiceGenerationJob(data: {
  scriptId: string;
  language: string;
  text: string;
}): Promise<Job> {
  return voiceGenerationQueue.add('generate-voice', data, {
    attempts: 2,
    removeOnComplete: 50,
  });
}

export async function addCompositionJob(data: {
  campaignId: string;
  videoPaths: string[];
  audioPath: string;
  subtitlePath?: string;
}): Promise<Job> {
  return videoCompositionQueue.add('compose', data, {
    attempts: 1,
    timeout: 300_000, // 5 minutes
    removeOnComplete: 20,
  });
}

/**
 * Submit the full pipeline for a campaign.
 */
export async function submitFullPipeline(data: PipelineJobData): Promise<{
  campaignId: string;
  jobs: { type: string; jobId: string }[];
}> {
  const jobs: { type: string; jobId: string }[] = [];

  // 1. Product Analysis
  const analysisJob = await addProductAnalysisJob(data);
  jobs.push({ type: 'product-analysis', jobId: analysisJob.id! });

  // 2. Script Generation (starts after analysis completes — handled by worker chaining)
  // We submit it with a delay via the worker

  // 3. Update campaign status
  await prisma.campaign.update({
    where: { id: data.campaignId },
    data: { status: 'generating' },
  });

  // Update/create tasks
  for (const job of jobs) {
    await prisma.task.create({
      data: {
        id: job.jobId,
        type: job.type,
        status: 'queued',
        progress: 0,
        campaignId: data.campaignId,
      },
    });
  }

  return { campaignId: data.campaignId, jobs };
}

// ── Job status ──────────────────────────────────────────────────────────

export async function getJobStatus(jobId: string): Promise<{
  id: string;
  status: string;
  progress: number;
  result: unknown;
  error: string | null;
} | null> {
  // Try each queue
  for (const queue of ALL_QUEUES) {
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      return {
        id: job.id!,
        status: state,
        progress: job.progress as number || 0,
        result: job.returnvalue || null,
        error: job.failedReason || null,
      };
    }
  }
  return null;
}

export async function getQueueStats(): Promise<Record<string, {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}>> {
  const stats: Record<string, any> = {};
  for (const queue of ALL_QUEUES) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    stats[queue.name] = { waiting, active, completed, failed };
  }
  return stats;
}
