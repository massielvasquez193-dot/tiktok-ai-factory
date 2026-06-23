import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

export const automationRoutes = Router();

automationRoutes.get('/', async (_req: Request, res: Response) => {
  try { res.json(await prisma.automationJob.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e:any) { res.status(500).json({error:e.message}); }
});

automationRoutes.get('/config', (_req: Request, res: Response) => {
  res.json({ agents: ['research','campaign','tiktok_agent','post_production','publishing'], intervals: [15,30,60,120] });
});

automationRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { name, agentType, countries, productId, enabled, intervalMinutes, startTime, endTime } = req.body;
    if (!name || !agentType) return res.status(400).json({error:'name + agentType required'});
    const nextRun = new Date(Date.now() + (intervalMinutes||60)*60000);
    const job = await prisma.automationJob.create({
      data: { id: uuid(), name, agentType, countries: JSON.stringify(countries||['US']), productId: productId||null, enabled: enabled!==false, status: 'waiting', intervalMinutes: intervalMinutes||60, startTime: startTime||'08:00', endTime: endTime||'18:00', nextRunAt: nextRun, totalRuns:0, successRuns:0, result:'{}' },
    });
    res.status(201).json(job);
  } catch (e:any) { res.status(500).json({error:e.message}); }
});

automationRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { enabled, status, intervalMinutes, startTime, endTime, countries } = req.body;
    const data: any = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (status) data.status = status;
    if (intervalMinutes) data.intervalMinutes = intervalMinutes;
    if (startTime) data.startTime = startTime;
    if (endTime) data.endTime = endTime;
    if (countries) data.countries = JSON.stringify(countries);
    const job = await prisma.automationJob.update({ where: { id: req.params.id }, data });
    res.json(job);
  } catch (e:any) { res.status(500).json({error:e.message}); }
});

automationRoutes.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const job = await prisma.automationJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({error:'Not found'});
    const API = 'http://localhost:' + (process.env.PORT || 4002);
    const cs = JSON.parse(job.countries);
    let success = true;
    try {
      if (job.agentType === 'tiktok_agent') {
        const product = job.productId ? await prisma.product.findUnique({ where: { id: job.productId } }) : await prisma.product.findFirst();
        if (product) await fetch(API + '/api/agent/run', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ productId: product.id, countries: cs, name: job.name + ' Auto', scriptCount: 3 }) });
      } else if (job.agentType === 'campaign') {
        const product = job.productId ? await prisma.product.findUnique({ where: { id: job.productId } }) : await prisma.product.findFirst();
        if (product) await fetch(API + '/api/campaigns-v2', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: job.name, productId: product.id, countries: cs, videosPerCountry: 2 }) });
      }
    } catch { success = false; }
    const nextRun = new Date(Date.now() + job.intervalMinutes * 60000);
    await prisma.automationJob.update({ where: { id: job.id }, data: { status: 'waiting', lastRunAt: new Date(), nextRunAt: nextRun, totalRuns: { increment: 1 }, successRuns: success ? { increment: 1 } : undefined } });
    res.json({ success, nextRun: nextRun.toISOString() });
  } catch (e:any) { res.status(500).json({error:e.message}); }
});

automationRoutes.delete('/:id', async (req: Request, res: Response) => {
  try { await prisma.automationJob.delete({ where: { id: req.params.id } }); res.json({success:true}); } catch(e:any) { res.status(500).json({error:e.message}); }
});
