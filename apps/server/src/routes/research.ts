import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';
import { realAnalyze } from '../services/realAnalyzer';
import { serializeMetadata, deserializeMetadata } from '../lib/video-downloader';

export const researchRoutes = Router();

// ── Mock Analyzer ────────────────────────────────────────────────────────

function analyzeVideo(url: string): any {
  const videoId = url.includes('tiktok.com') ? url.split('/').pop()?.split('?')[0] || 'unknown' : 'unknown';
  const products = ['Portable Blender', 'Skincare Serum', 'Mini Vacuum', 'Phone Stand', 'LED Mask'];
  const hooks = [
    'You won\'t believe what this product does in 10 seconds',
    'I tried the viral TikTok product so you don\'t have to',
    'This $20 product changed my entire morning routine',
    'POV: You finally found a product that actually works',
    'Stop scrolling — this is the best purchase I\'ve ever made',
  ];
  const painPoints = [
    'Spending 20 minutes every morning making breakfast',
    'Skin looking tired and dull no matter what you try',
    'Your desk is always a mess of cables and clutter',
    'Never finding the right angle for video calls',
    'Wasting money on products that don\'t deliver results',
  ];
  const solutions = [
    'Blend your smoothie in seconds and drink straight from the blender',
    'Apply this serum once daily for visible results in 7 days',
    'This compact vacuum cleans your entire desk in under 30 seconds',
    'Adjustable stand works with any phone at any angle instantly',
    'Clinically proven LED therapy that shows results in 2 weeks',
  ];
  const ctas = [
    'Click the link in bio to get yours today',
    'Limited stock — grab it before it sells out again',
    'Use code TIKTOK20 for 20% off your first order',
    'Tap the shopping bag to shop now',
    'Link in comments — ships worldwide',
  ];
  const sceneBreakdown = serializeMetadata([
    { scene: 1, time: '0-3s', type: 'hook', description: 'Bold claim or shocking visual to stop scroll' },
    { scene: 2, time: '3-8s', type: 'problem', description: 'Show the frustration or pain point' },
    { scene: 3, time: '8-15s', type: 'reveal', description: 'Introduce product as the solution' },
    { scene: 4, time: '15-22s', type: 'demo', description: 'Close-up demo showing key features' },
    { scene: 5, time: '22-28s', type: 'proof', description: 'Before/after or result showcase' },
    { scene: 6, time: '28-32s', type: 'cta', description: 'Clear call to action with urgency' },
  ]);
  const hashtags = ['#tiktokmademebuyit', '#amazonfinds', '#productreview', '#viraltiktok', '#musthave', '#tiktokshop'];
  const idx = Math.floor(Math.random() * products.length);

  return {
    productName: products[idx],
    hook: hooks[idx],
    painPoint: painPoints[idx],
    solution: solutions[idx],
    cta: ctas[idx],
    sceneBreakdown,
    viralScore: 65 + Math.floor(Math.random() * 30),
    hashtags: hashtags.sort(() => Math.random() - 0.5).slice(0, 3).join(', '),
    language: 'en',
    videoId,
  };
}

// ── Existing Routes ──────────────────────────────────────────────────────

researchRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, sort, language } = req.query;
    const where: any = {};
    if (search) where.productName = { contains: search as string };
    if (language) where.language = language as string;
    const orderBy: any = sort === 'score' ? { viralScore: 'desc' } : { createdAt: 'desc' };
    const items = await prisma.research.findMany({ where, orderBy, take: 100 });
    res.json(items);
  } catch (e) { next(e); }
});

researchRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await prisma.research.findUnique({ where: { id: req.params.id } });
    if (!r) throw new AppError(404, 'Not found');
    res.json(r);
  } catch (e) { next(e); }
});

researchRoutes.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) throw new AppError(400, 'videoUrl required');
    const analysis = analyzeVideo(videoUrl);
    const record = await prisma.research.create({
      data: {
        id: uuid(), videoUrl, productName: analysis.productName,
        hook: analysis.hook, painPoint: analysis.painPoint, solution: analysis.solution,
        cta: analysis.cta, sceneBreakdown: analysis.sceneBreakdown,
        viralScore: analysis.viralScore, hashtags: analysis.hashtags,
        language: analysis.language, analysisMode: 'mock',
      },
    });
    res.status(201).json(record);
  } catch (e) { next(e); }
});

