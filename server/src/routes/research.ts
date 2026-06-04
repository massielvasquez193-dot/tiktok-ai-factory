import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

export const researchRoutes = Router();

// GET /api/research/videos
researchRoutes.get('/videos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword, platform, limit } = req.query;
    const where: Record<string, unknown> = {};
    if (keyword) where.keyword = { contains: keyword as string };
    if (platform) where.platform = platform as string;

    const videos = await prisma.viralVideo.findMany({
      where,
      orderBy: { views: 'desc' },
      take: Number(limit) || 50,
    });
    res.json(videos);
  } catch (err) { next(err); }
});

// GET /api/research/templates
researchRoutes.get('/templates', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.viralTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) { next(err); }
});
