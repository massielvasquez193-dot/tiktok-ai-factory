/**
 * Queue API Routes — Internal verification endpoints.
 *
 * Routes:
 *  POST   /api/queue/test                     — enqueue a health-check test job
 *  GET    /api/queue/:queueName/:jobId        — get job detail + state
 *  GET    /api/queue/stats                    — per-queue job counts
 *
 * Security:
 *  - Redis URL is never exposed
 *  - Invalid queueName → 400
 *  - Job not found      → 404
 *  - Server error       → 500 (generic message only)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error';
import {
  isValidQueueName,
  addJob,
  getJob,
  getJobState,
  getQueue,
  QUEUE_NAMES,
} from '../lib/queue-registry';

export const queueRoutes = Router();

// ── POST /api/queue/test ──────────────────────────────────────────────────

queueRoutes.post('/test', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, queueName } = await addJob(
      QUEUE_NAMES.VIDEO_GENERATION,
      'health-check',
      { message: 'Queue system verification', test: true, timestamp: new Date().toISOString() },
      { attempts: 2, backoff: { type: 'fixed', delay: 1000 } },
    );

    res.status(201).json({
      success: true,
      jobId,
      queueName,
      message: 'Test job enqueued. Poll GET /api/queue/video-generation/:jobId for status.',
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /api/queue/:queueName/:jobId ──────────────────────────────────────

queueRoutes.get('/:queueName/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { queueName, jobId } = req.params;

    if (!isValidQueueName(queueName)) {
      throw new AppError(400, `Invalid queue name: "${queueName}". Allowed: ${Object.values(QUEUE_NAMES).join(', ')}`);
    }

    const job = await getJob(queueName, jobId);
    if (!job) {
      throw new AppError(404, `Job "${jobId}" not found in queue "${queueName}"`);
    }

    const state = await job.getState();
    const progress = job.progress;

    res.json({
      jobId: job.id,
      queueName,
      name: job.name,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
      attemptsMade: job.attemptsMade,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /api/queue/stats ─────────────────────────────────────────────────

queueRoutes.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats: Record<string, { waiting: number; active: number; completed: number; failed: number; delayed: number }> = {};

    for (const name of Object.values(QUEUE_NAMES)) {
      try {
        const queue = getQueue(name);
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);
        stats[name] = { waiting, active, completed, failed, delayed };
      } catch {
        stats[name] = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
      }
    }

    res.json({ stats, timestamp: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});
