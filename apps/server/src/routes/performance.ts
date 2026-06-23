import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';
import { serializeMetadata, deserializeMetadata } from '../lib/video-downloader';

export const performanceRoutes = Router();

performanceRoutes.get('/overview', async (_req: Request, res: Response) => {
  try {
    const [campaigns, videos, scripts_, prompts, tasks, products, research_, productions, publishing] = await Promise.all([
      prisma.campaignV2.count(), prisma.video.count(), prisma.script.count(), prisma.prompt.count(),
      prisma.videoTask.count(), prisma.product.count(), prisma.research.count(),
      prisma.postProduction.count(), prisma.publishingTask.count(),
    ]);
    const dur = await prisma.video.aggregate({ _sum: { duration: true } });
    const completed = await prisma.videoTask.count({ where: { status: 'completed' } });
    const totalTasks = Math.max(tasks, 1);
    res.json({
      campaigns, videos, scripts: scripts_, prompts,
      totalDuration: dur._sum.duration || 0,
      seedanceCost: (tasks * 0.04).toFixed(2),
      successRate: Math.round(completed / totalTasks * 100),
      products, research: research_, productions, publishing,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.get('/campaigns', async (_req: Request, res: Response) => {
  try {
    const list = await prisma.campaignV2.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    const data = list.map(c => ({
      id: c.id, name: c.name, createdAt: c.createdAt,
      countries: (() => { const cs = deserializeMetadata<string[]>(c.countries); return Array.isArray(cs) ? cs.length : 0; })(),
      totalScripts: c.totalScripts, totalVideos: c.totalVideos, succeeded: c.succeeded, failed: c.failed, status: c.status, cost: c.costEstimate,
    }));
    const byStatus = {
      completed: list.filter(c => c.status === 'completed').length,
      running: list.filter(c => c.status === 'running').length,
      failed: list.filter(c => c.status === 'failed').length,
      draft: list.filter(c => c.status === 'draft').length,
    };
    res.json({ items: data, total: list.length, byStatus });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.get('/scripts', async (_req: Request, res: Response) => {
  try {
    const scripts = await prisma.script.findMany({ select: { scriptType: true, language: true } });
    const bt: Record<string, number> = {}; const bl: Record<string, number> = {};
    for (const s of scripts) { bt[s.scriptType] = (bt[s.scriptType] || 0) + 1; bl[s.language] = (bl[s.language] || 0) + 1; }
    res.json({ total: scripts.length, byType: bt, byLang: bl });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.get('/research', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.research.findMany({ select: { viralScore: true, hook: true }, take: 50 });
    const hooks: Record<string, number> = {};
    for (const r of items) { if (r.hook) hooks[r.hook.slice(0, 30)] = (hooks[r.hook.slice(0, 30)] || 0) + 1; }
    const topHooks = Object.entries(hooks).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const avgScore = items.length > 0 ? Math.round(items.reduce((s, r) => s + r.viralScore, 0) / items.length) : 0;
    res.json({ total: items.length, avgScore, topHooks });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.get('/prompts', async (_req: Request, res: Response) => {
  try {
    const prompts = await prisma.prompt.findMany({ select: { model: true } });
    const bm: Record<string, number> = {};
    for (const p of prompts) bm[p.model] = (bm[p.model] || 0) + 1;
    res.json({ total: prompts.length, byModel: bm });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.get('/videos', async (_req: Request, res: Response) => {
  try {
    const videos = await prisma.video.findMany({ select: { provider: true, status: true, duration: true } });
    const bp: Record<string, number> = {}; let td = 0; let c = 0;
    for (const v of videos) { bp[v.provider] = (bp[v.provider] || 0) + 1; td += v.duration; if (v.status === 'completed') c++; }
    res.json({ total: videos.length, totalDuration: td, byProvider: bp, successRate: videos.length > 0 ? Math.round(c / videos.length * 100) : 100 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.get('/localization', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.localization.findMany({ select: { country: true } });
    const bc: Record<string, number> = {};
    for (const l of items) bc[l.country] = (bc[l.country] || 0) + 1;
    res.json({ total: items.length, byCountry: bc });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.get('/post-production', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.postProduction.findMany({ select: { subtitle: true, cta: true, logo: true, bgm: true } });
    res.json({ total: items.length, withSub: items.filter(i => i.subtitle).length, withCta: items.filter(i => i.cta).length, withLogo: items.filter(i => i.logo).length, withBgm: items.filter(i => i.bgm).length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

performanceRoutes.post('/seed', async (_req: Request, res: Response) => {
  try {
    const evts = ['campaign_create','research_analyze','script_generate','prompt_generate','video_task'];
    const cs = ['US','MY','TH','PH','VN','ID']; const ps = ['seedance','kling','veo'];
    for (let i = 0; i < 50; i++) {
      const ei = Math.floor(Math.random() * evts.length);
      await prisma.analyticsEvent.create({
        data: { id: uuid(), eventType: evts[ei], entityType: evts[ei], entityId: uuid(), country: cs[Math.floor(Math.random() * cs.length)], provider: ps[Math.floor(Math.random() * ps.length)], duration: Math.floor(Math.random() * 300), status: Math.random() < 0.85 ? 'success' : 'fail', metadata: serializeMetadata({}) },
      });
    }
    res.json({ seeded: 50 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
