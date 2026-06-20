import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const scriptRoutes = Router();

// ── Mock AI Script Generator ────────────────────────────────────────────

const TEMPLATES: Record<string, Record<string, string[]>> = {
  ugc: {
    en: [
      "Honestly, I was so tired of {pain}. Then I found {name}. {benefit}. It's honestly a game changer.",
      "I didn't think a {category} could fix {pain}. But after trying {name}, I'm genuinely impressed. {benefit}. Highly recommend!",
      "POV: You finally found a {category} that actually works. {name} makes {benefit} so easy. No joke.",
    ],
    ms: [
      "Sejujurnya, saya dah bosan dengan {pain}. Lepas cuba {name}, {benefit}. Memang terbaik!",
      "Saya tak sangka {category} boleh selesaikan {pain}. Tapi {name} memang power. {benefit}. Recommend gila!",
      "POV: Anda akhirnya jumpa {category} yang berkesan. {name} buat {benefit} jadi mudah. Serious!",
    ],
    th: [
      "พูดตรงๆ ฉันเบื่อกับ {pain} มาก จนได้ลอง {name} {benefit} มันเปลี่ยนชีวิตเลย!",
      "ไม่คิดว่า {category} จะแก้ปัญหา {pain} ได้ แต่ {name} ทำได้จริงๆ {benefit} แนะนำสุดๆ!",
      "ในที่สุดก็เจอ {category} ที่ใช้ได้จริง {name} ทำให้ {benefit} ง่ายมากๆ",
    ],
  },
  review: {
    en: [
      "Full honest review of the {name}. I've been testing it for a week. Pros: {benefit}. Cons: honestly none so far. {price} is a solid deal.",
      "Is the {name} worth {price}? Here's my honest take after 7 days. {benefit}. The build quality surprised me. Would buy again.",
      "Unboxing the {name} — first impressions: wow. {benefit}. For {price}, this {category} delivers way more than expected.",
    ],
    ms: [
      "Review jujur untuk {name}. Dah seminggu guna. Kelebihan: {benefit}. Kekurangan: setakat ni takde. {price} memang berbaloi.",
      "Adakah {name} berbaloi dengan harga {price}? Ini pendapat saya lepas 7 hari. {benefit}. Kualiti memang tip top.",
      "Unboxing {name} — first impression: gila. {benefit}. Untuk {price}, {category} ni memang lebih dari expectation.",
    ],
    th: [
      "รีวิวตรงๆ {name} หลังจากใช้มาหนึ่งสัปดาห์ ข้อดี: {benefit} ข้อเสีย: ยังไม่เจอ {price} คุ้มมาก!",
      "{name} ราคา {price} คุ้มไหม? นี่คือความเห็นหลังใช้ 7 วัน {benefit} คุณภาพดีเกินราคามาก",
      "แกะกล่อง {name} — ความรู้สึกแรก: ว้าว {benefit} สำหรับราคา {price} {category} นี้ให้เกินคุ้ม!",
    ],
  },
  before_after: {
    en: [
      "BEFORE: {pain}. Every single day. AFTER: {benefit}. The difference? {name}. This {category} changed everything in just days.",
      "This was my skin/routine BEFORE {name}. Not great. And this is AFTER just one week. {benefit}. I'm never going back.",
    ],
    ms: [
      "SEBELUM: {pain}. Setiap hari. SELEPAS: {benefit}. Bezanya? {name}. {category} ni ubah segalanya dalam masa beberapa hari.",
      "Ini rutin saya SEBELUM guna {name}. Tak best langsung. Dan ini SELEPAS seminggu. {benefit}. Takkan tinggal dah.",
    ],
    th: [
      "ก่อน: {pain} ทุกวัน หลัง: {benefit} ต่างกันเพราะ {name} {category} นี้เปลี่ยนทุกอย่างในไม่กี่วัน!",
      "นี่คือสภาพผิวก่อนใช้ {name} ไม่ดีเลย และนี่คือหลังใช้หนึ่งสัปดาห์ {benefit} จะไม่กลับไปอีกแล้ว!",
    ],
  },
  pov: {
    en: [
      "POV: You just bought the {name} and your morning routine went from {pain} to {benefit} in literally seconds.",
      "POV: You're the friend who always finds the best {category}s. This time it's {name}. {benefit}. You're welcome.",
    ],
    ms: [
      "POV: Anda baru beli {name} dan rutin pagi anda bertukar dari {pain} ke {benefit} dalam beberapa saat je.",
      "POV: Anda kawan yang selalu jumpa {category} terbaik. Kali ni {name}. {benefit}. Sama-sama.",
    ],
    th: [
      "POV: คุณเพิ่งซื้อ {name} และกิจวัตรตอนเช้าของคุณเปลี่ยนจาก {pain} เป็น {benefit} ในไม่กี่วินาที",
      "POV: คุณเป็นเพื่อนที่หา {category} เจ๋งๆ ได้ตลอด ครั้งนี้คือ {name} {benefit} ไม่ต้องขอบคุณ!",
    ],
  },
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockScript(product: any, scriptType: string, language: string): string {
  const templates = TEMPLATES[scriptType]?.[language] || TEMPLATES[scriptType]?.en || TEMPLATES.ugc.en;
  const template = pick(templates);

  const benefits = JSON.parse(product.benefits || '[]');
  const benefit = benefits.length > 0 ? pick(benefits) : 'amazing results';
  const pain = benefits.length > 1 ? benefits[1] : 'the usual hassle';

  return template
    .replace(/{name}/g, product.product_name)
    .replace(/{category}/g, product.category)
    .replace(/{price}/g, product.price)
    .replace(/{benefit}/g, benefit)
    .replace(/{pain}/g, pain);
}

// ── Routes ──────────────────────────────────────────────────────────────

// GET /api/scripts — list all, optional filter by productId
scriptRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, type, language } = req.query;
    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.scriptType = type;
    if (language) where.language = language;

    const scripts = await prisma.script.findMany({
      where,
      include: { product: { select: { id: true, product_name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(scripts);
  } catch (e) { next(e); }
});

// GET /api/scripts/:id
scriptRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await prisma.script.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!s) throw new AppError(404, 'Script not found');
    res.json(s);
  } catch (e) { next(e); }
});

// POST /api/scripts/generate — generate scripts for a product
scriptRoutes.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, scriptTypes, languages } = req.body;
    if (!productId) throw new AppError(400, 'productId required');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError(404, 'Product not found');

    const types: string[] = scriptTypes?.length ? scriptTypes : ['ugc', 'review', 'before_after', 'pov'];
    const langs: string[] = languages?.length ? languages : ['en'];

    const created: any[] = [];
    for (const scriptType of types) {
      for (const language of langs) {
        const content = generateMockScript(product, scriptType, language);
        const script = await prisma.script.create({
          data: {
            id: uuid(),
            productId,
            scriptType,
            language,
            content,
            status: 'generated',
          },
          include: { product: { select: { id: true, product_name: true, category: true } } },
        });
        created.push(script);
      }
    }

    res.status(201).json({ count: created.length, scripts: created });
  } catch (e) { next(e); }
});

// POST /api/scripts/:id/regenerate — regenerate a single script
scriptRoutes.post('/:id/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const script = await prisma.script.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!script) throw new AppError(404, 'Script not found');

    const content = generateMockScript(script.product, script.scriptType, script.language);
    const updated = await prisma.script.update({
      where: { id: req.params.id },
      data: { content, updatedAt: new Date() },
      include: { product: { select: { id: true, product_name: true, category: true } } },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/scripts/:id
scriptRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.script.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});
