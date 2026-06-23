import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';
import { serializeMetadata, deserializeMetadata } from '../lib/video-downloader';

const UPLOAD_DIR = path.resolve(process.cwd(), '..', '..', 'uploads', 'campaigns');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, uuid() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

export const campaignRoutes = Router();

const SCRIPT_TYPES = ['ugc', 'review', 'pov', 'comparison', 'problem_solution', 'luxury', 'editorial', 'demo', 'voiceover', 'testimonial'];

// ── CRUD ────────────────────────────────────────────────────────────────

campaignRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await prisma.campaignRecord.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e) { next(e); }
});

campaignRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.campaignRecord.findUnique({ where: { id: req.params.id } });
    if (!c) throw new AppError(404, 'Not found'); res.json(c);
  } catch (e) { next(e); }
});

campaignRoutes.post('/', upload.single('productImage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, competitorUrl, country, language, scriptCount } = req.body;
    if (!name) throw new AppError(400, 'name required');
    const imagePath = req.file ? '/uploads/campaigns/' + req.file.filename : '';
    const c = await prisma.campaignRecord.create({
      data: { id: uuid(), name, productImage: imagePath, competitorUrl: competitorUrl || '', country: country || 'US', language: language || 'en', scriptCount: Number(scriptCount) || 3, status: 'draft', progress: 0 },
    });
    res.status(201).json(c);
  } catch (e) { next(e); }
});

campaignRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.campaignRecord.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { next(e); }
});

// ── One Click Run ───────────────────────────────────────────────────────

campaignRoutes.post('/:id/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.campaignRecord.findUnique({ where: { id: req.params.id } });
    if (!c) throw new AppError(404, 'Not found');
    runPipeline(c.id).catch(err => console.error('Pipeline error:', err));
    await prisma.campaignRecord.update({ where: { id: c.id }, data: { status: 'running', progress: 5 } });
    res.json({ campaignId: c.id, status: 'running' });
  } catch (e) { next(e); }
});

// ── Full Pipeline ───────────────────────────────────────────────────────

async function update(id: string, data: any) {
  await prisma.campaignRecord.update({ where: { id }, data });
}

