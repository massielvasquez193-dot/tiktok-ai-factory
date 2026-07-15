import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';
import { ProviderManager } from '../providers/manager/ProviderManager';
import { createAndCharge, estimateCost, InsufficientCreditsError } from '../services/videoTask.service';
import { getOrCreateWallet } from '../services/credit.service';
import { validateStyle, resolveStyle, VALID_STYLES, DEFAULT_STYLE, styleForApi, STYLE_DISPLAY } from '../lib/tiktok-styles';

const UPLOAD_DIR = path.resolve(process.cwd(), '..', '..', 'uploads', 'video-generator');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({ destination: (_r, _f, cb) => cb(null, UPLOAD_DIR), filename: (_r, f, cb) => cb(null, uuid() + path.extname(f.originalname)) });
const upload = multer({ storage, limits: { fileSize: 20*1024*1024 } });

export const videoGeneratorRoutes = Router();
const ACTIVE_JOBS = new Map<string, any>();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract workspaceId from x-workspace-id header or fallback to first member workspace. */
async function resolveWorkspace(req: Request): Promise<string> {
  const fromHeader = req.headers['x-workspace-id'] as string;
  if (fromHeader) return fromHeader;
  // Fallback: use user's first workspace
  if (req.user?.id) {
    const members = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      take: 1,
    });
    if (members[0]) return members[0].workspaceId;
  }
  throw new Error('Workspace context required — set x-workspace-id header');
}

