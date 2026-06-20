import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { ProviderManager } from '../providers/manager/ProviderManager';
import { ProviderName } from '../providers/interfaces/IVideoProvider';

export const providerRoutes = Router();
const mgr = ProviderManager.instance;

// GET /api/providers
providerRoutes.get('/', (_req: Request, res: Response) => {
  res.json({ count: mgr.list().length, providers: mgr.list() });
});

// GET /api/providers/stats
providerRoutes.get('/stats', (_req: Request, res: Response) => {
  res.json({ activePollers: mgr.activeCount });
});

// POST /api/providers/:provider/create
providerRoutes.post('/:provider/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.params.provider as ProviderName;
    const { promptId } = req.body;
    if (!promptId) throw new AppError(400, 'promptId required');

    const { dbTaskId } = await mgr.submit(promptId, name);
    const task = await prisma.videoTask.findUnique({
      where: { id: dbTaskId },
      include: { prompt: { include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true } } } } } } } } },
    });
    res.status(201).json(task);
  } catch (e) { next(e); }
});

// POST /api/providers/submit-batch
providerRoutes.post('/submit-batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptIds } = req.body;
    if (!promptIds?.length) throw new AppError(400, 'promptIds[] required');
    const results = await mgr.submitBatch(promptIds);
    res.status(201).json({ count: results.length, ids: results.map(r => r.dbTaskId) });
  } catch (e) { next(e); }
});

// GET /api/providers/:provider/tasks
providerRoutes.get('/:provider/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await prisma.videoTask.findMany({
      where: { provider: req.params.provider },
      include: { prompt: { include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true } } } } } } } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    res.json(tasks);
  } catch (e) { next(e); }
});

// POST /api/providers/:provider/tasks/:id/retry
providerRoutes.post('/:provider/tasks/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.videoTask.findUnique({ where: { id: req.params.id } });
    if (!task) throw new AppError(404, 'Not found');
    await prisma.videoTask.update({ where: { id: req.params.id }, data: { status: 'pending', progress: 0, error: '', videoUrl: '', externalTaskId: '' } });
    const name = req.params.provider as ProviderName;
    await mgr.submit(task.promptId, name);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/providers/:provider/tasks/:id/cancel
providerRoutes.post('/:provider/tasks/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = mgr.cancel(req.params.id);
    if (ok) await prisma.videoTask.update({ where: { id: req.params.id }, data: { status: 'failed', error: 'Cancelled' } });
    res.json({ success: true, cancelled: ok });
  } catch (e) { next(e); }
});

// DELETE /api/providers/:provider/tasks/:id
providerRoutes.delete('/:provider/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    mgr.cancel(req.params.id);
    await prisma.videoTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
