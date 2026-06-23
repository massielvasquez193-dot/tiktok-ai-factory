import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

export const publishRoutes = Router();

publishRoutes.get('/', async (_req: Request, res: Response) => {
  try { res.json(await prisma.publishTask.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

publishRoutes.get('/:id', async (req: Request, res: Response) => {
  try { const t = await prisma.publishTask.findUnique({ where: { id: req.params.id } }); if (!t) return res.status(404).json({ error: 'Not found' }); res.json(t); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

publishRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { videoId, accountCookie, proxy, country, title, hashtags, scheduledAt } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId required' });
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    const product = video ? await prisma.product.findUnique({ where: { id: video.productId } }) : null;
    const task = await prisma.publishTask.create({
      data: {
        id: uuid(), videoId,
        accountCookie: accountCookie || '', proxy: proxy || '',
        country: country || 'US',
        title: title || (product?.product_name || 'Product') + ' Review',
        hashtags: hashtags || '#tiktokmademebuyit #viral #musthave',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'draft',
      },
    });
    res.status(201).json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

publishRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, hashtags, scheduledAt, accountCookie, proxy, country } = req.body;
    const data: any = {};
    if (title) data.title = title;
    if (hashtags) data.hashtags = hashtags;
    if (scheduledAt) { data.scheduledAt = new Date(scheduledAt); data.status = 'scheduled'; }
    if (accountCookie !== undefined) data.accountCookie = accountCookie;
    if (proxy !== undefined) data.proxy = proxy;
    if (country) data.country = country;
    const task = await prisma.publishTask.update({ where: { id: req.params.id }, data });
    res.json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

publishRoutes.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const task = await prisma.publishTask.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Not found' });
    // Mock publish — in production, this would use Puppeteer/Playwright with the account cookie + proxy
    const success = Math.random() > 0.2;
    await prisma.publishTask.update({
      where: { id: req.params.id },
      data: { status: success ? 'published' : 'failed', error: success ? '' : 'Network timeout. Check proxy settings.' },
    });
    res.json({ success });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

publishRoutes.delete('/:id', async (req: Request, res: Response) => {
  try { await prisma.publishTask.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Bulk publish
publishRoutes.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'ids[] required' });
    let ok = 0; let fail = 0;
    for (const id of ids) {
      try {
        const success = Math.random() > 0.2;
        await prisma.publishTask.update({ where: { id }, data: { status: success ? 'published' : 'failed' } });
        if (success) ok++; else fail++;
      } catch { fail++; }
    }
    res.json({ ok, fail });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
