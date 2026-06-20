import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const promptRoutes = Router();

// ── Enhanced Mock Prompt Generator ──────────────────────────────────────

const MODELS = ['seedance', 'kling', 'veo'];

type PromptTemplate = {
  camera: string;
  lighting: string;
  mood: string;
  cameraMovement: string;
  extraTags: string;
  style: string;
  quality: string;
  negativeBase: string[];
};

const MODEL_SPECS: Record<string, PromptTemplate> = {
  seedance: {
    camera: 'DSLR, 24mm wide angle',
    lighting: 'Natural window light, soft shadows',
    mood: 'Modern minimalist, warm palette',
    cameraMovement: 'Smooth push-in, handheld micro-shake for realism',
    extraTags: 'TikTok-native vertical video, product-first composition, clean ecommerce look',
    style: 'UGC creator style, authentic amateur feel, relatable lifestyle content',
    quality: '4K resolution, realistic textures, natural skin tones, no AI artifacts, 30fps',
    negativeBase: ['3D render', 'cartoon', 'illustration', 'over-saturated', 'studio lighting', 'perfect symmetry', 'generic stock footage', 'blurry background'],
  },
  kling: {
    camera: 'ARRI Alexa, 35mm anamorphic lens',
    lighting: '3-point studio lighting, rim light, controlled contrast',
    mood: 'Cinematic drama, high-end commercial',
    cameraMovement: 'Slow dolly in, precision tracking, parallax effect',
    extraTags: 'Cinematic commercial, shallow depth of field, cinematic color grading',
    style: 'Premium commercial, luxury product showcase, cinematic storytelling',
    quality: '4K HDR, true-to-life textures, filmic grain, 24fps, cinema aspect tone',
    negativeBase: ['handheld shake', 'amateur footage', 'flat lighting', 'oversaturated', 'CGI look', 'uncanny valley', 'low contrast', 'video game style'],
  },
  veo: {
    camera: 'IMAX-grade sensor, 50mm prime lens',
    lighting: 'Golden hour sunlight, volumetric light rays, natural diffusion',
    mood: 'Dreamy and aspirational, editorial photography feel',
    cameraMovement: 'Ultra-smooth gimbal, floating camera, macro push-in on details',
    extraTags: 'Photorealistic 8K, product hero moment, depth of field bokeh',
    style: 'Editorial magazine quality, aspirational lifestyle, premium brand aesthetic',
    quality: '8K photorealistic, Google Veo 2 quality, true-to-life materials, HDR10, 60fps',
    negativeBase: ['low resolution', 'compression artifacts', 'plastic textures', 'flat', 'washed out', 'CGI', 'unrealistic reflections', 'motion blur'],
  },
};

