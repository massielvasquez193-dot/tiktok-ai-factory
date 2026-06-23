import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const productRoutes = Router();

// ── Upload config ──────────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(process.cwd(), '..', '..', 'uploads', 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(null, ok);
  },
});

// ── CRUD ───────────────────────────────────────────────────────────────

// GET /api/products — list all
productRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      include: { images: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(products);
  } catch (e) { next(e); }
});

// GET /api/products/:id — single product
productRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    if (!p) throw new AppError(404, 'Product not found');
    res.json(p);
  } catch (e) { next(e); }
});

// POST /api/products — create
productRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product_name, brand, category, target_country, benefits, ingredients, price } = req.body;
    if (!product_name) throw new AppError(400, 'product_name is required');

    const p = await prisma.product.create({
      data: {
        id: uuid(),
        product_name,
        brand: brand || '',
        category: category || 'General',
        target_country: target_country || 'US',
        benefits: Array.isArray(benefits) ? JSON.stringify(benefits) : (benefits || '[]'),
        ingredients: Array.isArray(ingredients) ? JSON.stringify(ingredients) : (ingredients || '[]'),
        price: price || '$0',
      },
      include: { images: true },
    });
    res.status(201).json(p);
  } catch (e) { next(e); }
});

// PUT /api/products/:id — update
productRoutes.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product_name, brand, category, target_country, benefits, ingredients, price, status } = req.body;
    const data: any = {};
    if (product_name !== undefined) data.product_name = product_name;
    if (brand !== undefined) data.brand = brand;
    if (category !== undefined) data.category = category;
    if (target_country !== undefined) data.target_country = target_country;
    if (benefits !== undefined) data.benefits = Array.isArray(benefits) ? JSON.stringify(benefits) : benefits;
    if (ingredients !== undefined) data.ingredients = Array.isArray(ingredients) ? JSON.stringify(ingredients) : ingredients;
    if (price !== undefined) data.price = price;
    if (status !== undefined) data.status = status;

    const p = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { images: { orderBy: { order: 'asc' } } },
    });
    res.json(p);
  } catch (e) { next(e); }
});

// DELETE /api/products/:id
productRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Delete image files
    const images = await prisma.productImage.findMany({ where: { productId: req.params.id } });
    for (const img of images) {
      const filePath = path.join(UPLOAD_DIR, path.basename(img.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Images ─────────────────────────────────────────────────────────────

// POST /api/products/:id/images — upload images
productRoutes.post('/:id/images', upload.array('images', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw new AppError(400, 'No images uploaded');

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new AppError(404, 'Product not found');

    const maxOrder = await prisma.productImage.aggregate({ where: { productId: req.params.id }, _max: { order: true } });
    let nextOrder = (maxOrder._max.order ?? -1) + 1;

    const images = await Promise.all(
      files.map((f, i) =>
        prisma.productImage.create({
          data: {
            id: uuid(),
            filename: f.originalname,
            url: `/uploads/products/${f.filename}`,
            size: f.size,
            order: nextOrder + i,
            productId: req.params.id,
          },
        })
      )
    );

    res.status(201).json(images);
  } catch (e) { next(e); }
});

// DELETE /api/products/:id/images/:imageId
productRoutes.delete('/:id/images/:imageId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const img = await prisma.productImage.findUnique({ where: { id: req.params.imageId } });
    if (!img) throw new AppError(404, 'Image not found');

    const filePath = path.join(UPLOAD_DIR, path.basename(img.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.productImage.delete({ where: { id: req.params.imageId } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
