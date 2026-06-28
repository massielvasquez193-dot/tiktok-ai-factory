/** AI Workspace Routes — Sprint 5 Phase 1 */
import { Router, Request, Response, NextFunction } from 'express';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as authService from '../services/auth.service';
import * as aiws from '../services/ai-workspace.service';

export const aiWorkspaceRoutes = Router({ mergeParams: true });

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

// ── AI Projects ────────────────────────────────────────────────────────────
aiWorkspaceRoutes.get('/projects', s(async (req, res) => { await getUserId(req); res.json({ success: true, data: await aiws.listProjects(req.params.id, req.query.status as string) }); }));
aiWorkspaceRoutes.post('/projects', s(async (req, res) => { await getUserId(req); res.status(201).json({ success: true, data: await aiws.createProject(req.params.id, req.body) }); }));
aiWorkspaceRoutes.get('/projects/:projectId', s(async (req, res) => { await getUserId(req); const p = await aiws.getProject(req.params.projectId); if (!p) throw new AppError(404, 'Project not found'); res.json({ success: true, data: p }); }));
aiWorkspaceRoutes.patch('/projects/:projectId', s(async (req, res) => { await getUserId(req); res.json({ success: true, data: await aiws.updateProject(req.params.projectId, req.body) }); }));
aiWorkspaceRoutes.delete('/projects/:projectId', s(async (req, res) => { await getUserId(req); await aiws.deleteProject(req.params.projectId); res.json({ success: true }); }));

// ── Prompt Templates ───────────────────────────────────────────────────────
aiWorkspaceRoutes.get('/templates', s(async (req, res) => { await getUserId(req); res.json({ success: true, data: await aiws.listTemplates(req.params.id, { category: req.query.category as string }) }); }));
aiWorkspaceRoutes.post('/templates', s(async (req, res) => { const uid = await getUserId(req); res.status(201).json({ success: true, data: await aiws.createTemplate(req.params.id, uid, req.body) }); }));
aiWorkspaceRoutes.get('/templates/:templateId', s(async (req, res) => { await getUserId(req); const t = await aiws.getTemplate(req.params.templateId); if (!t) throw new AppError(404, 'Not found'); res.json({ success: true, data: t }); }));
aiWorkspaceRoutes.delete('/templates/:templateId', s(async (req, res) => { await getUserId(req); await aiws.deleteTemplate(req.params.templateId); res.json({ success: true }); }));

// ── Saved Prompts ──────────────────────────────────────────────────────────
aiWorkspaceRoutes.get('/prompts', s(async (req, res) => { await getUserId(req); res.json({ success: true, data: await aiws.listSavedPrompts(req.params.id, { category: req.query.category as string, isFavorite: req.query.favorite === 'true', search: req.query.search as string }) }); }));
aiWorkspaceRoutes.post('/prompts', s(async (req, res) => { const uid = await getUserId(req); res.status(201).json({ success: true, data: await aiws.savePrompt(req.params.id, uid, req.body) }); }));
aiWorkspaceRoutes.post('/prompts/:promptId/favorite', s(async (req, res) => { await getUserId(req); res.json({ success: true, data: { isFavorite: await aiws.toggleFavorite(req.params.promptId) } }); }));
aiWorkspaceRoutes.delete('/prompts/:promptId', s(async (req, res) => { await getUserId(req); await aiws.deleteSavedPrompt(req.params.promptId); res.json({ success: true }); }));

// ── AI Chat ────────────────────────────────────────────────────────────────
aiWorkspaceRoutes.get('/chat', s(async (req, res) => { await getUserId(req); res.json({ success: true, data: await aiws.listChatMessages(req.params.id) }); }));
aiWorkspaceRoutes.post('/chat', s(async (req, res) => { const uid = await getUserId(req); const result = await aiws.sendChatMessage(req.params.id, uid, req.body); res.status(201).json({ success: true, data: result }); }));
