/**
 * Queue management routes — Job status, queue stats, pipeline control.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getJobStatus, getQueueStats, submitFullPipeline } from '../services/queue';
import { AppError } from '../middleware/error';

export const queueRoutes = Router();

// GET /api/queue/stats — get all queue statistics
queueRoutes.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (err) { next(err); }
});

// GET /api/queue/jobs/:jobId — get job status
queueRoutes.get('/jobs/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getJobStatus(req.params.jobId);
    if (!status) throw new AppError(404, 'Job not found');
    res.json(status);
  } catch (err) { next(err); }
});

// POST /api/queue/pipeline — submit full pipeline
queueRoutes.post('/pipeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, campaignId, languages, scriptTypes, generateVideo } = req.body;
    if (!productId || !campaignId) {
      throw new AppError(400, 'productId and campaignId are required');
    }

    const result = await submitFullPipeline({
      productId,
      campaignId,
      languages,
      scriptTypes,
      generateVideo,
    });

    res.status(202).json(result);
  } catch (err) { next(err); }
});
