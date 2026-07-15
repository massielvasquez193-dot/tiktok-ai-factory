import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';
import { createAndCharge, estimateCost, InsufficientCreditsError } from '../services/videoTask.service';
import { getOrCreateWallet } from '../services/credit.service';
import { ProviderManager } from '../providers/manager/ProviderManager';
import { validateStyle, styleForApi, VALID_STYLES } from '../lib/tiktok-styles';

export const videoTaskRoutes = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

async function resolveWorkspace(req: Request): Promise<string> {
  const fromHeader = req.headers['x-workspace-id'] as string;
  if (fromHeader) return fromHeader;
  if (req.user?.id) {
    const members = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id }, take: 1,
    });
    if (members[0]) return members[0].workspaceId;
  }
  throw new AppError(400, 'Workspace context required — set x-workspace-id header');
}

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /api/video-tasks
videoTaskRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptId, model, status } = req.query;
    const where: any = {};
    if (promptId) where.promptId = promptId;
    if (model) where.model = model;
    if (status) where.status = status;
    // Scope to user's tasks when authenticated
    if (req.user?.id && req.headers['x-workspace-id']) {
      where.workspaceId = req.headers['x-workspace-id'];
    }

    const tasks = await prisma.videoTask.findMany({
      where,
      include: { prompt: { select: { id: true, prompt: true } }, video: { select: { id: true, videoUrl: true, thumbnailUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    // Enrich with style display info
    const enriched = tasks.map(t => ({
      ...t,
      style: styleForApi((t.metadata as any)?.tiktokStyle),
    }));
    res.json(enriched);
  } catch (e) { next(e); }
});

// GET /api/video-tasks/:id
videoTaskRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.videoTask.findUnique({
      where: { id: req.params.id },
      include: { prompt: { select: { id: true, prompt: true } }, video: { select: { id: true, videoUrl: true, thumbnailUrl: true } } },
    });
    if (!t) throw new AppError(404, 'Task not found');
    // Access control: user can only read own workspace tasks
    if (req.user?.id && req.headers['x-workspace-id'] && t.workspaceId !== req.headers['x-workspace-id']) {
      throw new AppError(403, 'Access denied');
    }
    res.json({ ...t, style: styleForApi((t.metadata as any)?.tiktokStyle) });
  } catch (e) { next(e); }
});

// POST /api/video-tasks/create — Atomic: charge credits + create task + submit to provider
// Idempotency: client can send X-Idempotency-Key header to prevent duplicate submissions
videoTaskRoutes.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptId, model, style: rawStyle } = req.body;
    if (!promptId) throw new AppError(400, 'promptId required');

    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new AppError(404, 'Prompt not found');

    const targetModel = model || prompt.model || 'seedance';
    const workspaceId = await resolveWorkspace(req);
    const userId = req.user?.id || 'anonymous';
    const cost = estimateCost(targetModel);
    const clientIdempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

    // Validate style (white-list)
    let styleKey: string;
    try {
      styleKey = validateStyle(rawStyle);
    } catch (err: any) {
      throw new AppError(400, err.message);
    }

    // UX fast-fail: check balance (actual atomic check is inside createAndCharge)
    const wallet = await getOrCreateWallet(workspaceId);
    if (wallet.balance < cost) {
      return res.status(402).json({
        error: 'Insufficient credits',
        balance: wallet.balance,
        required: cost,
      });
    }

    // Atomic: charge + create in single transaction
    const created = await createAndCharge({
      workspaceId, userId, promptId, model: targetModel, costOverride: cost,
      style: styleKey, clientIdempotencyKey,
    });

    // Submit to provider if not a duplicate (fire-and-forget)
    if (!created.duplicate) {
      ProviderManager.instance.submitTask(created.taskId).catch(err => {
        console.error(`[VideoTasks] Submit error for ${created.taskId}:`, err.message);
      });
    }

    res.status(201).json({
      id: created.taskId,
      creditsCharged: created.creditsCharged,
      balanceAfter: created.balanceAfter,
      status: created.duplicate ? 'existing' : 'submitted',
      duplicate: created.duplicate,
      style: styleKey,
      styleDisplay: styleForApi(styleKey).nameZh,
    });
  } catch (e: any) {
    if (e instanceof InsufficientCreditsError) {
      return res.status(402).json({ error: e.message, required: e.required });
    }
    next(e);
  }
});

