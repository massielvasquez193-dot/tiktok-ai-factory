import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';
import { styleForApi } from '../lib/tiktok-styles';

export const videoRoutes = Router();

// GET /api/videos
videoRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, provider, status, search, dateFrom, dateTo, page, pageSize } = req.query;
    const where: any = {};

    // ── Workspace scoping ──────────────────────────────────────────────
    // Scope to user's workspace. In non-SAAS mode, fall back to header.
    const workspaceId = (req as any).workspaceId
      || req.headers['x-workspace-id'] as string;
    if (workspaceId) {
      where.workspaceId = workspaceId;
    } else if (req.user?.id) {
      // If authenticated but no explicit workspace, scope to user's workspaces
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: req.user.id },
        select: { workspaceId: true },
      });
      where.workspaceId = { in: memberships.map(m => m.workspaceId) };
    }

    if (productId) where.productId = productId as string;
    if (provider) where.provider = provider as string;
    if (status) where.status = status as string;
    if (dateFrom) where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo as string + 'T23:59:59') };
    if (search) where.title = { contains: search as string };

    const take = Math.min(Number(pageSize) || 50, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({ where, include: { task: { select: { id: true, metadata: true } } }, orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.video.count({ where }),
    ]);

    const pids = [...new Set(videos.map(v => v.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: pids } }, select: { id: true, product_name: true } });
    const pmap = new Map(products.map(p => [p.id, p]));

    res.json({
      items: videos.map(v => {
        const { task, ...rest } = v as any;
        return {
          ...rest,
          product: pmap.get(v.productId) || null,
          style: styleForApi(task?.metadata?.tiktokStyle),
        };
      }),
      total, page: Number(page) || 1, pageSize: take,
    });
  } catch (e) { next(e); }
});

// GET /api/videos/:id
videoRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const v = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!v) throw new AppError(404, 'Not found');
    const product = await prisma.product.findUnique({ where: { id: v.productId }, select: { product_name: true } });
    res.json({ ...v, product });
  } catch (e) { next(e); }
});

// POST /api/videos/sync — pull completed tasks into library
videoRoutes.post('/sync', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await prisma.videoTask.findMany({
      where: { status: 'completed', videoUrl: { not: '' }, video: null },
      include: { prompt: { include: { storyboard: { include: { script: { include: { product: true } } } } } } },
    });

    let count = 0;
    for (const t of tasks) {
      const prod = t.prompt?.storyboard?.script?.product;
      if (!prod) continue;
      const title = `${prod.product_name} — Shot #${t.prompt?.sceneNumber}`;
      await prisma.video.create({
        data: {
          id: uuid(), taskId: t.id, productId: prod.id, provider: t.provider || t.model,
          title, videoUrl: t.videoUrl, thumbnailUrl: t.thumbnailUrl,
          duration: t.duration || 5, size: 0, status: 'completed',
        },
      });
      count++;
    }

    res.json({ synced: count });
  } catch (e) { next(e); }
});

// POST /api/videos — manual add
videoRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, provider, title, videoUrl, thumbnailUrl, duration, size } = req.body;
    if (!productId || !videoUrl) throw new AppError(400, 'productId and videoUrl required');

    const v = await prisma.video.create({
      data: {
        id: uuid(), productId, provider: provider || 'seedance', title: title || 'Untitled',
        videoUrl, thumbnailUrl: thumbnailUrl || '', duration: duration || 5, size: size || 0, status: 'completed',
      },
    });
    res.status(201).json(v);
  } catch (e) { next(e); }
});

// DELETE /api/videos/:id
videoRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.video.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/videos/delete-bulk
videoRoutes.post('/delete-bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) throw new AppError(400, 'ids[] required');
    await prisma.video.deleteMany({ where: { id: { in: ids } } });
    res.json({ success: true, deleted: ids.length });
  } catch (e) { next(e); }
});

// GET /api/videos/meta/filters
videoRoutes.get('/meta/filters', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const videos = await prisma.video.findMany({ select: { provider: true, status: true, productId: true } });
    const providers = [...new Set(videos.map(v => v.provider))];
    const statuses = [...new Set(videos.map(v => v.status))];
    const pids = [...new Set(videos.map(v => v.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: pids } }, select: { id: true, product_name: true } });
    res.json({ providers, statuses, products });
  } catch (e) { next(e); }
});
