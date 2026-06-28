/**
 * Workspace Routes — Phase 2
 *
 * GET    /api/workspaces              — List user's workspaces
 * POST   /api/workspaces              — Create workspace
 * GET    /api/workspaces/:id          — Get workspace detail
 * PATCH  /api/workspaces/:id          — Update workspace
 * DELETE /api/workspaces/:id          — Soft delete workspace
 * GET    /api/workspaces/:id/members  — List members
 * POST   /api/workspaces/:id/invite   — Invite member
 * PATCH  /api/workspaces/:id/members/:memberId  — Update role
 * DELETE /api/workspaces/:id/members/:memberId  — Remove member
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SAAS_MODE } from '../middleware/auth';
import { AppError } from '../middleware/error';
import * as wsService from '../services/workspace.service';
import * as authService from '../services/auth.service';

export const workspaceRoutes = Router();

// ── Helper ──────────────────────────────────────────────────────────────────

function s(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!SAAS_MODE) {
      res.status(503).json({ message: 'Workspaces are disabled. Set SAAS_MODE=true to enable.' });
      return;
    }
    try {
      await handler(req, res);
    } catch (e) {
      next(e);
    }
  };
}

/** Extract user from the Authorization header */
async function getUserId(req: Request): Promise<string> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new AppError(401, 'Authentication required');
  const user = await authService.verifyToken(token);
  if (!user) throw new AppError(401, 'Invalid or expired token');
  return user.id;
}

// ── GET /api/workspaces ─────────────────────────────────────────────────────

workspaceRoutes.get('/', s(async (req, res) => {
  const userId = await getUserId(req);
  const workspaces = await wsService.getUserWorkspaces(userId);
  res.json({ success: true, data: workspaces });
}));

// ── POST /api/workspaces ────────────────────────────────────────────────────

workspaceRoutes.post('/', s(async (req, res) => {
  const userId = await getUserId(req);
  const { name, slug } = req.body;
  if (!name) throw new AppError(400, 'Workspace name is required');
  const ws = await wsService.createWorkspace(userId, name, slug);
  res.status(201).json({ success: true, data: ws });
}));

// ── GET /api/workspaces/:id ─────────────────────────────────────────────────

workspaceRoutes.get('/:id', s(async (req, res) => {
  const userId = await getUserId(req);
  const ws = await wsService.getWorkspace(req.params.id, userId);
  if (!ws) throw new AppError(404, 'Workspace not found');
  res.json({ success: true, data: ws });
}));

// ── PATCH /api/workspaces/:id ───────────────────────────────────────────────

workspaceRoutes.patch('/:id', s(async (req, res) => {
  const userId = await getUserId(req);
  // Check user is member with admin+ access
  const ws = await wsService.getWorkspace(req.params.id, userId);
  if (!ws) throw new AppError(404, 'Workspace not found');
  if (!['owner', 'admin'].includes(ws.role)) throw new AppError(403, 'Admin access required');

  const { name, slug, logoUrl, settings } = req.body;
  const updated = await wsService.updateWorkspace(req.params.id, { name, slug, logoUrl, settings });
  res.json({ success: true, data: updated });
}));

// ── DELETE /api/workspaces/:id ──────────────────────────────────────────────

workspaceRoutes.delete('/:id', s(async (req, res) => {
  const userId = await getUserId(req);
  const ws = await wsService.getWorkspace(req.params.id, userId);
  if (!ws) throw new AppError(404, 'Workspace not found');
  if (ws.role !== 'owner') throw new AppError(403, 'Only the owner can delete a workspace');

  await wsService.deleteWorkspace(req.params.id);
  res.json({ success: true, message: 'Workspace deleted' });
}));

// ── GET /api/workspaces/:id/members ─────────────────────────────────────────

workspaceRoutes.get('/:id/members', s(async (req, res) => {
  const userId = await getUserId(req);
  const ws = await wsService.getWorkspace(req.params.id, userId);
  if (!ws) throw new AppError(404, 'Workspace not found');

  const members = await wsService.getMembers(req.params.id);
  res.json({ success: true, data: members });
}));

// ── POST /api/workspaces/:id/invite ─────────────────────────────────────────

workspaceRoutes.post('/:id/invite', s(async (req, res) => {
  const userId = await getUserId(req);
  const ws = await wsService.getWorkspace(req.params.id, userId);
  if (!ws) throw new AppError(404, 'Workspace not found');
  if (!['owner', 'admin'].includes(ws.role)) throw new AppError(403, 'Admin access required');

  const { email, role } = req.body;
  if (!email) throw new AppError(400, 'Email is required');
  const member = await wsService.inviteMember(req.params.id, email, role || 'editor');
  res.status(201).json({ success: true, data: member });
}));

// ── PATCH /api/workspaces/:id/members/:memberId ─────────────────────────────

workspaceRoutes.patch('/:id/members/:memberId', s(async (req, res) => {
  const userId = await getUserId(req);
  const ws = await wsService.getWorkspace(req.params.id, userId);
  if (!ws) throw new AppError(404, 'Workspace not found');
  if (!['owner', 'admin'].includes(ws.role)) throw new AppError(403, 'Admin access required');

  const { role } = req.body;
  if (!role) throw new AppError(400, 'Role is required');
  const member = await wsService.updateMemberRole(req.params.id, req.params.memberId, role);
  res.json({ success: true, data: member });
}));

// ── DELETE /api/workspaces/:id/members/:memberId ────────────────────────────

workspaceRoutes.delete('/:id/members/:memberId', s(async (req, res) => {
  const userId = await getUserId(req);
  const ws = await wsService.getWorkspace(req.params.id, userId);
  if (!ws) throw new AppError(404, 'Workspace not found');
  if (!['owner', 'admin'].includes(ws.role)) throw new AppError(403, 'Admin access required');

  await wsService.removeMember(req.params.id, req.params.memberId);
  res.json({ success: true, message: 'Member removed' });
}));
