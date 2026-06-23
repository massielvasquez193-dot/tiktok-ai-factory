import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const publishingRoutes = Router();

const COUNTRIES = ['US','UK','MY','TH','PH','VN','ID','SG','CA','AU'];
const HASHTAG_POOLS: Record<string, string[]> = {
  en: ['#tiktokmademebuyit','#viraltiktok','#amazonfinds','#musthave','#productreview','#tiktokshop','#newarrival','#fyp','#trending','#satisfying'],
  ms: ['#tiktokmalaysia','#baranganviral','#wajibbeli','#fypmalaysia','#reviewjujur','#tiktokshopmy','#baranganmurah','#viralmy'],
  th: ['#tiktokthailand','#สินค้าดี','#ของดีบอกต่อ','#รีวิวของดี','#tiktokshopth','#ของมันต้องมี','#ไวรัล'],
  fil: ['#tiktokphilippines','#budolfinds','#musttry','#tiktokshopph','#sulit','#legit','#viralph'],
  vi: ['#tiktokvietnam','#hangmoi','#review','#tiktokshopvn','#sale','#fypvietnam','#chuyenghiep'],
  id: ['#tiktokindonesia','#viral','#wajibbeli','#tiktokshopid','#murahmeriah','#reviewjujur','#fyppppp'],
};

const LANG_MAP: Record<string, string> = { US:'en',UK:'en',MY:'ms',TH:'th',PH:'fil',VN:'vi',ID:'id',SG:'en',CA:'en',AU:'en' };
const TITLE_TEMPLATES: Record<string, string[]> = {
  en: ['Honest Review: %s — Is It Worth It?','I Tested %s For 30 Days — Here\'s What Happened','%s Review — The Truth After 1 Week','Why Everyone Is Buying %s Right Now','%s: Game Changer or Hype?'],
  ms: ['Review Jujur: %s — Berbaloi Ke?','Saya Cuba %s 30 Hari — Ini Hasilnya','%s Review — Kebenaran Selepas Seminggu','Kenapa Semua Orang Beli %s Sekarang','%s: Game Changer Ke Tipu?'],
  th: ['รีวิวตรงๆ: %s — คุ้มไหม?','ลองใช้ %s 30 วัน — นี่คือผลลัพธ์','รีวิว %s — ความจริงหลัง 1 สัปดาห์','ทำไมทุกคนซื้อ %s ตอนนี้','%s: ดีจริงหรือแค่กระแส?'],
  fil: ['Honest Review: %s — Sulit Ba?','Sinubukan Ko %s Ng 30 Araw — Eto Resulta','%s Review — Ang Totoo After 1 Week','Bakit Lahat Bumibili Ng %s Ngayon','%s: Game Changer o Hype?'],
  vi: ['Review Thật: %s — Có Đáng Mua Không?','Tôi Thử %s 30 Ngày — Đây Là Kết Quả','%s Review — Sự Thật Sau 1 Tuần','Tại Sao Mọi Người Đều Mua %s','%s: Tốt Thật Hay Chỉ Là Hot?'],
  id: ['Review Jujur: %s — Worth It Gak?','Gue Coba %s 30 Hari — Ini Hasilnya','%s Review — Kebenaran Setelah 1 Minggu','Kenapa Semua Orang Beli %s Sekarang','%s: Game Changer Atau Hype?'],
};

function generateContent(productName: string, country: string, price: string) {
  const lang = LANG_MAP[country] || 'en';
  const titles = TITLE_TEMPLATES[lang] || TITLE_TEMPLATES.en;
  const title = titles[Math.floor(Math.random() * titles.length)].replace('%s', productName);
  const hashtags = (HASHTAG_POOLS[lang] || HASHTAG_POOLS.en).sort(() => Math.random() - 0.5).slice(0, 5).join(' ');
  const cta: Record<string, string> = { en:'Link in bio! Limited stock!', ms:'Link di bio! Stok terhad!', th:'ลิงก์ในไบโอ! ของมีจำกัด!', fil:'Link sa bio! Limited stock!', vi:'Link trong bio! Số lượng có hạn!', id:'Link di bio! Stok terbatas!' };
  const description = [
    `Full review of ${productName}. Price: ${price}.`,
    `Honest thoughts after testing. ${cta[lang] || cta.en}`,
    `Comment below if you have questions!`,
  ].join('\n');
  const pinned = `${cta[lang] || cta.en} 💫`;
  return { title, description, hashtags, pinned };
}

publishingRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await prisma.publishingTask.findMany({ orderBy: { createdAt: 'desc' } })); } catch (e) { next(e); }
});

publishingRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { const p = await prisma.publishingTask.findUnique({ where: { id: req.params.id } }); if (!p) throw new AppError(404, 'Not found'); res.json(p); } catch (e) { next(e); }
});

publishingRoutes.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoId, country } = req.body;
    if (!videoId) throw new AppError(400, 'videoId required');
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    const product = video ? await prisma.product.findUnique({ where: { id: video.productId }, select: { product_name: true, price: true } }) : null;
    const content = generateContent(product?.product_name || 'Product', country || 'US', product?.price || '$XX');
    const task = await prisma.publishingTask.create({
      data: { id: uuid(), videoId, country: country || 'US', title: content.title, description: content.description, hashtags: content.hashtags, pinnedComment: content.pinned, status: 'pending' },
    });
    res.status(201).json(task);
  } catch (e) { next(e); }
});

publishingRoutes.post('/:id/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scheduledAt } = req.body;
    const task = await prisma.publishingTask.update({ where: { id: req.params.id }, data: { status: scheduledAt ? 'scheduled' : 'pending', scheduledAt: scheduledAt ? new Date(scheduledAt) : null } });
    res.json(task);
  } catch (e) { next(e); }
});

publishingRoutes.post('/:id/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.publishingTask.update({ where: { id: req.params.id }, data: { status: 'published' } });
    res.json(task);
  } catch (e) { next(e); }
});

publishingRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.publishingTask.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { next(e); }
});

// Export as JSON
publishingRoutes.get('/export/json', async (_req: Request, res: Response) => {
  const tasks = await prisma.publishingTask.findMany({ where: { status: 'published' }, orderBy: { createdAt: 'desc' } });
  res.setHeader('Content-Disposition', 'attachment; filename=published.json');
  res.json(tasks);
});
