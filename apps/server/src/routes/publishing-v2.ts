/** Publishing V2 Routes — Sprint 4 Phase 1 */

import { Router, Request, Response, NextFunction } from 'express';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as authService from '../services/auth.service';
import * as ps from '../services/publishing.service';

export const publishingV2Routes = Router({ mergeParams: true });

function s(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!SAAS_MODE) { res.status(503).json({ message: 'SaaS mode disabled' }); return; }
    try { await handler(req, res); } catch (e) { next(e); }
  };
}

async function getUserId(req: Request): Promise<string> {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) throw new AppError(401, 'Auth required');
  const u = await authService.verifyToken(t);
  if (!u) throw new AppError(401, 'Invalid token');
  return u.id;
}

// GET stats
publishingV2Routes.get('/stats', s(async (req, res) => {
  await getUserId(req);
  res.json({ success: true, data: await ps.getPublishStats(req.params.id) });
}));

// GET list jobs
publishingV2Routes.get('/jobs', s(async (req, res) => {
  await getUserId(req);
  const result = await ps.listPublishJobs(req.params.id, {
    status: req.query.status as string | undefined,
    platform: req.query.platform as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 20,
  });
  res.json({ success: true, data: result });
}));

// GET job detail
publishingV2Routes.get('/jobs/:jobId', s(async (req, res) => {
  await getUserId(req);
  const job = await ps.getPublishJob(req.params.jobId);
  if (!job) throw new AppError(404, 'Job not found');
  res.json({ success: true, data: job });
}));

// POST create job
publishingV2Routes.post('/jobs', s(async (req, res) => {
  await getUserId(req);
  const job = await ps.createPublishJob({
    workspaceId: req.params.id,
    videoId: req.body.videoId,
    platform: req.body.platform || 'tiktok',
    title: req.body.title,
    description: req.body.description,
    hashtags: req.body.hashtags,
    pinnedComment: req.body.pinnedComment,
    scheduledAt: req.body.scheduledAt,
  });
  res.status(201).json({ success: true, data: job });
}));

// POST publish now
publishingV2Routes.post('/jobs/:jobId/publish', s(async (req, res) => {
  await getUserId(req);
  res.json({ success: true, data: await ps.publishNow(req.params.jobId) });
}));

// POST retry
publishingV2Routes.post('/jobs/:jobId/retry', s(async (req, res) => {
  await getUserId(req);
  res.json({ success: true, data: await ps.retryPublish(req.params.jobId) });
}));

// PATCH schedule
publishingV2Routes.patch('/jobs/:jobId/schedule', s(async (req, res) => {
  await getUserId(req);
  if (!req.body.scheduledAt) throw new AppError(400, 'scheduledAt required');
  res.json({ success: true, data: await ps.schedulePublish(req.params.jobId, req.body.scheduledAt) });
}));

// POST cancel
publishingV2Routes.post('/jobs/:jobId/cancel', s(async (req, res) => {
  await getUserId(req);
  res.json({ success: true, data: await ps.cancelPublish(req.params.jobId) });
}));

// DELETE job
publishingV2Routes.delete('/jobs/:jobId', s(async (req, res) => {
  await getUserId(req);
  await ps.deletePublishJob(req.params.jobId);
  res.json({ success: true, message: 'Job deleted' });
}));

// POST publish multiple
publishingV2Routes.post('/publish-multiple', s(async (req, res) => {
  await getUserId(req);
  res.json({ success: true, data: await ps.publishMultiple(req.body.jobIds || []) });
}));