const ENVIRONMENTS: Record<string, string[]> = {
  Kitchen: ['Sleek modern kitchen with marble countertop', 'Sun-lit breakfast nook', 'Minimalist kitchen island setup'],
  Skincare: ['Bright spa bathroom with plants', 'Minimalist vanity with natural light', 'Luxury bathroom with golden hour light'],
  Supplement: ['Clean fitness studio with mirrors', 'Bright kitchen with fresh ingredients', 'Outdoor morning routine setting'],
  Default: ['Modern apartment with natural light', 'Cozy sunlit room with plants', 'Clean minimalist studio space'],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function getEnvForCategory(category: string): string {
  for (const [key, envs] of Object.entries(ENVIRONMENTS)) {
    if (category?.toLowerCase().includes(key.toLowerCase())) return pick(envs);
  }
  return pick(ENVIRONMENTS.Default);
}

function buildSeedancePrompt(storyboard: any): { prompt: string; negativePrompt: string } {
  const spec = MODEL_SPECS.seedance;
  const product = storyboard.script?.product?.product_name || 'the product';
  const cat = storyboard.script?.product?.category || 'Kitchen';
  const env = getEnvForCategory(cat);
  const actor = storyboard.actor || 'a person';
  const action = storyboard.action || 'demonstrating normal use';
  const shotType = storyboard.shotType || 'product demo';

  const prompt = [
    `Vertical 9:16 video. A realistic ${shotType} shot featuring ${product}.`,
    `${actor} ${action}. ${env}.`,
    `${spec.camera}. ${spec.lighting}.`,
    `${spec.cameraMovement}.`,
    `Color tone: ${spec.mood}.`,
    `${spec.style}. ${spec.quality}.`,
    `${spec.extraTags}. No logos, no text overlay. Original content only.`,
  ].join(' ');

  const negative = [
    ...spec.negativeBase,
    'distorted hands', 'warped product shape', 'text artifacts', 'mismatched lighting',
    'multiple products', 'cluttered background', 'watermark',
  ].join(', ');

  return { prompt, negativePrompt: negative };
}

function buildKlingPrompt(storyboard: any): { prompt: string; negativePrompt: string } {
  const spec = MODEL_SPECS.kling;
  const product = storyboard.script?.product?.product_name || 'the product';
  const cat = storyboard.script?.product?.category || 'Kitchen';
  const env = getEnvForCategory(cat);
  const actor = storyboard.actor || 'a person';
  const action = storyboard.action || 'demonstrating normal use';
  const shotType = storyboard.shotType || 'product demo';

  const prompt = [
    `[Cinematic] A high-end ${shotType} sequence. Subject: ${product}.`,
    `${actor} performing ${action}. Setting: ${env}.`,
    `Shot on ${spec.camera}. ${spec.lighting}.`,
    `Camera direction: ${spec.cameraMovement}.`,
    `Visual direction: ${spec.mood}. ${spec.style}.`,
    `${spec.quality}. ${spec.extraTags}.`,
    `Output: 9:16 vertical. Professional product film. No watermarks.`,
  ].join('\n');

  const negative = [...spec.negativeBase, 'social media filter', 'text overlay', 'amateur grade', 'shake', 'blur'].join(', ');

  return { prompt, negativePrompt: negative };
}

function buildVeoPrompt(storyboard: any): { prompt: string; negativePrompt: string } {
  const spec = MODEL_SPECS.veo;
  const product = storyboard.script?.product?.product_name || 'the product';
  const cat = storyboard.script?.product?.category || 'Kitchen';
  const env = getEnvForCategory(cat);
  const actor = storyboard.actor || 'a person';
  const action = storyboard.action || 'demonstrating normal use';
  const shotType = storyboard.shotType || 'product demo';

  const prompt = [
    `Create a ${spec.quality} vertical video (9:16 aspect ratio).`,
    `Subject: ${product}. Scene type: ${shotType}.`,
    `${actor} ${action} in ${env}.`,
    `Camera: ${spec.camera}. ${spec.lighting}.`,
    `Movement: ${spec.cameraMovement}.`,
    `Aesthetic: ${spec.style}. Mood: ${spec.mood}.`,
    `${spec.extraTags}. Zero AI artifacts. No uncanny valley. True photographic realism.`,
  ].join(' ');

  const negative = [...spec.negativeBase, 'CGI', 'render', 'illustration', 'uncanny', 'plastic', 'blurry', 'text'].join(', ');

  return { prompt, negativePrompt: negative };
}

function generatePrompt(storyboard: any, model: string): { prompt: string; negativePrompt: string } {
  switch (model) {
    case 'seedance': return buildSeedancePrompt(storyboard);
    case 'kling':    return buildKlingPrompt(storyboard);
    case 'veo':      return buildVeoPrompt(storyboard);
    default:         return buildSeedancePrompt(storyboard);
  }
}

// ── Routes ──────────────────────────────────────────────────────────────

promptRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyboardId, model, sceneNumber } = req.query;
    const where: any = {};
    if (storyboardId) where.storyboardId = storyboardId;
    if (model) where.model = model;
    if (sceneNumber) where.sceneNumber = Number(sceneNumber);

    const list = await prisma.prompt.findMany({
      where,
      include: {
        storyboard: {
          include: { script: { include: { product: { select: { id: true, product_name: true, category: true } } } } },
        },
      },
      orderBy: [{ storyboardId: 'asc' }, { sceneNumber: 'asc' }, { model: 'asc' }],
      take: 300,
    });
    res.json(list);
  } catch (e) { next(e); }
});

promptRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await prisma.prompt.findUnique({
      where: { id: req.params.id },
      include: { storyboard: { include: { script: { include: { product: true } } } } },
    });
    if (!p) throw new AppError(404, 'Not found');
    res.json(p);
  } catch (e) { next(e); }
});

