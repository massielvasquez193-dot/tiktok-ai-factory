import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const postProductionRoutes = Router();

const CTA_TEXTS: Record<string, Record<string, string>> = {
  en: { buy: 'Buy Now', shop: 'Shop Now', limited: 'Limited Time', get: 'Get Yours Today' },
  ms: { buy: 'Beli Sekarang', shop: 'Beli Sekarang', limited: 'Masa Terhad', get: 'Dapatkan Hari Ini' },
  th: { buy: 'ซื้อเลย', shop: 'ซื้อเลย', limited: 'เวลาจำากัด', get: 'รับของคุณวันนี้' },
  fil: { buy: 'Bili Na', shop: 'Bili Na', limited: 'Limitadong Oras', get: 'Kunin Ngayon' },
  vi: { buy: 'Mua Ngay', shop: 'Mua Ngay', limited: 'Thời Gian Có Hạn', get: 'Nhận Ngay Hôm Nay' },
  id: { buy: 'Beli Sekarang', shop: 'Beli Sekarang', limited: 'Waktu Terbatas', get: 'Dapatkan Hari Ini' },
};

const BGM_OPTIONS = ['tiktok_trending', 'corporate', 'beauty', 'lifestyle'];

postProductionRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await prisma.postProduction.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e) { next(e); }
});

postProductionRoutes.get('/config', (_req: Request, res: Response) => {
  res.json({ ctas: CTA_TEXTS, bgms: BGM_OPTIONS, logoPositions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] });
});

postProductionRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await prisma.postProduction.findUnique({ where: { id: req.params.id } });
    if (!p) throw new AppError(404, 'Not found'); res.json(p);
  } catch (e) { next(e); }
});

postProductionRoutes.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoId, country, language, ctaType, priceTag, discountTag, logoPosition, bgm, subtitle } = req.body;
    if (!videoId) throw new AppError(400, 'videoId required');

    const lang = language || 'en';
    const ctry = country || 'US';
    const ctaText = CTA_TEXTS[lang]?.[ctaType || 'buy'] || CTA_TEXTS.en.buy;

    // Get video info
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    const product = video ? await prisma.product.findUnique({ where: { id: video.productId }, select: { product_name: true, price: true } }) : null;

    const record = await prisma.postProduction.create({
      data: {
        id: uuid(),
        videoId,
        subtitle: subtitle || 'auto',
        cta: ctaText,
        priceTag: priceTag || (product?.price || '$XX'),
        discountTag: discountTag || '',
        logo: logoPosition || 'top-right',
        bgm: bgm || 'tiktok_trending',
        thumbnail: '',
        status: 'raw',
        country: ctry,
        language: lang,
        outputPath: '',
      },
    });

    res.status(201).json(record);
  } catch (e) { next(e); }
});

postProductionRoutes.post('/render', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.body;
    if (!id) throw new AppError(400, 'id required');

    const pp = await prisma.postProduction.findUnique({ where: { id } });
    if (!pp) throw new AppError(404, 'Not found');

    // Mark as rendering
    await prisma.postProduction.update({ where: { id }, data: { status: 'rendering' } });

    // Mock render (in production, call FFmpeg)
    const outDir = path.resolve(process.cwd(), '..', '..', 'videos', 'final');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = `post_${id.slice(0, 8)}.mp4`;
    const outPath = path.join(outDir, outFile);

    // Simulate render
    await prisma.postProduction.update({
      where: { id },
      data: {
        status: 'edited',
        outputPath: '/videos/final/' + outFile,
        thumbnail: '/videos/final/' + outFile.replace('.mp4', '_thumb.jpg'),
      },
    });

    // Create thumbnail placeholder
    const thumbDir = path.join(outDir, 'thumbs');
    fs.mkdirSync(thumbDir, { recursive: true });

    // Sync to Video Library
    const video = await prisma.video.findUnique({ where: { id: pp.videoId } });
    if (video) {
      await prisma.video.create({
        data: {
          id: uuid(), taskId: null, productId: video.productId, provider: 'post-production',
          title: (video.title || 'Video') + ' [Edited]', videoUrl: '/videos/final/' + outFile,
          thumbnailUrl: '/videos/final/' + outFile.replace('.mp4', '_thumb.jpg'),
          duration: video.duration || 15, size: 0, status: 'completed',
        },
      });
    }

    res.json({ status: 'completed', outputPath: '/videos/final/' + outFile });
  } catch (e) { next(e); }
});

postProductionRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.postProduction.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { next(e); }
});

import path from 'path';
import fs from 'fs';
