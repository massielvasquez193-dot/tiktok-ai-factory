import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = path.resolve(process.cwd(), '..', '..', 'uploads', 'asset_library');
const TYPES = ['product_image', 'product_video', 'ugc_talking', 'broll', 'brand_logo', 'competitor_video'];
TYPES.forEach(d => fs.mkdirSync(path.join(UPLOAD_DIR, d), { recursive: true }));

const storage = multer.diskStorage({
  destination: (req, _file, cb) => { const t = (req.body?.type || 'product_image').toString(); cb(null, path.join(UPLOAD_DIR, t)); },
  filename: (_req, file, cb) => cb(null, uuid() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

export const assetLibraryRoutes = Router();

assetLibraryRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, productId, country, search } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (productId) where.productId = productId;
    if (country) where.country = country;
    if (search) where.name = { contains: search as string };
    const items = await prisma.assetLibrary.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    const products = await prisma.product.findMany({ select: { id: true, product_name: true } });
    res.json({ items, products, types: TYPES.map(v => ({ value: v, label: v.replace(/_/g, ' ') })) });
  } catch (e) { next(e); }
});

assetLibraryRoutes.post('/upload', upload.array('files', 20), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw new AppError(400, 'No files');
    const { type, productId, country, tags } = req.body;
    const created = await Promise.all(files.map(f => prisma.assetLibrary.create({
      data: { id: uuid(), name: f.originalname, type: type || 'product_image', fileUrl: '/uploads/asset_library/' + (type || 'product_image') + '/' + f.filename, size: f.size, tags: tags || '', productId: productId || null, country: country || '' },
    })));
    res.status(201).json({ count: created.length, assets: created });
  } catch (e) { next(e); }
});

assetLibraryRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const a = await prisma.assetLibrary.findUnique({ where: { id: req.params.id } });
    if (!a) throw new AppError(404, 'Not found');
    const fp = path.resolve(process.cwd(), '..', '..', a.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    await prisma.assetLibrary.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

assetLibraryRoutes.post('/bulk-delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) throw new AppError(400, 'ids[] required');
    const assets = await prisma.assetLibrary.findMany({ where: { id: { in: ids } } });
    for (const a of assets) { const fp = path.resolve(process.cwd(), '..', '..', a.fileUrl.replace(/^\//, '')); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
    await prisma.assetLibrary.deleteMany({ where: { id: { in: ids } } });
    res.json({ success: true, deleted: ids.length });
  } catch (e) { next(e); }
});