// POST /api/video-tasks/create-bulk
videoTaskRoutes.post('/create-bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptIds, model } = req.body;
    if (!promptIds?.length) throw new AppError(400, 'promptIds[] required');

    const targetModel = model || 'seedance';
    const workspaceId = await resolveWorkspace(req);
    const userId = req.user?.id || 'anonymous';
    const costPerTask = estimateCost(targetModel);
    const totalCost = costPerTask * promptIds.length;

    // Check balance
    const wallet = await getOrCreateWallet(workspaceId);
    if (wallet.balance < totalCost) {
      return res.status(402).json({
        error: 'Insufficient credits',
        balance: wallet.balance,
        required: totalCost,
        costPerTask,
        quantity: promptIds.length,
      });
    }

    const results: any[] = [];
    for (const promptId of promptIds) {
      try {
        const created = await createAndCharge({
          workspaceId, userId, promptId, model: targetModel, costOverride: costPerTask,
        });
        ProviderManager.instance.submitTask(created.taskId).catch(err =>
          console.error(`[VideoTasks] Bulk submit error ${created.taskId}:`, err.message),
        );
        results.push({
          id: created.taskId,
          creditsCharged: created.creditsCharged,
          balanceAfter: created.balanceAfter,
        });
      } catch (err: any) {
        if (err instanceof InsufficientCreditsError) {
          results.push({ error: 'Insufficient credits', required: err.required });
          break; // Stop on insufficient credits
        }
        results.push({ error: err.message });
      }
    }

    res.status(201).json({
      count: results.filter(r => r.id).length,
      totalCost: results.reduce((sum, r) => sum + (r.creditsCharged || 0), 0),
      results,
    });
  } catch (e) { next(e); }
});

// POST /api/video-tasks/:id/retry — Retry a failed task (charges new credits)
videoTaskRoutes.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.videoTask.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError(404, 'Task not found');

    // Only retry failed tasks
    if (task.status !== 'failed') {
      throw new AppError(400, `Cannot retry task in status '${task.status}' — only failed tasks`);
    }

    const workspaceId = await resolveWorkspace(req);
    const userId = req.user?.id || 'anonymous';
    const cost = estimateCost(task.model || 'seedance');

    // Check balance before retry
    const wallet = await getOrCreateWallet(workspaceId);
    if (wallet.balance < cost) {
      return res.status(402).json({
        error: 'Insufficient credits for retry',
        balance: wallet.balance,
        required: cost,
      });
    }

    // Create NEW task with fresh credits deduction
    const created = await createAndCharge({
      workspaceId, userId, promptId: task.promptId, model: task.model || 'seedance', costOverride: cost,
    });

    // Submit new task
    ProviderManager.instance.submitTask(created.taskId).catch(err =>
      console.error(`[VideoTasks] Retry submit error ${created.taskId}:`, err.message),
    );

    res.json({
      retriedFrom: task.id,
      newTaskId: created.taskId,
      creditsCharged: created.creditsCharged,
      balanceAfter: created.balanceAfter,
    });
  } catch (e) { next(e); }
});

// DELETE /api/video-tasks/:id
videoTaskRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.videoTask.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError(404, 'Task not found');
    // Only allow deleting failed or cancelled tasks
    if (['pending', 'submitted', 'processing'].includes(task.status)) {
      throw new AppError(400, `Cannot delete task in status '${task.status}' — cancel first`);
    }
    // Before deleting, refund any unrefunded credits
    if (task.creditsCharged > 0 && !task.refundedAt && task.status !== 'completed') {
      const { refundTask } = await import('../services/videoTask.service');
      await refundTask(task.id).catch(err =>
        console.error(`[VideoTasks] Delete refund error for ${task.id}:`, err.message),
      );
    }
    await prisma.videoTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
