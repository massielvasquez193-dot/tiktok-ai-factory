import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';
import { serializeMetadata } from '../lib/video-downloader';

export const videoTaskRoutes = Router();

// ── Mock Video Generator ────────────────────────────────────────────────

function mockGenerate(): { status: string; progress: number; videoUrl: string; delay: number } {
  const success = Math.random() > 0.15; // 85% success rate
  if (success) {
    const scenes = ['hook', 'demo', 'lifestyle', 'closeup', 'cta'];
    const scene = scenes[Math.floor(Math.random() * scenes.length)];
    return {
      status: 'completed',
      progress: 100,
      videoUrl: `https://storage.example.com/videos/mock_${scene}_${Date.now()}.mp4`,
      delay: 2000 + Math.random() * 3000,
    };
  }
  return {
    status: 'failed',
    progress: Math.floor(Math.random() * 60) + 10,
    videoUrl: '',
    delay: 1000 + Math.random() * 2000,
  };
}

async function processTask(taskId: string): Promise<void> {
  const result = mockGenerate();
  await new Promise(r => setTimeout(r, 500)); // simulate API delay

  // Build metadata object — store meaningful debug info, not just a raw string
  const metadataPayload: Record<string, unknown> = {
    provider: 'seedance',
    model: 'doubao-seedance-2-0-260128',
    resolution: '720p',
    mode: 'mock',
    completedAt: new Date().toISOString(),
  };

  await prisma.videoTask.update({
    where: { id: taskId },
    data: {
      status: result.status,
      progress: result.progress,
      videoUrl: result.videoUrl,
      error: result.status === 'failed' ? 'Generation timed out. The model returned a partial render.' : '',
      metadata: serializeMetadata(metadataPayload),
    },
  });
}

// ── Routes ──────────────────────────────────────────────────────────────

// GET /api/video-tasks
videoTaskRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptId, model, status } = req.query;
    const where: any = {};
    if (promptId) where.promptId = promptId;
    if (model) where.model = model;
    if (status) where.status = status;

    const tasks = await prisma.videoTask.findMany({
      where,
      include: { prompt: { include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true } } } } } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(tasks);
  } catch (e) { next(e); }
});

// GET /api/video-tasks/:id
videoTaskRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.videoTask.findUnique({
      where: { id: req.params.id },
      include: { prompt: { include: { storyboard: { include: { script: { include: { product: true } } } } } } },
    });
    if (!t) throw new AppError(404, 'Task not found');
    res.json(t);
  } catch (e) { next(e); }
});

// POST /api/video-tasks/create
videoTaskRoutes.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptId, model } = req.body;
    if (!promptId) throw new AppError(400, 'promptId required');

    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new AppError(404, 'Prompt not found');

    const task = await prisma.videoTask.create({
      data: {
        id: uuid(),
        promptId,
        model: model || prompt.model || 'seedance',
        status: 'pending',
        progress: 0,
      },
      include: { prompt: { include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true } } } } } } } } },
    });

    // Start async processing
    processTask(task.id).catch(err => console.error('Task processing error:', err));

    res.status(201).json(task);
  } catch (e) { next(e); }
});

// POST /api/video-tasks/create-bulk
videoTaskRoutes.post('/create-bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promptIds, model } = req.body;
    if (!promptIds?.length) throw new AppError(400, 'promptIds[] required');

    const created: any[] = [];
    for (const promptId of promptIds) {
      const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
      if (!prompt) continue;

      const task = await prisma.videoTask.create({
        data: {
          id: uuid(),
          promptId,
          model: model || prompt.model || 'seedance',
          status: 'pending',
          progress: 0,
        },
        include: { prompt: { include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true } } } } } } } } },
      });
      created.push(task);
      processTask(task.id).catch(err => console.error('Task processing error:', err));
    }

    res.status(201).json({ count: created.length, tasks: created });
  } catch (e) { next(e); }
});

// POST /api/video-tasks/:id/retry
videoTaskRoutes.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.videoTask.update({
      where: { id: req.params.id },
      data: { status: 'pending', progress: 0, error: '', videoUrl: '' },
    });
    processTask(task.id).catch(err => console.error('Retry error:', err));
    res.json(task);
  } catch (e) { next(e); }
});

// DELETE /api/video-tasks/:id
videoTaskRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.videoTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
