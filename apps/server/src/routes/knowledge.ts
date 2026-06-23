import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { v4 as uuid } from 'uuid';
import { serializeMetadata } from '../lib/video-downloader';

export const knowledgeRoutes = Router();

// ── Seed Test Data ──────────────────────────────────────────────────────

knowledgeRoutes.post('/seed', async (_req: Request, res: Response) => {
  try {
    const countries = ['US','MY','TH','PH','VN','ID']; const cats = ['Skincare','Kitchen','Supplements','Fashion','Electronics'];
    const hooks = [
      'You NEED this in your life right now', 'I cant believe this actually works', 'Stop scrolling and look at this', 'This $20 product changed everything', 'I tried it so you dont have to',
      'Anda WAJIB cuba ni sekarang', 'Tak sangka benda ni berkesan gila', 'Berhenti scroll tengok ni dulu', 'Padu weh produk ni', 'Jujur review untuk korang',
      'คุณต้องลองสิ่งนี้ด่วน', 'ไม่เชื่อว่ามันจะใช้ได้จริง', 'หยุดเลื่อนดูนี่ก่อน', 'ของดีบอกต่อ', 'รีวิวตรงไม่อ้อม',
    ];
    const pains = [
      'No time to make breakfast', 'Skin looking tired and dull', 'Desk always messy', 'Never find the right angle', 'Wasting money on products',
      'Takde masa nak masak pagi', 'Kulit nampak kusam penat', 'Meja selalu bersepah', 'Tak pernah jumpa angle betul', 'Bazir duit beli barang',
    ];
    const solutions = [
      'Blend smoothie in 20 seconds anywhere', 'Apply serum daily 7 day results', 'Compact vacuum 30 second clean', 'Adjustable stand fits any phone', 'Clinically proven LED therapy',
      'Blend smoothie 20 saat je', 'Sapu serum setiap hari nampak hasil', 'Vacuum kecil bersih 30 saat', 'Stand boleh laras sesuai semua phone', 'Terapi LED terbukti klinikal',
    ];
    const ctas = ['Link in bio!','Shop now!','Tap to buy!','Limited stock!','Use code SAVE20'];
    const structures = [
      {name:'Hook→Problem→Solution→Proof→CTA',scenes:5},
      {name:'POV→Reveal→Demo→Result→CTA',scenes:5},
      {name:'Hook→Unbox→Review→Compare→CTA',scenes:5},
      {name:'Teaser→Problem→Hero→Social→CTA',scenes:5},
    ];
    const prompts = [
      {p:'Vertical 9:16 UGC shot, natural light, product demo, 4K, TikTok native',pr:'seedance'},
      {p:'Cinematic vertical, shallow DOF, product hero, golden hour, 4K HDR',pr:'kling'},
      {p:'Photorealistic 8K product showcase, IMAX-grade, editorial style',pr:'veo'},
    ];

    for (const h of hooks) await prisma.knowledgeHook.create({data:{id:uuid(),hook:h,language:h.includes('anda')||h.includes('tak')||h.includes('padu')?'ms':h.includes('คุณ')||h.includes('ไม่')?'th':'en',country:countries[Math.floor(Math.random()*6)],category:cats[Math.floor(Math.random()*5)],source:'mock',views:1000+Math.floor(Math.random()*50000),likes:100+Math.floor(Math.random()*10000),viralScore:50+Math.floor(Math.random()*45),tags:'viral,trending'}});
    for (const p of pains) await prisma.knowledgePain.create({data:{id:uuid(),painPoint:p,category:cats[Math.floor(Math.random()*5)],country:countries[Math.floor(Math.random()*6)],language:'en',source:'mock',viralScore:50+Math.floor(Math.random()*45)}});
    for (const s of solutions) await prisma.knowledgeSolution.create({data:{id:uuid(),solution:s,category:cats[Math.floor(Math.random()*5)],country:countries[Math.floor(Math.random()*6)],language:'en',source:'mock',viralScore:50+Math.floor(Math.random()*45)}});
    for (const c of ctas) for (let i=0;i<3;i++) await prisma.knowledgeCta.create({data:{id:uuid(),cta:c,country:countries[Math.floor(Math.random()*6)],language:'en',source:'mock',viralScore:60+Math.floor(Math.random()*35)}});
    for (const s of structures) await prisma.knowledgeStructure.create({data:{id:uuid(),structureName:s.name,sceneCount:s.scenes,category:cats[Math.floor(Math.random()*5)],country:countries[Math.floor(Math.random()*6)],viralScore:60+Math.floor(Math.random()*35),scenes:serializeMetadata(['hook','problem','solution','proof','cta'])}});
    for (const p of prompts) await prisma.knowledgePrompt.create({data:{id:uuid(),provider:p.pr,prompt:p.p, category:cats[Math.floor(Math.random()*5)],country:'US',viralScore:60+Math.floor(Math.random()*35)}});
    const [hc,pc,sc,cc,stc,prc] = await Promise.all([prisma.knowledgeHook.count(),prisma.knowledgePain.count(),prisma.knowledgeSolution.count(),prisma.knowledgeCta.count(),prisma.knowledgeStructure.count(),prisma.knowledgePrompt.count()]);
    res.json({seeded:{hooks:hc,pains:pc,solutions:sc,ctas:cc,structures:stc,prompts:prc}});
  } catch(e:any) {res.status(500).json({error:e.message});}
});