promptRoutes.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyboardId } = req.body;
    if (!storyboardId) throw new AppError(400, 'storyboardId required');

    const storyboard = await prisma.storyboard.findUnique({
      where: { id: storyboardId },
      include: { script: { include: { product: true } } },
    });
    if (!storyboard) throw new AppError(404, 'Storyboard not found');

    const targetModels = req.body.models?.length ? req.body.models : MODELS;

    // Delete existing for clean regeneration
    await prisma.prompt.deleteMany({ where: { storyboardId } });

    const created = [];
    for (const model of targetModels) {
      const { prompt, negativePrompt } = generatePrompt(storyboard, model);
      const p = await prisma.prompt.create({
        data: { id: uuid(), storyboardId, sceneNumber: storyboard.sceneNumber, model, prompt, negativePrompt },
        include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true, category: true } } } } } } },
      });
      created.push(p);
    }

    res.status(201).json({ count: created.length, prompts: created });
  } catch (e) { next(e); }
});

promptRoutes.post('/generate-bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scriptId } = req.body;
    if (!scriptId) throw new AppError(400, 'scriptId required');

    const shots = await prisma.storyboard.findMany({
      where: { scriptId },
      include: { script: { include: { product: true } } },
      orderBy: { sceneNumber: 'asc' },
    });
    if (!shots.length) throw new AppError(404, 'No storyboards found');

    const targetModels = req.body.models?.length ? req.body.models : MODELS;

    const created = [];
    for (const shot of shots) {
      await prisma.prompt.deleteMany({ where: { storyboardId: shot.id } });
      for (const model of targetModels) {
        const { prompt, negativePrompt } = generatePrompt(shot, model);
        const p = await prisma.prompt.create({
          data: { id: uuid(), storyboardId: shot.id, sceneNumber: shot.sceneNumber, model, prompt, negativePrompt },
          include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true, category: true } } } } } } },
        });
        created.push(p);
      }
    }

    res.status(201).json({ count: created.length, prompts: created });
  } catch (e) { next(e); }
});

promptRoutes.post('/:id/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.prompt.findUnique({
      where: { id: req.params.id },
      include: { storyboard: { include: { script: { include: { product: true } } } } },
    });
    if (!existing) throw new AppError(404, 'Not found');

    const { prompt, negativePrompt } = generatePrompt(existing.storyboard, existing.model);
    const updated = await prisma.prompt.update({
      where: { id: req.params.id },
      data: { prompt, negativePrompt, updatedAt: new Date() },
      include: { storyboard: { include: { script: { include: { product: { select: { id: true, product_name: true, category: true } } } } } } },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

promptRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.prompt.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Export Prompts JSON
promptRoutes.get('/export/json', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scriptId } = req.query;
    const where: any = scriptId ? { storyboard: { scriptId: scriptId as string } } : {};
    const prompts = await prisma.prompt.findMany({
      where,
      include: { storyboard: { include: { script: { include: { product: { select: { product_name: true, category: true } } } } } } },
      orderBy: [{ storyboardId: 'asc' }, { model: 'asc' }],
    });
    res.setHeader('Content-Disposition', 'attachment; filename=prompts.json');
    res.json(prompts);
  } catch (e) { next(e); }
});

// Export Prompts TXT
promptRoutes.get('/export/txt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scriptId } = req.query;
    const where: any = scriptId ? { storyboard: { scriptId: scriptId as string } } : {};
    const prompts = await prisma.prompt.findMany({
      where,
      include: { storyboard: { include: { script: { include: { product: { select: { product_name: true, category: true } } } } } } },
      orderBy: [{ storyboardId: 'asc' }, { model: 'asc' }],
    });

    // Group by scene
    const grouped: Record<string, any[]> = {};
    for (const p of prompts) {
      const key = `${p.storyboardId}_shot${p.sceneNumber}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    }

    let text = 'TikTok AI Video Factory — AI Video Prompts\n';
    text += '='.repeat(60) + '\n\n';

    for (const [, group] of Object.entries(grouped)) {
      const info = group[0];
      text += `Scene #${info.sceneNumber} — ${info.storyboard?.script?.product?.product_name || 'Unknown'} (${info.storyboard?.script?.product?.category || ''})\n`;
      text += '-'.repeat(40) + '\n';
      for (const p of group) {
        text += `\n[${p.model.toUpperCase()}]\n`;
        text += `${p.prompt}\n`;
        text += `Negative: ${p.negativePrompt}\n`;
      }
      text += '\n';
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=prompts.txt');
    res.send(text);
  } catch (e) { next(e); }
});
