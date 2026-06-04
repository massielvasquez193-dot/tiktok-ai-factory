import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const scriptRoutes = Router();

// GET /api/scripts
scriptRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, type, language } = req.query;
    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId as string;
    if (type) where.scriptType = type as string;
    if (language) where.language = language as string;

    const scripts = await prisma.script.findMany({
      where,
      include: { product: true, storyboards: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(scripts);
  } catch (err) { next(err); }
});

// GET /api/scripts/:id
scriptRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const script = await prisma.script.findUnique({
      where: { id: req.params.id },
      include: { product: true, storyboards: true },
    });
    if (!script) throw new AppError(404, 'Script not found');
    res.json(script);
  } catch (err) { next(err); }
});

// POST /api/scripts
scriptRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, scriptType, language, content } = req.body;
    if (!productId || !scriptType || !content) {
      throw new AppError(400, 'productId, scriptType, and content are required');
    }

    const script = await prisma.script.create({
      data: {
        id: uuid(),
        productId,
        scriptType: scriptType || 'ugc',
        language: language || 'en',
        content,
        status: 'generated',
      },
    });
    res.status(201).json(script);
  } catch (err) { next(err); }
});

// DELETE /api/scripts/:id
scriptRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.script.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
