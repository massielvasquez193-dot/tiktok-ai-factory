import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = path.resolve(process.cwd(), '..', '..', 'uploads', 'video-generator');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({ destination: (_r, _f, cb) => cb(null, UPLOAD_DIR), filename: (_r, f, cb) => cb(null, uuid() + path.extname(f.originalname)) });
const upload = multer({ storage, limits: { fileSize: 20*1024*1024 } });

export const videoGeneratorRoutes = Router();
const ACTIVE_JOBS = new Map<string, any>();

// GET tasks
videoGeneratorRoutes.get('/tasks', async (_req: Request, res: Response) => {
  try { res.json(await prisma.videoTask.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST generate
videoGeneratorRoutes.post('/generate', upload.single('productImage'), async (req: Request, res: Response) => {
  try {
    const { prompt, model, aspectRatio, duration, quantity } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const targetModel = model || 'seedance'; const count = Math.min(Number(quantity)||1, 4);
    const tasks = []; const API_KEY = process.env.SEEDANCE_API_KEY || '';
    for (let i = 0; i < count; i++) {
      const t = await prisma.videoTask.create({ data: { id: uuid(), promptId: (await prisma.prompt.findFirst())?.id || '', model: targetModel, provider: targetModel, status: 'pending', progress: 0 } });
      if (API_KEY && targetModel==='seedance') {
        try {
          const r = await fetch(process.env.SEEDANCE_BASE_URL||'', { method:'POST', headers:{'Authorization':'Bearer '+API_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ model: 'doubao-seedance-2-0-260128', content:[{type:'text',text:prompt}], resolution:'720p', ratio:aspectRatio||'9:16', duration:Number(duration)||5 }) });
          if (r.ok) { const d:any = await r.json(); if (d.id) await prisma.videoTask.update({ where:{id:t.id}, data:{ externalTaskId:d.id, status:'submitted', progress:10 } }); }
        } catch {}
      }
      tasks.push(t);
    }
    res.status(201).json({ count: tasks.length, tasks });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 🔥 FULL PIPELINE RUN
videoGeneratorRoutes.post('/run', upload.single('productImage'), async (req: Request, res: Response) => {
  try {
    const { productId, countries, scriptCount } = req.body;
    const product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : await prisma.product.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!product) return res.status(404).json({ error: 'No product found' });

    const jobId = uuid(); const cs = countries?.split(',').map((s: string) => s.trim()).filter(Boolean) || ['US'];
    const API = 'http://localhost:' + (process.env.PORT || 4002);
    const result: any = { jobId, steps: [], status: 'running' };
    ACTIVE_JOBS.set(jobId, result);

    // Run async
    (async () => {
      try {
        // Step 1: Research
        result.steps.push({ step: 'research', status: 'running' });
        await fetch(API + '/api/research/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: 'https://www.tiktok.com/tag/' + encodeURIComponent(product.category) }) });
        result.steps[0].status = 'completed';

        // Step 2: Knowledge
        result.steps.push({ step: 'knowledge', status: 'running' });
        await fetch(API + '/api/knowledge/stats');
        result.steps[1].status = 'completed';

        // Step 3: Scripts
        result.steps.push({ step: 'scripts', status: 'running' });
        const types = ['ugc','review','pov','problem_solution'].slice(0, Number(scriptCount) || 3);
        for (const c of cs) for (const st of types) {
          await fetch(API + '/api/scripts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, scriptTypes: [st], languages: [c==='US'?'en':c==='MY'?'ms':'en'] }) });
        }
        result.steps[2].status = 'completed'; result.steps[2].count = cs.length * types.length;

        // Step 4: Prompts
        result.steps.push({ step: 'prompts', status: 'running' });
        const scripts = await prisma.script.findMany({ where: { productId: product.id }, take: 5 });
        for (const s of scripts) {
          let content: any = {};
          try { content = JSON.parse(typeof s.content === 'string' ? s.content : s.content); } catch { continue; }
          for (const scene of (content.scenes||[]).slice(0, 3)) {
            const sb = await prisma.storyboard.create({ data: { id: uuid(), scriptId: s.id, sceneNumber: scene.sceneNumber||1, camera: scene.camera||'POV', shotType: scene.shotType||'demo', action: '', actor: 'Model', subtitle: scene.voiceover||'', duration: scene.durationSeconds||4, visualPrompt: 'Vertical 9:16, ' + product.product_name + ', UGC, 4K' } });
            await prisma.prompt.create({ data: { id: uuid(), storyboardId: sb.id, sceneNumber: sb.sceneNumber, model: 'seedance', prompt: sb.visualPrompt, negativePrompt: 'blurry' } });
          }
        }
        result.steps[3].status = 'completed';

        // Step 5: Video
        result.steps.push({ step: 'video', status: 'running' });
        const API_KEY = process.env.SEEDANCE_API_KEY || ''; let vc = 0;
        if (API_KEY) {
          const prompts = await prisma.prompt.findMany({ take: 5 });
          for (const p of prompts) {
            try {
              const r = await fetch(process.env.SEEDANCE_BASE_URL||'', { method:'POST', headers:{'Authorization':'Bearer '+API_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ model:'doubao-seedance-2-0-260128', content:[{type:'text',text:p.prompt}], resolution:'720p', ratio:'9:16', duration:5 }) });
              if (r.ok) { const d: any = await r.json(); if (d.id) { await prisma.videoTask.create({ data: { id: uuid(), promptId: p.id, model: 'seedance', provider: 'seedance', externalTaskId: d.id, status: 'submitted', progress: 10 } }); vc++; } }
            } catch {}
          }
        }
        result.steps[4].status = 'completed'; result.steps[4].count = vc;

        // Step 6: Post Production
        result.steps.push({ step: 'post', status: 'running' });
        const vids = await prisma.video.findMany({ take: 1 });
        if (vids[0]) await fetch(API + '/api/post-production/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: vids[0].id, country: cs[0], language: 'en', ctaType: 'buy', priceTag: product.price, bgm: 'tiktok_trending' }) });
        result.steps[5].status = 'completed';

        // Step 7: Sync to Library
        const newVids = await prisma.videoTask.findMany({ where: { status: 'completed' }, take: 5 });
        for (const t of newVids) {
          await prisma.video.create({ data: { id: uuid(), taskId: t.id, productId: product.id, provider: 'seedance', title: product.product_name + ' Auto', videoUrl: t.videoUrl, duration: t.duration||5, size: 0, status: 'completed' } });
        }
        result.steps.push({ step: 'complete', status: 'done' });
        result.status = 'completed';
      } catch (err: any) {
        result.status = 'failed'; result.error = err.message;
      }
    })();

    res.status(202).json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET job status
videoGeneratorRoutes.get('/jobs/:id', async (req: Request, res: Response) => {
  const job = ACTIVE_JOBS.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// GET all active jobs
videoGeneratorRoutes.get('/jobs', (_req: Request, res: Response) => {
  res.json(Array.from(ACTIVE_JOBS.entries()).map(([id, data]) => ({ id, ...data })));
});

// DELETE task
videoGeneratorRoutes.delete('/tasks/:id', async (req: Request, res: Response) => {
  try { await prisma.videoTask.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
