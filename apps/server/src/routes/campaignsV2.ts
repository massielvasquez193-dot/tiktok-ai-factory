import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';
import { serializeMetadata, deserializeMetadata } from '../lib/video-downloader';
import { ProviderManager } from '../providers/manager/ProviderManager';

export const campaignV2Routes = Router();

const ALL_COUNTRIES = [
  { code: 'US', name: 'United States', lang: 'en', costPerVideo: 0.05 },
  { code: 'UK', name: 'United Kingdom', lang: 'en', costPerVideo: 0.05 },
  { code: 'MY', name: 'Malaysia', lang: 'ms', costPerVideo: 0.04 },
  { code: 'TH', name: 'Thailand', lang: 'th', costPerVideo: 0.04 },
  { code: 'PH', name: 'Philippines', lang: 'fil', costPerVideo: 0.04 },
  { code: 'VN', name: 'Vietnam', lang: 'vi', costPerVideo: 0.03 },
  { code: 'ID', name: 'Indonesia', lang: 'id', costPerVideo: 0.03 },
  { code: 'SG', name: 'Singapore', lang: 'en', costPerVideo: 0.05 },
  { code: 'CA', name: 'Canada', lang: 'en', costPerVideo: 0.05 },
  { code: 'AU', name: 'Australia', lang: 'en', costPerVideo: 0.05 },
];

const LEVELS: Record<string, any> = {
  basic: { name: 'Basic', types: 1, cost: 1 }, standard: { name: 'Standard', types: 3, cost: 3 }, full: { name: 'Full', types: 5, cost: 5 },
};

// ── CRUD ────────────────────────────────────────────────────────────────

campaignV2Routes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await prisma.campaignV2.findMany({ include: { countryStats: true }, orderBy: { createdAt: 'desc' } })); } catch (e) { next(e); }
});

campaignV2Routes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.campaignV2.findUnique({ where: { id: req.params.id }, include: { countryStats: true } });
    if (!c) throw new AppError(404, 'Not found'); res.json(c);
  } catch (e) { next(e); }
});

campaignV2Routes.get('/config', (_req: Request, res: Response) => {
  const templates = [
    { name: 'Southeast Asia', countries: ['MY', 'TH', 'PH', 'VN', 'ID', 'SG'] },
    { name: 'English Markets', countries: ['US', 'UK', 'CA', 'AU', 'SG'] },
    { name: 'Asia Pacific', countries: ['MY', 'TH', 'PH', 'VN', 'ID', 'SG', 'AU'] },
    { name: 'Global (All 10)', countries: ['US', 'UK', 'MY', 'TH', 'PH', 'VN', 'ID', 'SG', 'CA', 'AU'] },
    { name: 'Quick Test (3)', countries: ['US', 'MY', 'TH'] },
  ];
  res.json({ countries: ALL_COUNTRIES, levels: LEVELS, templates });
});

// POST: Create + Auto-Run
campaignV2Routes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, productId, countries, videosPerCountry, localizationLevel, scriptTypes } = req.body;
    if (!name || !productId) throw new AppError(400, 'name and productId required');

    const clist: string[] = countries || ['US'];
    const lvl = LEVELS[localizationLevel || 'standard'] || LEVELS.standard;
    const tv = clist.length * (videosPerCountry || 3);
    const ts = clist.length * (scriptTypes?.split(',').length || lvl.types);
    const tp = tv * 3;
    const avgCost = clist.reduce((s, c) => s + (ALL_COUNTRIES.find(x => x.code === c)?.costPerVideo || 0.05), 0) / clist.length;
    const est = Math.round(tv * avgCost * 100) / 100;

    const c = await prisma.campaignV2.create({
      data: {
        id: uuid(), name, productId,
        countries: serializeMetadata(clist),
        videosPerCountry: videosPerCountry || 3,
        localizationLevel: localizationLevel || 'standard',
        scriptTypes: scriptTypes || 'ugc,review,pov',
        costEstimate: est, totalVideos: tv, totalScripts: ts, totalPrompts: tp,
        succeeded: 0, failed: 0,
        status: 'running', progress: 5,
        result: serializeMetadata({ steps: [] }),
      },
    });

    // Auto-run!
    runPipeline(c.id).catch(err => console.error('Pipeline:', err));

    res.status(201).json(c);
  } catch (e) { next(e); }
});

campaignV2Routes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.campaignV2.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { next(e); }
});

// ── Full Auto Pipeline ──────────────────────────────────────────────────

async function addStep(cid: string, step: string, status: string, progress: number) {
  const c = await prisma.campaignV2.findUnique({ where: { id: cid } });
  const parsed = deserializeMetadata<{ steps?: unknown[] }>(c?.result);
  const steps = parsed.steps || [];
  steps.push({ step, status, time: new Date().toISOString() });
  await prisma.campaignV2.update({ where: { id: cid }, data: { progress, result: serializeMetadata({ steps }) } });
}

