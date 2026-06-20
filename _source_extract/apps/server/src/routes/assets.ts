import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = path.resolve(process.cwd(), '..', '..', 'uploads', 'assets');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'].includes(file.mimetype);
    cb(null, ok);
  },
});

export const assetRoutes = Router();

// GET /api/assets — list with filters
assetRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, category, country, language, search } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (country) where.country = country;
    if (language) where.language = language;
    if (search) where.name = { contains: search as string };

    const items = await prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    res.json(items);
  } catch (e) { next(e); }
});

// GET /api/assets/meta — filter options
assetRoutes.get('/meta', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const assets = await prisma.asset.findMany({ select: { type: true, category: true, country: true, language: true } });
    const types = [...new Set(assets.map(a => a.type))];
    const categories = [...new Set(assets.map(a => a.category))];
    const countries = [...new Set(assets.map(a => a.country).filter(Boolean))];
    const languages = [...new Set(assets.map(a => a.language).filter(Boolean))];
    res.json({ types, categories, countries, languages });
  } catch (e) { next(e); }
});

// POST /api/assets/upload — upload files
assetRoutes.post('/upload', upload.array('files', 20), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) throw new AppError(400, 'No files');

    const { category, country, language, tags } = req.body;

    const created = await Promise.all(
      files.map(f => {
        const isVideo = f.mimetype.startsWith('video/');
        return prisma.asset.create({
          data: {
            id: uuid(),
            name: f.originalname,
            type: isVideo ? 'video' : 'image',
            category: category || 'product',
            country: country || '',
            language: language || '',
            tags: tags || '',
            fileUrl: `/uploads/assets/${f.filename}`,
            size: f.size,
          },
        });
      })
    );

    res.status(201).json({ count: created.length, assets: created });
  } catch (e) { next(e); }
});

// DELETE /api/assets/:id
assetRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw new AppError(404, 'Not found');

    const filePath = path.join(UPLOAD_DIR, path.basename(asset.fileUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.asset.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /api/assets — bulk delete
assetRoutes.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) throw new AppError(400, 'ids[] required');

    const assets = await prisma.asset.findMany({ where: { id: { in: ids } } });
    for (const a of assets) {
      const fp = path.join(UPLOAD_DIR, path.basename(a.fileUrl));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await prisma.asset.deleteMany({ where: { id: { in: ids } } });
    res.json({ success: true, deleted: ids.length });
  } catch (e) { next(e); }
});
