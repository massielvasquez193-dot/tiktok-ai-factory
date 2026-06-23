import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const storyboardRoutes = Router();

// ── Mock Storyboard Generator ───────────────────────────────────────────

const CAMERAS = ['POV handheld', 'Overhead flat-lay', 'Macro close-up', 'Static tripod', 'Dolly slide', 'Slow push-in', 'Wide angle'];
const SHOT_TYPES = ['hook', 'reveal', 'demo', 'lifestyle', 'closeUp', 'transition', 'cta'];
const ACTORS = ['Female 25-35', 'Male 25-35', 'Hands only', 'Product only', 'Couple', 'Voiceover'];

function generateStoryboard(script: any): any[] {
  const scenes: any[] = [];
  const totalDuration = 30; // aim for ~30 seconds
  const sceneCount = 5 + Math.floor(Math.random() * 4); // 5-8 scenes

  const durations: number[] = [];
  const baseDurations = [3, 4, 5, 6, 4, 3, 3, 2]; // seconds per scene
  for (let i = 0; i < sceneCount; i++) durations.push(baseDurations[i] || 3);

  // Normalize to ~totalDuration
  const sum = durations.reduce((a, b) => a + b, 0);
  const scale = totalDuration / sum;
  const normalized = durations.map(d => Math.max(2, Math.round(d * scale)));

  for (let i = 0; i < sceneCount; i++) {
    const shotType = i === 0 ? 'hook' : i === sceneCount - 1 ? 'cta' : SHOT_TYPES[i % SHOT_TYPES.length];
    const camera = CAMERAS[i % CAMERAS.length];

    const subtitle = i === 0
      ? script.content?.split('.')[0] || script.content.substring(0, 60)
      : i === sceneCount - 1
        ? 'Tap the link to buy now!'
        : script.content?.split('.')[i]?.trim() || `Scene ${i + 1}`;

    const visualPrompt = `Vertical 9:16, ${camera}, ${shotType} shot, product: ${script.product?.product_name || 'product'}, natural lighting, UGC style, 4K, TikTok native, ${normalized[i]}s`;

    scenes.push({
      sceneNumber: i + 1,
      camera,
      shotType,
      action: `${shotType} scene with ${camera}`,
      actor: ACTORS[i % ACTORS.length],
      subtitle: subtitle.substring(0, 120),
      duration: normalized[i],
      visualPrompt,
    });
  }

  return scenes;
}

// ── Routes ──────────────────────────────────────────────────────────────

// GET /api/storyboards — list all
storyboardRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scriptId } = req.query;
    const where: any = {};
    if (scriptId) where.scriptId = scriptId;

    const list = await prisma.storyboard.findMany({
      where,
      include: { script: { include: { product: { select: { id: true, product_name: true } } } } },
      orderBy: [{ scriptId: 'asc' }, { sceneNumber: 'asc' }],
    });
    res.json(list);
  } catch (e) { next(e); }
});

// GET /api/storyboards/:id
storyboardRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sb = await prisma.storyboard.findUnique({
      where: { id: req.params.id },
      include: { script: { include: { product: true } } },
    });
    if (!sb) throw new AppError(404, 'Storyboard not found');
    res.json(sb);
  } catch (e) { next(e); }
});

// POST /api/storyboards/generate
storyboardRoutes.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scriptId } = req.body;
    if (!scriptId) throw new AppError(400, 'scriptId required');

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      include: { product: true },
    });
    if (!script) throw new AppError(404, 'Script not found');

    // Delete existing storyboards for this script
    await prisma.storyboard.deleteMany({ where: { scriptId } });

    // Generate new shots
    const shots = generateStoryboard(script);
    const created = await Promise.all(
      shots.map(s =>
        prisma.storyboard.create({
          data: {
            id: uuid(),
            scriptId,
            sceneNumber: s.sceneNumber,
            camera: s.camera,
            shotType: s.shotType,
            action: s.action,
            actor: s.actor,
            subtitle: s.subtitle,
            duration: s.duration,
            visualPrompt: s.visualPrompt,
          },
        })
      )
    );

    res.status(201).json({ count: created.length, shots: created });
  } catch (e) { next(e); }
});

// PUT /api/storyboards/:id — update single shot
storyboardRoutes.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { camera, shotType, action, actor, subtitle, duration, visualPrompt } = req.body;
    const data: any = {};
    if (camera !== undefined) data.camera = camera;
    if (shotType !== undefined) data.shotType = shotType;
    if (action !== undefined) data.action = action;
    if (actor !== undefined) data.actor = actor;
    if (subtitle !== undefined) data.subtitle = subtitle;
    if (duration !== undefined) data.duration = duration;
    if (visualPrompt !== undefined) data.visualPrompt = visualPrompt;

    const sb = await prisma.storyboard.update({
      where: { id: req.params.id },
      data: { ...data, updatedAt: new Date() },
    });
    res.json(sb);
  } catch (e) { next(e); }
});

// POST /api/storyboards/:id/regenerate — regenerate a single shot
storyboardRoutes.post('/:id/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sb = await prisma.storyboard.findUnique({
      where: { id: req.params.id },
      include: { script: { include: { product: true } } },
    });
    if (!sb) throw new AppError(404, 'Storyboard not found');

    const shots = generateStoryboard(sb.script);
    const match = shots.find(s => s.sceneNumber === sb.sceneNumber) || shots[0];
    if (!match) throw new AppError(500, 'Regeneration failed');

    const updated = await prisma.storyboard.update({
      where: { id: req.params.id },
      data: {
        camera: match.camera,
        shotType: match.shotType,
        action: match.action,
        actor: match.actor,
        subtitle: match.subtitle,
        duration: match.duration,
        visualPrompt: match.visualPrompt,
        updatedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/storyboards/:id
storyboardRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.storyboard.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
