import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const productRoutes = Router();

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().default('General'),
  price: z.string().default('$XX.XX'),
  offer: z.string().optional(),
  salesPage: z.string().optional(),
  country: z.string().default('US'),
  persona: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  brief: z.any().optional(),
});

// GET /api/products
productRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      include: { painPoints: true, benefits: true, _count: { select: { scripts: true, campaigns: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(products);
  } catch (err) { next(err); }
});

// GET /api/products/:id
productRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        painPoints: true, benefits: true, assets: true,
        scripts: { include: { storyboards: true } },
        campaigns: { include: { videos: true, tasks: true } },
      },
    });
    if (!product) throw new AppError(404, 'Product not found');
    res.json(product);
  } catch (err) { next(err); }
});

// POST /api/products
productRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        id: uuid(),
        name: data.name,
        category: data.category,
        price: data.price,
        offer: data.offer || '',
        salesPage: data.salesPage || '',
        country: data.country,
        persona: data.persona || '',
        brief: data.brief || {},
        painPoints: data.painPoints?.length
          ? { create: data.painPoints.map((t: string) => ({ id: uuid(), text: t })) }
          : undefined,
        benefits: data.benefits?.length
          ? { create: data.benefits.map((t: string) => ({ id: uuid(), text: t })) }
          : undefined,
      },
      include: { painPoints: true, benefits: true },
    });

    res.status(201).json(product);
  } catch (err) { next(err); }
});

// PUT /api/products/:id
productRoutes.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, category, price, offer, salesPage, country, persona, status, painPoints, benefits } = req.body;

    // Update product fields
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(price && { price }),
        ...(offer !== undefined && { offer }),
        ...(salesPage !== undefined && { salesPage }),
        ...(country && { country }),
        ...(persona !== undefined && { persona }),
        ...(status && { status }),
      },
    });

    // Update pain points if provided
    if (painPoints) {
      await prisma.painPoint.deleteMany({ where: { productId: req.params.id } });
      if (painPoints.length > 0) {
        await prisma.painPoint.createMany({
          data: painPoints.map((t: string) => ({ id: uuid(), text: t, productId: req.params.id })),
        });
      }
    }

    // Update benefits if provided
    if (benefits) {
      await prisma.benefit.deleteMany({ where: { productId: req.params.id } });
      if (benefits.length > 0) {
        await prisma.benefit.createMany({
          data: benefits.map((t: string) => ({ id: uuid(), text: t, productId: req.params.id })),
        });
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { painPoints: true, benefits: true },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/products/:id
productRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});
