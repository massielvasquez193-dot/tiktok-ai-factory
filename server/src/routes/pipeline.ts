import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const pipelineRouter = Router();

/**
 * POST /api/pipeline/run
 *
 * Trigger the full pipeline for a product:
 *   1. Product Analysis
 *   2. Script Generation
 *   3. Storyboard
 *   4. AI Video (if configured)
 *
 * Body: { productId, languages?, scriptTypes?, generateVideo? }
 */
pipelineRouter.post('/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, languages, scriptTypes, generateVideo } = req.body;
    if (!productId) throw new AppError(400, 'productId is required');

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { painPoints: true, benefits: true },
    });
    if (!product) throw new AppError(404, 'Product not found');

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        id: uuid(),
        name: `${product.name} Pipeline Run`,
        productId,
        status: 'generating',
        config: {
          languages: languages || ['en'],
          scriptTypes: scriptTypes || ['ugc', 'review', 'problem_solution'],
          generateVideo: generateVideo !== false,
        },
        tasks: {
          create: [
            { id: uuid(), type: 'analyze_product', status: 'running', progress: 0 },
            { id: uuid(), type: 'generate_scripts', status: 'queued', progress: 0 },
            { id: uuid(), type: 'generate_storyboard', status: 'queued', progress: 0 },
            ...(generateVideo !== false
              ? [{ id: uuid(), type: 'generate_video', status: 'queued', progress: 0 }]
              : []),
          ],
        },
      },
      include: { tasks: true },
    });

    // The actual pipeline execution would be handled by BullMQ workers.
    // For now, we return the campaign ID for polling.

    res.status(202).json({
      message: 'Pipeline triggered',
      campaignId: campaign.id,
      tasks: campaign.tasks,
    });
  } catch (err) { next(err); }
});

// GET /api/pipeline/status/:campaignId
pipelineRouter.get('/status/:campaignId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.campaignId },
      include: { tasks: true, videos: true },
    });
    if (!campaign) throw new AppError(404, 'Campaign not found');

    const completed = campaign.tasks.filter(t => t.status === 'completed').length;
    const total = campaign.tasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      campaignId: campaign.id,
      status: campaign.status,
      progress,
      completed,
      total,
      tasks: campaign.tasks,
      videos: campaign.videos,
    });
  } catch (err) { next(err); }
});
