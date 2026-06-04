import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const campaignRoutes = Router();

// GET /api/campaigns
campaignRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: { product: true, videos: true, tasks: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (err) { next(err); }
});

// GET /api/campaigns/:id
campaignRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: { product: true, videos: true, tasks: true },
    });
    if (!campaign) throw new AppError(404, 'Campaign not found');
    res.json(campaign);
  } catch (err) { next(err); }
});

// POST /api/campaigns
campaignRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, name, languages, scriptTypes } = req.body;
    if (!productId) throw new AppError(400, 'productId is required');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError(404, 'Product not found');

    const campaign = await prisma.campaign.create({
      data: {
        id: uuid(),
        name: name || `${product.name} Campaign`,
        productId,
        status: 'draft',
        config: {
          languages: languages || ['en'],
          scriptTypes: scriptTypes || ['ugc', 'review'],
        },
        tasks: {
          create: [
            { id: uuid(), type: 'analyze_product', status: 'queued', progress: 0 },
            { id: uuid(), type: 'generate_scripts', status: 'queued', progress: 0 },
            { id: uuid(), type: 'generate_storyboard', status: 'queued', progress: 0 },
          ],
        },
      },
      include: { tasks: true },
    });

    res.status(201).json(campaign);
  } catch (err) { next(err); }
});

// PATCH /api/campaigns/:id/status
campaignRoutes.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError(400, 'status is required');

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(campaign);
  } catch (err) { next(err); }
});

// PATCH /api/campaigns/:id/tasks/:taskId
campaignRoutes.patch('/:id/tasks/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, progress, result } = req.body;
    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        ...(status && { status }),
        ...(progress !== undefined && { progress }),
        ...(result && { result }),
      },
    });
    res.json(task);
  } catch (err) { next(err); }
});

// DELETE /api/campaigns/:id
campaignRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
