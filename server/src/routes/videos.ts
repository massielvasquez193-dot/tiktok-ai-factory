import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';

export const videoRoutes = Router();

// GET /api/videos
videoRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId, status } = req.query;
    const where: Record<string, unknown> = {};
    if (campaignId) where.campaignId = campaignId as string;
    if (status) where.status = status as string;

    const videos = await prisma.video.findMany({
      where,
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(videos);
  } catch (err) { next(err); }
});

// PATCH /api/videos/:id
videoRoutes.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, url, localPath, duration, metadata } = req.body;
    const video = await prisma.video.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(url && { url }),
        ...(localPath && { localPath }),
        ...(duration && { duration }),
        ...(metadata && { metadata }),
      },
    });
    res.json(video);
  } catch (err) { next(err); }
});
