/** Template Marketplace Routes — Sprint 6 Phase 1 */
import { Router, Request, Response, NextFunction } from 'express';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as authService from '../services/auth.service';
import * as ts from '../services/template.service';

export const templateRoutes = Router();
export const templateWorkspaceRoutes = Router({ mergeParams: true });

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

// ── Public Marketplace ───────────────────────────────────────────────
templateRoutes.get('/', async (req, res, next) => {
  try {
    const result = await ts.listTemplates({
      type: req.query.type as string, category: req.query.category as string,
      language: req.query.language as string, search: req.query.search as string,
      sort: req.query.sort as string, page: parseInt(req.query.page as string) || 1,
    });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

templateRoutes.get('/:id', async (req, res, next) => {
  try {
    const t = await ts.getTemplate(req.params.id);
    if (!t) throw new AppError(404, 'Template not found');
    const reviews = await ts.getReviews(req.params.id);
    res.json({ success: true, data: { template: t, reviews } });
  } catch (e) { next(e); }
});

templateRoutes.get('/:id/reviews', async (req, res, next) => {
  try { res.json({ success: true, data: await ts.getReviews(req.params.id) }); }
  catch (e) { next(e); }
});

// ── Workspace Template Routes ────────────────────────────────────────
templateWorkspaceRoutes.get('/', s(async (req, res) => {
  res.json({ success: true, data: await ts.listMyTemplates(req.params.id) });
}));

templateWorkspaceRoutes.post('/', s(async (req, res) => {
  const uid = await getUserId(req);
  res.status(201).json({ success: true, data: await ts.createTemplate(req.params.id, uid, req.body) });
}));

templateWorkspaceRoutes.post('/:templateId/clone', s(async (req, res) => {
  const uid = await getUserId(req);
  res.json({ success: true, data: await ts.cloneTemplate(req.params.templateId, req.params.id, uid) });
}));

templateWorkspaceRoutes.post('/:templateId/publish', s(async (req, res) => {
  await getUserId(req);
  res.json({ success: true, data: await ts.publishTemplate(req.params.templateId) });
}));

templateWorkspaceRoutes.post('/:templateId/review', s(async (req, res) => {
  const uid = await getUserId(req);
  res.json({ success: true, data: await ts.addReview(req.params.templateId, uid, req.body) });
}));

templateWorkspaceRoutes.post('/:templateId/featured', s(async (req, res) => {
  await getUserId(req);
  res.json({ success: true, data: await ts.toggleFeatured(req.params.templateId) });
}));

templateWorkspaceRoutes.delete('/:templateId', s(async (req, res) => {
  await getUserId(req);
  await ts.deleteTemplate(req.params.templateId);
  res.json({ success: true });
}));