// ── Generic list helpers ────────────────────────────────────────────────

function listRoute(model: any, key: string) {
  return async (req: Request, res: Response) => {
    try {
      const { search, country, category, language, sort } = req.query;
      const where: any = {};
      if (search) where[key] = { contains: search as string };
      if (country) where.country = country as string;
      if (category) where.category = category as string;
      if (language) where.language = language as string;
      const orderBy = sort === 'score' ? { viralScore: 'desc' } : { createdAt: 'desc' };
      const items = await model.findMany({ where, orderBy, take: 100 });
      const total = await model.count({ where });
      res.json({ items, total });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  };
}

knowledgeRoutes.get('/hooks', listRoute(prisma.knowledgeHook, 'hook'));
knowledgeRoutes.get('/pains', listRoute(prisma.knowledgePain, 'painPoint'));
knowledgeRoutes.get('/solutions', listRoute(prisma.knowledgeSolution, 'solution'));
knowledgeRoutes.get('/ctas', listRoute(prisma.knowledgeCta, 'cta'));
knowledgeRoutes.get('/structures', listRoute(prisma.knowledgeStructure, 'structureName'));
knowledgeRoutes.get('/prompts', listRoute(prisma.knowledgePrompt, 'prompt'));

knowledgeRoutes.get('/videos', async (req: Request, res: Response) => {
  try {
    const where: any = {}; const { country, category } = req.query;
    if (country) where.country = country; if (category) where.category = category;
    const items = await prisma.knowledgeVideo.findMany({ where, orderBy: { viralScore: 'desc' }, take: 100 });
    res.json({ items, total: items.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Stats ──────────────────────────────────────────────────────────────

knowledgeRoutes.get('/stats', async (_req: Request, res: Response) => {
  const [hookTop, ctaTop, structTop, promptTop] = await Promise.all([
    prisma.knowledgeHook.findMany({ orderBy: { viralScore: 'desc' }, take: 5, select: { hook: true, viralScore: true } }),
    prisma.knowledgeCta.findMany({ orderBy: { viralScore: 'desc' }, take: 5, select: { cta: true, viralScore: true } }),
    prisma.knowledgeStructure.findMany({ orderBy: { viralScore: 'desc' }, take: 5, select: { structureName: true, viralScore: true } }),
    prisma.knowledgePrompt.findMany({ orderBy: { viralScore: 'desc' }, take: 5, select: { prompt: true, provider: true, viralScore: true } }),
  ]);
  const counts = { hooks: await prisma.knowledgeHook.count(), pains: await prisma.knowledgePain.count(), solutions: await prisma.knowledgeSolution.count(), ctas: await prisma.knowledgeCta.count(), structures: await prisma.knowledgeStructure.count(), prompts: await prisma.knowledgePrompt.count(), videos: await prisma.knowledgeVideo.count() };
  res.json({ counts, topHooks: hookTop, topCtas: ctaTop, topStructures: structTop, topPrompts: promptTop });
});

// ── Import ─────────────────────────────────────────────────────────────

knowledgeRoutes.post('/import', async (req: Request, res: Response) => {
  try {
    const { type, items } = req.body;
    if (!type || !items?.length) return res.status(400).json({ error: 'type + items[] required' });
    const models: Record<string, any> = { hooks: prisma.knowledgeHook, pains: prisma.knowledgePain, solutions: prisma.knowledgeSolution, ctas: prisma.knowledgeCta, structures: prisma.knowledgeStructure, prompts: prisma.knowledgePrompt, videos: prisma.knowledgeVideo };
    const model = models[type];
    if (!model) return res.status(400).json({ error: 'Invalid type: ' + type });
    let count = 0;
    for (const item of items) { await model.create({ data: { id: uuid(), ...item } }); count++; }
    res.json({ imported: count });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Export ──────────────────────────────────────────────────────────────

knowledgeRoutes.get('/export/:type', async (req: Request, res: Response) => {
  const models: Record<string, any> = { hooks: prisma.knowledgeHook, pains: prisma.knowledgePain, solutions: prisma.knowledgeSolution, ctas: prisma.knowledgeCta, structures: prisma.knowledgeStructure, prompts: prisma.knowledgePrompt, videos: prisma.knowledgeVideo };
  const model = models[req.params.type];
  if (!model) return res.status(400).json({ error: 'Invalid type' });
  const items = await model.findMany({ take: 500 });
  res.setHeader('Content-Disposition', `attachment; filename=knowledge_${req.params.type}.json`);
  res.json(items);
});