async function runPipeline(campaignId: string) {
  const c = await prisma.campaignRecord.findUnique({ where: { id: campaignId } });
  if (!c) return;
  const API = 'http://localhost:' + (process.env.PORT || 4002);
  const API_KEY = process.env.SEEDANCE_API_KEY || '';
  const stats: any = {};

  try {
    // Step 1: Research competitor
    await update(campaignId, { progress: 10 });
    if (c.competitorUrl) {
      try {
        await fetch(API + '/api/research/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: c.competitorUrl }) });
      } catch { /* continue */ }
    }

    // Step 2: Get product
    const product = await prisma.product.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!product) throw new Error('No product found');
    await update(campaignId, { progress: 20 });

    // Step 3: Generate scripts
    const scripts: any[] = [];
    for (const st of SCRIPT_TYPES.slice(0, c.scriptCount)) {
      const content = genScript(product.product_name, product.category, st, c.language);
      const s = await prisma.script.create({ data: { id: uuid(), productId: product.id, scriptType: st, language: c.language, content: serializeMetadata(content), status: 'generated' } });
      scripts.push(s);
    }
    stats.scripts = scripts.length;
    await update(campaignId, { progress: 40 });

    // Step 4: Storyboard for first script
    let storyboards: any[] = [];
    if (scripts[0]) {
      const content = JSON.parse(typeof scripts[0].content === 'string' ? scripts[0].content : scripts[0].content);
      const shots = (content.scenes || []).map((s: any, i: number) => ({
        scriptId: scripts[0].id, sceneNumber: i + 1, camera: s.camera || 'POV handheld', shotType: s.shotType || 'demo',
        action: s.shotType + ' of ' + product.product_name, actor: i % 2 === 0 ? 'Female 25-35' : 'Hands only',
        subtitle: s.voiceover || '', duration: s.durationSeconds || 5,
        visualPrompt: 'Vertical 9:16, ' + (s.camera || 'POV') + ', ' + (s.shotType || 'demo') + ' shot, ' + product.product_name + ', natural light, UGC style, 4K',
      }));
      for (const shot of shots) {
        const sb = await prisma.storyboard.create({ data: { id: uuid(), ...shot } });
        storyboards.push(sb);
      }
    }
    stats.storyboards = storyboards.length;
    await update(campaignId, { progress: 55 });

    // Step 5: Generate Prompts
    const prompts: any[] = [];
    for (const sb of storyboards.slice(0, 3)) {
      const p = await prisma.prompt.create({
        data: { id: uuid(), storyboardId: sb.id, sceneNumber: sb.sceneNumber, model: 'seedance', prompt: sb.visualPrompt, negativePrompt: 'blurry, low quality, watermark, logo, text' },
      });
      prompts.push(p);
    }
    stats.prompts = prompts.length;
    await update(campaignId, { progress: 65 });

    // Step 6: Call Seedance API
    stats.videos = 0;
    if (API_KEY && prompts.length > 0) {
      const SEEDANCE_URL = process.env.SEEDANCE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';
      for (let i = 0; i < prompts.length; i++) {
        await update(campaignId, { progress: 65 + Math.floor((i / prompts.length) * 25) });
        try {
          const resp = await fetch(SEEDANCE_URL, {
            method: 'POST', headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'doubao-seedance-2-0-260128', content: [{ type: 'text', text: prompts[i].prompt }], resolution: '720p', ratio: '9:16', duration: 5, generate_audio: false, watermark: false }),
          });
          if (resp.ok) {
            const task: any = await resp.json();
            if (task.id) {
              await prisma.videoTask.create({ data: { id: uuid(), promptId: prompts[i].id, model: 'seedance', provider: 'seedance', externalTaskId: task.id, status: 'submitted', progress: 10, startedAt: new Date() } });
              stats.videos++;
            }
          }
        } catch { /* skip */ }
      }
    }
    await update(campaignId, { progress: 90 });

    // Step 7: Sync completed tasks to library
    try {
      const doneTasks = await prisma.videoTask.findMany({ where: { status: 'completed', videoUrl: { not: '' }, video: null }, include: { prompt: { include: { storyboard: { include: { script: { include: { product: true } } } } } } } });
      for (const t of doneTasks) {
        const prod = t.prompt?.storyboard?.script?.product;
        if (!prod) continue;
        await prisma.video.create({
          data: { id: uuid(), taskId: t.id, productId: prod.id, provider: 'seedance', title: prod.product_name + ' - Shot #' + t.prompt?.sceneNumber, videoUrl: t.videoUrl, thumbnailUrl: t.thumbnailUrl, duration: t.duration || 5, size: 0, status: 'completed' },
        });
      }
      if (doneTasks.length > 0) stats.synced = doneTasks.length;
    } catch { /* no videos yet */ }
    await update(campaignId, { progress: 95 });

    // Complete
    const result = serializeMetadata(stats);
    await update(campaignId, { progress: 100, status: 'completed', result });
  } catch (err: any) {
    await update(campaignId, { status: 'failed', result: serializeMetadata({ error: err.message, ...stats }) });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function genScript(name: string, cat: string, type: string, lang: string): any {
  const hooks: Record<string, string> = {
    ugc: 'Honest ' + name + ' review after 30 days', review: 'I tested ' + name + ' so you don\'t have to',
    pov: 'POV: Best ' + cat + ' ever', comparison: name + ' vs everything', problem_solution: 'Tired of ' + cat + ' problems?',
    luxury: 'Premium ' + cat + ' unboxing', editorial: name + ' - cinematic showcase', demo: name + ' in action',
    voiceover: 'The truth about ' + name, testimonial: 'Why I switched to ' + name,
  };
  const ctas = ['Link in bio!', 'Shop now', 'Use code SAVE20', 'Tap to buy'];
  return {
    scriptType: type, language: lang, durationSeconds: 25,
    hook: { text: hooks[type] || 'Check this out', durationSeconds: 3 },
    scenes: [
      { sceneNumber: 1, voiceover: hooks[type], onScreenText: name, durationSeconds: 4, camera: 'POV handheld', shotType: 'hook' },
      { sceneNumber: 2, voiceover: 'I\'ve been using ' + name + ' and the results are real.', onScreenText: 'Real Results', durationSeconds: 6, camera: 'overhead', shotType: 'demo' },
      { sceneNumber: 3, voiceover: 'This ' + cat + ' actually delivers on its promises.', onScreenText: 'Why it works', durationSeconds: 6, camera: 'macro close-up', shotType: 'proof' },
      { sceneNumber: 4, voiceover: 'Stop scrolling and grab yours now.', onScreenText: ctas[Math.floor(Math.random() * ctas.length)], durationSeconds: 5, camera: 'static', shotType: 'cta' },
    ],
    cta: { text: ctas[Math.floor(Math.random() * ctas.length)], durationSeconds: 3 },
    hashtags: ['#tiktokmademebuyit', '#productreview', '#musthave'],
  };
}
