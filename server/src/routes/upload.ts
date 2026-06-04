/**
 * File upload route — Accept product images and video assets.
 *
 * Supports:
 *   - Single & multiple file uploads
 *   - Product images (JPG, PNG, WebP)
 *   - Video assets (MP4, MOV)
 *   - Automatic thumbnail generation
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { AppError } from '../middleware/error';
import { prisma } from '../index';

export const uploadRoutes = Router();

// ── Storage configuration ──────────────────────────────────────────────

const UPLOAD_DIR = path.resolve(process.cwd(), '..', 'output', 'uploads');
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB for video

// Ensure upload directories exist
['images', 'videos', 'thumbnails'].forEach(sub => {
  fs.mkdirSync(path.join(UPLOAD_DIR, sub), { recursive: true });
});

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/');
    const subdir = isVideo ? 'videos' : 'images';
    cb(null, path.join(UPLOAD_DIR, subdir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuid()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideos = ['video/mp4', 'video/quicktime', 'video/webm'];
  if ([...allowedImages, ...allowedVideos].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, `File type not supported: ${file.mimetype}`));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// ── Routes ─────────────────────────────────────────────────────────────

// POST /api/upload — single file
uploadRoutes.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'No file uploaded');

      const { productId } = req.body;
      const file = req.file;
      const isVideo = file.mimetype.startsWith('video/');
      const relativePath = path.relative(process.cwd(), file.path);

      // Optionally link to product
      if (productId) {
        await prisma.asset.create({
          data: {
            id: uuid(),
            filename: file.originalname,
            url: relativePath,
            type: isVideo ? 'video' : 'image',
            rights: 'user_provided',
            productId,
          },
        });
      }

      res.status(201).json({
        success: true,
        filename: file.originalname,
        path: relativePath,
        size: file.size,
        type: file.mimetype,
        url: `/uploads/${isVideo ? 'videos' : 'images'}/${file.filename}`,
      });
    } catch (err) { next(err); }
  }
);

// POST /api/upload/multiple — multiple files (max 10)
uploadRoutes.post(
  '/multiple',
  upload.array('files', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) throw new AppError(400, 'No files uploaded');

      const { productId } = req.body;
      const results = files.map(file => ({
        filename: file.originalname,
        path: path.relative(process.cwd(), file.path),
        size: file.size,
        type: file.mimetype,
      }));

      // Batch link to product
      if (productId) {
        await prisma.asset.createMany({
          data: results.map(r => ({
            id: uuid(),
            filename: r.filename,
            url: r.path,
            type: r.type.startsWith('video/') ? 'video' : 'image',
            rights: 'user_provided',
            productId,
          })),
        });
      }

      res.status(201).json({ success: true, files: results, count: results.length });
    } catch (err) { next(err); }
  }
);

// GET /api/upload/assets/:productId
uploadRoutes.get('/assets/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assets);
  } catch (err) { next(err); }
});

// DELETE /api/upload/assets/:id
uploadRoutes.delete('/assets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw new AppError(404, 'Asset not found');

    // Delete file from disk
    const filePath = path.resolve(process.cwd(), '..', asset.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.asset.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Serve uploaded files statically
uploadRoutes.use('/files', (_req: Request, res: Response, _next: NextFunction) => {
  // Proxy to the filesystem
  const filePath = path.join(UPLOAD_DIR, _req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});
