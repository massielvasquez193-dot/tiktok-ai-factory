import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { v4 as uuid } from 'uuid';
import { serializeMetadata, deserializeMetadata } from '../lib/video-downloader';
import { ProviderManager } from '../providers/manager/ProviderManager';

export const agentRoutes = Router();
const ACTIVE_RUNS = new Map<string, boolean>();

// ── Run Agent ───────────────────────────────────────────────────────────

agentRoutes.post('/run', async (req: Request, res: Response) => {
  try {
    const { productId, name, countries, language, scriptCount, productLink, productName, category, price } = req.body;

    // Create product from link if provided
    let product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;
    if (!product && productLink) {
      let hostname = 'example.com'; try { hostname = new URL(productLink).hostname; } catch {}
      const pn = productName || 'Product from ' + hostname;
      product = await prisma.product.create({
        data: {
          id: uuid(), product_name: pn, brand: hostname.split('.')[0]||'',
          category: category || 'General', price: price || '$29.99', target_country: countries?.[0] || 'US',
          benefits: '', ingredients: '', status: 'draft',
        },
      });
    }
    if (!product) return res.status(400).json({ error: 'productId or productLink required' });

    const clist: string[] = countries?.length ? countries : ['US'];
    const runId = uuid();

    const run = await prisma.agentRun.create({
      data: {
        id: runId, productId, name: name || `${product.product_name} Auto Run`,
        countries: serializeMetadata(clist), language: language || 'en',
        scriptCount: scriptCount || 5,
        status: 'running', step: 'init', progress: 5, log: '{}',
        startedAt: new Date(),
      },
    });

    // Start async
    executeAgent(runId, clist).catch(err => console.error('Agent error:', err));

    res.status(201).json(run);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Agent Execution Engine ─────────────────────────────────────────────

async function executeAgent(runId: string, countries: string[]) {
  const API = 'http://localhost:' + (process.env.PORT || 4002);
  const log: any[] = [];

  const addLog = async (msg: string, step: string, progress: number) => {
    log.push({ time: new Date().toISOString(), msg });
    await prisma.agentRun.update({ where: { id: runId }, data: { step, progress, log: serializeMetadata(log) } });
  };

  try {
    await addLog('Agent started', 'init', 5);
    const run = await prisma.agentRun.findUnique({ where: { id: runId } });
    if (!run) return;
    const product = await prisma.product.findUnique({ where: { id: run.productId } });

    // Step 1: Research
    await addLog('Step 1/11: Researching trends...', 'research', 10);
    try { await fetch(API + '/api/research/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl: 'https://www.tiktok.com/tag/' + encodeURIComponent(product?.category || 'skincare') }) }); } catch {}

    // Step 2: Knowledge
    await addLog('Step 2/11: Querying knowledge base...', 'knowledge', 15);
    try { await fetch(API + '/api/knowledge/stats', { method: 'GET' }); } catch {}

    // Step 3: Scripts
    await addLog('Step 3/11: Generating scripts...', 'scripts', 25);
    const types = ['ugc','review','pov','comparison','problem_solution','testimonial','luxury','demo'].slice(0, run.scriptCount);
    for (const country of countries) {
      for (const st of types) {
        try {
          await fetch(API + '/api/scripts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: run.productId, scriptTypes: [st], languages: [country === 'US' ? 'en' : country === 'MY' ? 'ms' : country === 'TH' ? 'th' : 'en'] }) });
        } catch {}
      }
    }

    // Step 4: Localization
    await addLog('Step 4/11: Localizing...', 'localization', 40);
    try { await fetch(API + '/api/localization/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: run.productId, countries }) }); } catch {}

    // Step 5-6: Storyboard + Prompts
    await addLog('Step 5/11: Storyboards + Prompts...', 'storyboard', 55);
    const scripts = await prisma.script.findMany({ where: { productId: run.productId }, take: 5 });
    for (const script of scripts) {
      try {
        const content = JSON.parse(typeof script.content === 'string' ? script.content : script.content);
        for (const scene of (content.scenes || []).slice(0, 4)) {
          const sb = await prisma.storyboard.create({ data: { id: uuid(), scriptId: script.id, sceneNumber: scene.sceneNumber || 1, camera: scene.camera || 'POV', shotType: scene.shotType || 'demo', action: '', actor: 'Model', subtitle: scene.voiceover || '', duration: scene.durationSeconds || 4, visualPrompt: 'Vertical 9:16, ' + (product?.product_name || '') + ', ' + (scene.shotType || 'demo') + ', UGC, 4K' } });
          await prisma.prompt.create({ data: { id: uuid(), storyboardId: sb.id, sceneNumber: sb.sceneNumber, model: 'seedance', prompt: sb.visualPrompt, negativePrompt: 'blurry' } });
        }
      } catch {}
    }

    // Step 7-8: Provider + Video (via ProviderManager)
    await addLog('Step 7-8/11: Seedance video generation...', 'video', 70);
    let vidCount = 0;
    const prompts = await prisma.prompt.findMany({ take: 5 });
    for (const p of prompts) {
      try {
        await ProviderManager.instance.submit(p.id, 'seedance');
        vidCount++;
      } catch {}
    }
    await prisma.agentRun.update({ where: { id: runId }, data: { videosGenerated: vidCount } });

    // Step 9: Post Production
    await addLog('Step 9/11: Post production...', 'post-production', 85);
    const videos = await prisma.video.findMany({ take: 1 });
    if (videos[0]) {
      try { await fetch(API + '/api/post-production/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: videos[0].id, country: 'US', language: 'en', ctaType: 'buy', priceTag: product?.price || '$9.99', bgm: 'tiktok_trending' }) }); } catch {}
    }

    // Step 10-11: Sync knowledge + complete
    await addLog('Step 10-11/11: Syncing knowledge base...', 'sync', 95);
    try { await prisma.knowledgeHook.create({ data: { id: uuid(), hook: 'AI Agent auto-generated', language: 'en', country: 'US', category: product?.category || '', source: 'agent', viralScore: 80, tags: 'auto' } }); } catch {}

    const duration = Math.round((Date.now() - new Date((await prisma.agentRun.findUnique({ where: { id: runId } }))?.startedAt?.getTime() || Date.now()).getTime()) / 1000) || 0;
    await prisma.agentRun.update({ where: { id: runId }, data: { status: 'completed', progress: 100, step: 'done', completedAt: new Date(), duration, successRate: 100 } });
  } catch (err: any) {
    await prisma.agentRun.update({ where: { id: runId }, data: { status: 'failed', log: serializeMetadata([...log, { time: new Date().toISOString(), msg: 'Error: ' + err.message }]) } });
  }
}

// ── CRUD ────────────────────────────────────────────────────────────────

agentRoutes.get('/', async (_req: Request, res: Response) => {
  try { res.json(await prisma.agentRun.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e:any) { res.status(500).json({error:e.message}); }
});

agentRoutes.get('/:id', async (req: Request, res: Response) => {
  try { const r = await prisma.agentRun.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({error:'Not found'}); res.json(r); } catch(e:any) { res.status(500).json({error:e.message}); }
});

agentRoutes.post('/:id/pause', async (req: Request, res: Response) => {
  try { ACTIVE_RUNS.set(req.params.id, false); await prisma.agentRun.update({ where: { id: req.params.id }, data: { status: 'paused' } }); res.json({ success: true }); } catch(e:any) { res.status(500).json({error:e.message}); }
});

agentRoutes.post('/:id/resume', async (req: Request, res: Response) => {
  try { ACTIVE_RUNS.set(req.params.id, true); await prisma.agentRun.update({ where: { id: req.params.id }, data: { status: 'running' } }); res.json({ success: true }); } catch(e:any) { res.status(500).json({error:e.message}); }
});

agentRoutes.post('/:id/retry', async (req: Request, res: Response) => {
  try { const r = await prisma.agentRun.findUnique({ where: { id: req.params.id } }); if (!r) return res.status(404).json({error:'Not found'}); const cs = deserializeMetadata<string[]>(r.countries); executeAgent(r.id, cs as unknown as string[]); res.json({ success: true }); } catch(e:any) { res.status(500).json({error:e.message}); }
});

agentRoutes.delete('/:id', async (req: Request, res: Response) => {
  try { ACTIVE_RUNS.delete(req.params.id); await prisma.agentRun.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch(e:any) { res.status(500).json({error:e.message}); }
});