// GET /api/video-generator/tasks
videoGeneratorRoutes.get('/tasks', async (req: Request, res: Response) => {
  try {
    const where: any = {};
    // When authenticated, scope to user's workspace
    if (req.user?.id && req.headers['x-workspace-id']) {
      where.workspaceId = req.headers['x-workspace-id'];
    }
    const tasks = await prisma.videoTask.findMany({
      where,
      include: { prompt: { select: { id: true, prompt: true } }, video: { select: { id: true, videoUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const enriched = tasks.map(t => ({
      ...t,
      style: styleForApi((t.metadata as any)?.tiktokStyle),
    }));
    res.json(enriched);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-generator/cost-estimate
videoGeneratorRoutes.get('/cost-estimate', (_req: Request, res: Response) => {
  // Return cost estimate for all supported models
  const models = [
    { model: 'seedance', cost: estimateCost('seedance'), resolution: '720p' },
    { model: 'kling', cost: estimateCost('kling'), resolution: '720p' },
    { model: 'veo', cost: estimateCost('veo'), resolution: '1080p' },
  ];
  // Return available styles for the frontend selector
  const styles = Object.entries(STYLE_DISPLAY).map(([key, info]) => ({
    key,
    nameZh: info.nameZh,
    description: info.description,
    scene: info.scene,
  }));
  res.json({
    models,
    styles,
    defaultStyle: DEFAULT_STYLE,
    currency: 'credits',
  });
});

// POST /api/video-generator/generate
// Atomic flow: charge credits → create task → submit to provider
// Idempotency: client can send X-Idempotency-Key header to prevent duplicate submissions
videoGeneratorRoutes.post('/generate', upload.single('productImage'), async (req: Request, res: Response) => {
  try {
    const { prompt: promptText, model, aspectRatio, duration, quantity, style: rawStyle, stylePrompt: _ignored } = req.body;
    if (!promptText) return res.status(400).json({ error: 'prompt required' });

    // ═══ Style validation (Batch 3) ════════════════════════════════════════════
    // White-list validation: only VALID_STYLES keys are accepted.
    // `stylePrompt` is explicitly destructured as _ignored — frontend cannot
    // inject arbitrary system prompts. The backend always composes its own.
    let styleKey: string;
    try {
      styleKey = validateStyle(rawStyle);
    } catch (err: any) {
      return res.status(400).json({
        error: err.message,
        validStyles: VALID_STYLES,
      });
    }

    const targetModel = model || 'seedance';
    const count = Math.min(Number(quantity) || 1, 4);
    const costPerTask = estimateCost(targetModel);
    const totalCost = costPerTask * count;

    // Resolve auth context
    const workspaceId = await resolveWorkspace(req);
    const userId = req.user?.id || 'anonymous';

    // Client idempotency key — prevents duplicate HTTP submissions
    const clientIdempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

    // ── UX fast-fail: check balance BEFORE creating any tasks ─────────────
    const wallet = await getOrCreateWallet(workspaceId);
    if (wallet.balance < totalCost) {
      return res.status(402).json({
        error: 'Insufficient credits',
        balance: wallet.balance,
        required: totalCost,
        costPerTask,
        quantity: count,
      });
    }

    // ── Resolve prompt record ────────────────────────────────────────────
    let promptRecord = await prisma.prompt.findFirst({
      where: { prompt: promptText },
      orderBy: { createdAt: 'desc' },
    });
    if (!promptRecord) {
      // Find first storyboard to associate
      const firstStoryboard = await prisma.storyboard.findFirst();
      if (!firstStoryboard) {
        return res.status(400).json({ error: 'No storyboard available. Create a script and storyboard first.' });
      }
      promptRecord = await prisma.prompt.create({
        data: {
          id: uuid(),
          storyboardId: firstStoryboard.id,
          workspaceId,
          model: targetModel,
          prompt: promptText,
          sceneNumber: 1,
        },
      });
    }

    // ── Create tasks with credits charged ─────────────────────────────────
    const results: any[] = [];
    for (let i = 0; i < count; i++) {
      try {
        const created = await createAndCharge({
          workspaceId,
          userId,
          promptId: promptRecord.id,
          model: targetModel,
          costOverride: costPerTask,
          style: styleKey,
          clientIdempotencyKey,
        });

        // Submit to provider if not a duplicate (fire-and-forget)
        if (!created.duplicate) {
          ProviderManager.instance.submitTask(created.taskId).catch(err => {
            console.error(`[VideoGenerator] Submit failed for task ${created.taskId}:`, err.message);
          });
        } else {
          console.log(`[VideoGenerator] Task ${created.taskId} is duplicate — skipping provider submission`);
        }

        results.push({
          id: created.taskId,
          creditsCharged: created.creditsCharged,
          balanceAfter: created.balanceAfter,
          status: created.duplicate ? 'existing' : 'submitted',
          duplicate: created.duplicate,
          style: styleKey,
          styleDisplay: styleForApi(styleKey).nameZh,
        });
      } catch (err: any) {
        if (err instanceof InsufficientCreditsError) {
          results.push({
            error: 'Insufficient credits',
            required: err.required,
            balance: wallet.balance,
          });
          break; // Stop creating more tasks
        }
        results.push({ error: err.message });
      }
    }

    res.status(201).json({
      count: results.filter(r => r.id).length,
      totalCost: results.reduce((sum, r) => sum + (r.creditsCharged || 0), 0),
      style: styleKey,
      results,
    });
  } catch (e: any) {
    console.error('[VideoGenerator] POST /generate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/video-generator/run — Full Pipeline (async)
videoGeneratorRoutes.post('/run', upload.single('productImage'), async (req: Request, res: Response) => {
  try {
    const { productId, countries, scriptCount } = req.body;
    const product = productId
      ? await prisma.product.findUnique({ where: { id: productId } })
      : await prisma.product.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!product) return res.status(404).json({ error: 'No product found' });

    const workspaceId = await resolveWorkspace(req);
    const userId = req.user?.id || 'anonymous';

    const jobId = uuid();
    const cs = countries?.split(',').map((s: string) => s.trim()).filter(Boolean) || ['US'];
    const API = 'http://localhost:' + (process.env.PORT || 4002);
    const result: any = { jobId, steps: [], status: 'running', creditsUsed: 0 };
    ACTIVE_JOBS.set(jobId, result);

    // Run async (entire pipeline is fire-and-forget)
    (async () => {
      let pipelineCredits = 0;
      try {
        // Step 1: Research
        result.steps.push({ step: 'research', status: 'running' });
        await fetch(API + '/api/research/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: 'https://www.tiktok.com/tag/' + encodeURIComponent(product.category) }),
        });
        result.steps[0].status = 'completed';

        // Step 2: Knowledge
        result.steps.push({ step: 'knowledge', status: 'running' });
        await fetch(API + '/api/knowledge/stats');
        result.steps[1].status = 'completed';

        // Step 3: Scripts
        result.steps.push({ step: 'scripts', status: 'running' });
        const types = ['ugc', 'review', 'pov', 'problem_solution'].slice(0, Number(scriptCount) || 3);
        for (const c of cs) {
          for (const st of types) {
            await fetch(API + '/api/scripts/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: product.id,
                scriptTypes: [st],
                languages: [c === 'US' ? 'en' : c === 'MY' ? 'ms' : 'en'],
              }),
            });
          }
        }
        result.steps[2].status = 'completed';
        result.steps[2].count = cs.length * types.length;

        // Step 4: Prompts + Storyboards
        result.steps.push({ step: 'prompts', status: 'running' });
        const scripts = await prisma.script.findMany({ where: { productId: product.id }, take: 5 });
        const promptIds: string[] = [];
        for (const s of scripts) {
          let content: any = {};
          try { content = JSON.parse(typeof s.content === 'string' ? s.content : s.content); } catch { content = {}; }
          for (const scene of (content.scenes || []).slice(0, 3)) {
            const sb = await prisma.storyboard.create({
              data: {
                id: uuid(), scriptId: s.id, sceneNumber: scene.sceneNumber || 1,
                camera: scene.camera || 'POV', shotType: scene.shotType || 'demo',
                action: '', actor: 'Model', subtitle: scene.voiceover || '',
                duration: scene.durationSeconds || 4,
                visualPrompt: 'Vertical 9:16, ' + product.product_name + ', UGC, 4K',
              },
            });
            const p = await prisma.prompt.create({
              data: {
                id: uuid(), storyboardId: sb.id, sceneNumber: sb.sceneNumber,
                workspaceId, model: 'seedance', prompt: sb.visualPrompt,
                negativePrompt: 'blurry',
              },
            });
            promptIds.push(p.id);
          }
        }
        result.steps[3].status = 'completed';

        // Step 5: Video (with credits) — charge + submit each prompt
        result.steps.push({ step: 'video', status: 'running' });
        let videoCount = 0;
        const costPerTask = estimateCost('seedance');

        // Check balance before batch
        const wallet = await getOrCreateWallet(workspaceId);
        const maxVideos = Math.min(promptIds.length, Math.floor(wallet.balance / costPerTask));

        for (const pid of promptIds.slice(0, maxVideos)) {
          try {
            const created = await createAndCharge({
              workspaceId, userId, promptId: pid, model: 'seedance', costOverride: costPerTask,
            });
            // Fire-and-forget submission
            ProviderManager.instance.submitTask(created.taskId).catch(err =>
              console.error(`[Pipeline] Submit error ${created.taskId}:`, err.message),
            );
            pipelineCredits += costPerTask;
            videoCount++;
          } catch (err: any) {
            if (err instanceof InsufficientCreditsError) break;
            console.error('[Pipeline] Task creation error:', err.message);
          }
        }

        result.steps[4].status = 'completed';
        result.steps[4].count = videoCount;
        result.steps[4].creditsUsed = pipelineCredits;
        result.creditsUsed = pipelineCredits;

        // Step 6: Post Production (async — tasks are still generating)
        result.steps.push({ step: 'post', status: 'running' });
        const vids = await prisma.video.findMany({ take: 1 });
        if (vids[0]) {
          await fetch(API + '/api/post-production/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: vids[0].id, country: cs[0], language: 'en',
              ctaType: 'buy', priceTag: product.price, bgm: 'tiktok_trending',
            }),
          });
        }
        result.steps[5].status = 'completed';

        // Step 7: Complete
        result.steps.push({ step: 'complete', status: 'done' });
        result.status = 'completed';
      } catch (err: any) {
        result.status = 'failed';
        result.error = err.message;
      }
    })();

    res.status(202).json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-generator/jobs/:id
videoGeneratorRoutes.get('/jobs/:id', async (req: Request, res: Response) => {
  const job = ACTIVE_JOBS.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// GET /api/video-generator/jobs
videoGeneratorRoutes.get('/jobs', (_req: Request, res: Response) => {
  res.json(Array.from(ACTIVE_JOBS.entries()).map(([id, data]) => ({ id, ...data })));
});

// DELETE /api/video-generator/tasks/:id
videoGeneratorRoutes.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    await prisma.videoTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