async function runPipeline(cid: string) {
  const c = await prisma.campaignV2.findUnique({ where: { id: cid } });
  if (!c) return;
  const countries: string[] = deserializeMetadata<string[]>(c.countries);
  const API = 'http://localhost:' + (process.env.PORT || 4002);

  let ok = 0; let fail = 0;

  try {
    const product = await prisma.product.findUnique({ where: { id: c.productId } });
    if (!product) throw new Error('Product not found');

    // Step 1: Research
    await addStep(cid, 'Research', 'running', 10);
    try {
      await fetch(API + '/api/research/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: 'https://www.tiktok.com/tag/' + encodeURIComponent(product.category) }) });
      ok++;
    } catch { fail++; }
    await addStep(cid, 'Research', 'completed', 20);

    // Step 2: Script Generation (per-country tracking)
    await addStep(cid, 'Scripts', 'running', 25);
    const scriptTypes = c.scriptTypes.split(',');
    let scriptCount = 0;
    const countryStats: Record<string, any> = {};
    for (const country of countries) {
      countryStats[country] = { country, scripts: 0, prompts: 0, videos: 0, ok: 0, fail: 0, start: Date.now() };
      const lang = ALL_COUNTRIES.find(x => x.code === country)?.lang || 'en';
      for (const st of scriptTypes) {
        try {
          await fetch(API + '/api/scripts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, scriptTypes: [st.trim()], languages: [lang] }) });
          scriptCount++; ok++; countryStats[country].scripts++; countryStats[country].ok++;
        } catch { fail++; countryStats[country].fail++; }
      }
      countryStats[country].duration = Math.round((Date.now() - countryStats[country].start) / 1000);
    }

    // Save per-country stats to DB
    for (const cs of Object.values(countryStats)) {
      await prisma.campaignCountry.create({ data: { id: uuid(), campaignId: cid, country: cs.country as string, language: ALL_COUNTRIES.find(x => x.code === cs.country)?.lang || 'en', scripts: cs.scripts as number, succeeded: cs.ok as number, failed: cs.fail as number, duration: cs.duration as number } });
    }

    await prisma.campaignV2.update({ where: { id: cid }, data: { totalScripts: scriptCount, succeeded: ok, failed: fail, startedAt: new Date() } });
    await addStep(cid, 'Scripts', 'completed', 45);

    // Step 3: Localization
    await addStep(cid, 'Localization', 'running', 50);
    try {
      await fetch(API + '/api/localization/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, countries }) });
      ok++; await addStep(cid, 'Localization', 'completed', 60);
    } catch { fail++; await addStep(cid, 'Localization', 'failed', 60); }

    // Step 4: Storyboards + Prompts
    await addStep(cid, 'Prompts', 'running', 65);
    const scripts = await prisma.script.findMany({ where: { productId: product.id }, take: 5 });
    let promptCount = 0;
    for (const script of scripts) {
      try {
        const content = JSON.parse(typeof script.content === 'string' ? script.content : script.content);
        const shots = (content.scenes || []).map((s: any, i: number) => ({
          scriptId: script.id, sceneNumber: i + 1, camera: s.camera || 'POV', shotType: s.shotType || 'demo',
          action: s.voiceover?.slice(0, 50) || '', actor: 'Female 25-35', subtitle: s.voiceover?.slice(0, 100) || '',
          duration: s.durationSeconds || 4, visualPrompt: 'Vertical 9:16, ' + product.product_name + ', ' + (s.shotType || 'demo') + ', natural light, UGC, 4K',
        }));
        for (const shot of shots) {
          const sb = await prisma.storyboard.create({ data: { id: uuid(), ...shot } });
          const p = await prisma.prompt.create({ data: { id: uuid(), storyboardId: sb.id, sceneNumber: sb.sceneNumber, model: 'seedance', prompt: sb.visualPrompt, negativePrompt: 'blurry, low quality, watermark' } });
          promptCount++;
        }
      } catch { fail++; }
    }
    await prisma.campaignV2.update({ where: { id: cid }, data: { totalPrompts: promptCount } });
    await addStep(cid, 'Prompts', 'completed', 80);

    // Step 5: Seedance Video Generation (via ProviderManager)
    await addStep(cid, 'Seedance', 'running', 85);
    const prompts = await prisma.prompt.findMany({ where: { storyboard: { script: { productId: product.id } } }, take: 10 });
    let vidCount = 0;
    for (const p of prompts) {
      try { await ProviderManager.instance.submit(p.id, 'seedance'); vidCount++; } catch { fail++; }
    }
    await prisma.campaignV2.update({ where: { id: cid }, data: { totalVideos: vidCount } });
    await addStep(cid, 'Seedance', 'completed', 95);

    await addStep(cid, 'Complete', 'done', 100);
    await prisma.campaignV2.update({ where: { id: cid }, data: { status: 'completed' } });
  } catch (err: any) {
    await addStep(cid, 'Error', err.message, c.progress);
    await prisma.campaignV2.update({ where: { id: cid }, data: { status: 'failed' } });
  }
}
