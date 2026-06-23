import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { v4 as uuid } from 'uuid';
import * as cron from 'node-cron';
import { serializeMetadata, deserializeMetadata } from '../lib/video-downloader';
import { ProviderManager } from '../providers/manager/ProviderManager';

export const automationTaskRoutes = Router();

// Active cron jobs by taskId
const activeJobs = new Map<string, cron.ScheduledTask>();

// ── CRUD ────────────────────────────────────────────────────────────────

automationTaskRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const tasks = await prisma.automationTask.findMany({
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 20 } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

automationTaskRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await prisma.automationTask.findUnique({
      where: { id: req.params.id },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

automationTaskRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, intervalMinutes, countries, productIds } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const task = await prisma.automationTask.create({
      data: {
        id: uuid(), name,
        startTime: startTime || '08:00', endTime: endTime || '18:00',
        intervalMinutes: intervalMinutes || 60,
        countries: serializeMetadata(countries || ['US']),
        productIds: serializeMetadata(productIds || []),
        enabled: true, status: 'idle', totalRuns: 0, successRuns: 0,
      },
    });
    res.status(201).json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

automationTaskRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, intervalMinutes, countries, productIds, enabled } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (startTime) data.startTime = startTime;
    if (endTime) data.endTime = endTime;
    if (intervalMinutes) data.intervalMinutes = intervalMinutes;
    if (countries) data.countries = serializeMetadata(countries);
    if (productIds) data.productIds = serializeMetadata(productIds);
    if (enabled !== undefined) { data.enabled = enabled; data.status = enabled ? 'idle' : 'paused'; }
    const task = await prisma.automationTask.update({ where: { id: req.params.id }, data });
    res.json(task);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

automationTaskRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    stopCron(req.params.id);
    await prisma.automationTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Task Controls ───────────────────────────────────────────────────────

automationTaskRoutes.post('/:id/start', async (req: Request, res: Response) => {
  try {
    await prisma.automationTask.update({ where: { id: req.params.id }, data: { enabled: true, status: 'running' } });
    startCron(req.params.id);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

automationTaskRoutes.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    await prisma.automationTask.update({ where: { id: req.params.id }, data: { enabled: false, status: 'paused' } });
    stopCron(req.params.id);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

automationTaskRoutes.post('/:id/run-now', async (req: Request, res: Response) => {
  try {
    executeTask(req.params.id).catch(err => console.error('Auto execute error:', err));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Cron Engine ─────────────────────────────────────────────────────────

function startCron(taskId: string) {
  stopCron(taskId);
  const job = cron.schedule('* * * * *', async () => {
    try {
      const task = await prisma.automationTask.findUnique({ where: { id: taskId } });
      if (!task || !task.enabled) { stopCron(taskId); return; }

      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      if (currentTime < task.startTime || currentTime > task.endTime) return;

      const lastRun = task.lastRunAt ? new Date(task.lastRunAt).getTime() : 0;
      if (now.getTime() - lastRun < task.intervalMinutes * 60000) return;

      await executeTask(taskId);
    } catch { /* skip */ }
  });
  activeJobs.set(taskId, job);
  console.log(`[Cron] Started task ${taskId}`);
}

function stopCron(taskId: string) {
  const job = activeJobs.get(taskId);
  if (job) { job.stop(); activeJobs.delete(taskId); console.log(`[Cron] Stopped task ${taskId}`); }
}

async function executeTask(taskId: string) {
  const task = await prisma.automationTask.findUnique({ where: { id: taskId } });
  if (!task) return;

  const API = 'http://localhost:' + (process.env.PORT || 4002);
  const countries = deserializeMetadata<string[]>(task.countries);
  const productIds = deserializeMetadata<string[]>(task.productIds);
  const products = productIds.length > 0 ? await prisma.product.findMany({ where: { id: { in: productIds } } }) : await prisma.product.findMany({ take: 1 });

  for (const product of products) {
    const t0 = Date.now();

    // Step 1: Research
    await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'research', status: 'running', message: 'Researching trends...' } });
    try { await fetch(API + '/api/research/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: 'https://www.tiktok.com/tag/' + encodeURIComponent(product.category) }) }); } catch {}
    await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'research', status: 'completed', message: 'Research done', duration: Math.round((Date.now() - t0) / 1000) } });

    // Step 2: Scripts
    await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'scripts', status: 'running', message: 'Generating scripts...' } });
    for (const country of countries) {
      for (const st of ['ugc', 'review', 'pov']) {
        try { await fetch(API + '/api/scripts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, scriptTypes: [st], languages: [country === 'US' ? 'en' : 'ms'] }) }); } catch {}
      }
    }
    await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'scripts', status: 'completed', message: 'Scripts generated' } });

    // Step 3: Prompts + Seedance (via ProviderManager)
    await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'video', status: 'running', message: 'Calling Seedance...' } });
    const prompts = await prisma.prompt.findMany({ take: 3 });
    for (const p of prompts) {
      try { await ProviderManager.instance.submit(p.id, 'seedance'); } catch {}
    }
    await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'video', status: 'completed', message: 'Video tasks submitted' } });

    // Step 4: Post Production
    const videos = await prisma.video.findMany({ take: 1 });
    if (videos[0]) {
      await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'post', status: 'running', message: 'Running post production...' } });
      try { await fetch(API + '/api/post-production/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: videos[0].id, country: 'US', language: 'en', ctaType: 'buy', priceTag: product.price }) }); } catch {}
      await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'post', status: 'completed', message: 'Post production done' } });
    }
  }

  const duration = Math.round((Date.now() - (task.lastRunAt?.getTime() || Date.now())) / 1000);
  await prisma.automationTask.update({ where: { id: taskId }, data: { totalRuns: { increment: 1 }, successRuns: { increment: 1 }, lastRunAt: new Date(), nextRunAt: new Date(Date.now() + task.intervalMinutes * 60000) } });
  await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'complete', status: 'completed', message: 'Pipeline complete', duration } });
}

// ── Restore cron jobs on startup ────────────────────────────────────────

export function restoreAutomationTasks() {
  prisma.automationTask.findMany({ where: { enabled: true } }).then(tasks => {
    for (const task of tasks) startCron(task.id);
    console.log(`[Cron] Restored ${tasks.length} automation tasks`);
  }).catch(err => console.error('[Cron] Restore error:', err));
}