researchRoutes.post('/analyze-bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { urls } = req.body;
    if (!urls?.length) throw new AppError(400, 'urls[] required');
    const results = [];
    for (const url of urls) {
      const analysis = analyzeVideo(url);
      const record = await prisma.research.create({
        data: {
          id: uuid(), videoUrl: url, productName: analysis.productName,
          hook: analysis.hook, painPoint: analysis.painPoint, solution: analysis.solution,
          cta: analysis.cta, sceneBreakdown: analysis.sceneBreakdown,
          viralScore: analysis.viralScore, hashtags: analysis.hashtags,
          language: analysis.language, analysisMode: 'mock',
        },
      });
      results.push(record);
    }
    res.status(201).json({ count: results.length, items: results });
  } catch (e) { next(e); }
});

// ── Real Analyze ─────────────────────────────────────────────────────────

researchRoutes.post('/real-analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) throw new AppError(400, 'videoUrl required');

    console.log(`[Research] Real analyze: ${videoUrl}`);

    const result = await realAnalyze(videoUrl);

    const record = await prisma.research.create({
      data: {
        id: uuid(),
        videoUrl,
        videoPath: result.videoPath || '',
        subtitleText: result.subtitleText || '',
        ocrText: result.ocrText || '',
        sceneBreakdown: result.sceneBreakdown || '[]',
        productName: result.productName || 'Unknown',
        hook: result.hookAnalysis || '',
        painPoint: result.painAnalysis || '',
        solution: result.solutionAnalysis || '',
        cta: result.ctaAnalysis || '',
        hookAnalysis: result.hookAnalysis || '',
        painAnalysis: result.painAnalysis || '',
        solutionAnalysis: result.solutionAnalysis || '',
        ctaAnalysis: result.ctaAnalysis || '',
        viralScore: result.viralScore || 50,
        aiHook: result.hookAnalysis || '',
        aiPain: result.painAnalysis || '',
        aiSolution: result.solutionAnalysis || '',
        aiCta: result.ctaAnalysis || '',
        aiSceneBreakdown: result.aiSceneBreakdown || '[]',
        aiViralSummary: result.aiViralSummary || '',
        aiReplicableReason: result.aiReplicableReason || '',
        aiAnalyzed: result.aiAnalyzed === true,
        analysisMode: 'real',
      },
    });

    res.status(201).json(record);
  } catch (e) { next(e); }
});

// ── Shared routes ────────────────────────────────────────────────────────

researchRoutes.post('/:id/script', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await prisma.research.findUnique({ where: { id: req.params.id } });
    if (!r) throw new AppError(404, 'Not found');
    const scenes = deserializeMetadata<unknown[]>(r.sceneBreakdown);
    const scriptContent = {
      scriptType: 'ugc', language: r.language,
      hook: { text: r.hook, durationSeconds: 3 },
      scenes: scenes.map((s: any) => ({
        sceneNumber: s.scene, voiceover: `${s.type}: ${s.description || ''}`,
        onScreenText: '', durationSeconds: s.type === 'cta' ? 4 : 5, camera: 'handheld POV', shotType: s.type,
      })),
      cta: { text: r.cta, durationSeconds: 4 },
      hashtags: r.hashtags.split(', '),
    };
    const firstProduct = await prisma.product.findFirst();
    const script = await prisma.script.create({
      data: {
        id: uuid(), productId: firstProduct?.id || '',
        scriptType: 'ugc', language: r.language,
        content: JSON.stringify(scriptContent), status: 'generated',
      },
    });
    res.status(201).json({ script, researchId: r.id });
  } catch (e) { next(e); }
});

researchRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.research.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { next(e); }
});

researchRoutes.get('/export/json', async (_req: Request, res: Response) => {
  const items = await prisma.research.findMany({ orderBy: { viralScore: 'desc' } });
  res.setHeader('Content-Disposition', 'attachment; filename=research.json');
  res.json(items);
});

researchRoutes.get('/export/txt', async (_req: Request, res: Response) => {
  const items = await prisma.research.findMany({ orderBy: { viralScore: 'desc' } });
  let text = 'TikTok Viral Research Report\n' + '='.repeat(50) + '\n\n';
  for (const r of items) {
    text += `Product: ${r.productName} (Score: ${r.viralScore}/100) [${r.analysisMode}]\n`;
    text += `Hook: ${r.hook}\nPain: ${r.painPoint}\nSolution: ${r.solution}\nCTA: ${r.cta}\n`;
    if (r.subtitleText) text += `Transcript: ${r.subtitleText.slice(0, 200)}...\n`;
    text += `---\n\n`;
  }
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename=research.txt');
  res.send(text);
});
