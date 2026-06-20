import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { AppError } from '../middleware/error';
import { v4 as uuid } from 'uuid';

export const localizationRoutes = Router();

// ── Country Configs ──────────────────────────────────────────────────────
// All 7 countries with localized data

const COUNTRIES: Record<string, {
  language: string; currency: string; symbol: string;
  hookPhrases: string[]; ctaPhrases: string[]; localExpressions: string[];
  voiceStyles: string[];
}> = {
  US: {
    language: 'English', currency: 'USD', symbol: '$',
    hookPhrases: ['You NEED this in your life', 'I can\'t believe this actually works', 'Honest review incoming', 'This changed everything for me', 'Stop scrolling, look at this'],
    ctaPhrases: ['Link in bio!', 'Shop now - limited stock!', 'Tap to grab yours', 'Use code SAVE20 at checkout', 'Get it before it sells out'],
    localExpressions: ['game changer', 'no brainer', 'literally obsessed', 'the real deal', 'hits different'],
    voiceStyles: ['energetic', 'relatable', 'straight-talk', 'excited'],
  },
  UK: {
    language: 'English (UK)', currency: 'GBP', symbol: '£',
    hookPhrases: ['You absolutely need this in your life', 'I can\'t believe this actually works, mate', 'Proper honest review incoming', 'This has genuinely changed everything', 'Stop scrolling and have a look at this'],
    ctaPhrases: ['Link in bio, cheers!', 'Shop now - limited stock!', 'Tap to grab yours today', 'Use code SAVE20 at checkout', 'Get it before it\'s gone'],
    localExpressions: ['brilliant', 'proper good', 'chuffed to bits', 'spot on', 'sorted'],
    voiceStyles: ['polite', 'witty', 'understated', 'friendly'],
  },
  MY: {
    language: 'Malay', currency: 'MYR', symbol: 'RM',
    hookPhrases: ['Anda WAJIB cuba ni', 'Tak sangka benda ni berkesan', 'Review jujur untuk korang', 'Ni memang game changer', 'Berhenti scroll, tengok ni'],
    ctaPhrases: ['Link di bio!', 'Beli sekarang - stok terhad!', 'Tap untuk dapatkan', 'Guna kod SAVE20', 'Jangan tunggu lama-lama'],
    localExpressions: ['memang power', 'berbaloi gila', 'terbaik', 'padu weh', 'mantap'],
    voiceStyles: ['santai', 'mesra', 'bersemangat', 'jujur'],
  },
  TH: {
    language: 'Thai', currency: 'THB', symbol: '฿',
    hookPhrases: ['คุณต้องลองสิ่งนี้', 'ไม่เชื่อว่ามันจะใช้ได้จริง', 'รีวิวตรงไม่อ้อม', 'สิ่งนี้เปลี่ยนชีวิตฉัน', 'หยุดเลื่อนดูนี่'],
    ctaPhrases: ['ลิงก์ในไบโอ!', 'ชื้อตอนนี้ - ของมีจำกัด!', 'กดเลย!', 'ใช้โค้ด SAVE20', 'รีบก่อนหมด!'],
    localExpressions: ['ดีมาก', 'คุ้มมาก', 'สุดยอด', 'แสบมาก', 'เริ่มมาก'],
    voiceStyles: ['เป็นกันเอง', 'สนุกสนาน', 'ตื่นเต้น', 'จริงใจ'],
  },
  PH: {
    language: 'Filipino', currency: 'PHP', symbol: '₱',
    hookPhrases: ['Kailangan mo \'to sa buhay mo', 'Di ako makapaniwala na gumagana \'to', 'Honest review para sa inyo', 'Binago nito ang lahat para sa akin', 'Tigil scroll, tingnan mo \'to'],
    ctaPhrases: ['Link sa bio!', 'Bili na - limited stock!', 'Tap para makuha', 'Gamitin ang code SAVE20', 'Kunin bago maubos'],
    localExpressions: ['sobrang galing', 'sulit na sulit', 'grabe \'to', 'panalo', 'astig'],
    voiceStyles: ['masigla', 'palakaibigan', 'totoo', 'masaya'],
  },
  VN: {
    language: 'Vietnamese', currency: 'VND', symbol: '₫',
    hookPhrases: ['Bạn CẦN cái này trong đời', 'Không thể tin được nó hoạt động', 'Đánh giá thật lòng đây', 'Cái này đã thay đổi mọi thứ', 'Dừng lướt, xem này'],
    ctaPhrases: ['Link trong bio!', 'Mua ngay - số lượng có hạn!', 'Nhấn để mua', 'Dùng mã SAVE20', 'Lấy ngay trước khi hết!'],
    localExpressions: ['tuyệt vời', 'đáng đồng tiền', 'quá đỉnh', 'xịn xò', 'chất lượng'],
    voiceStyles: ['năng động', 'thân thiện', 'chân thật', 'vui vẻ'],
  },
  ID: {
    language: 'Indonesian', currency: 'IDR', symbol: 'Rp',
    hookPhrases: ['Kamu WAJIB coba ini', 'Gak nyangka ini beneran works', 'Review jujur buat kamu', 'Ini beneran game changer', 'Stop scroll, liat ini dulu'],
    ctaPhrases: ['Link di bio!', 'Beli sekarang - stok terbatas!', 'Tap buat dapetin', 'Pake kode SAVE20', 'Ambil sebelum keabisan'],
    localExpressions: ['gokil sih', 'worth it banget', 'mantap jiwa', 'the best', 'kepengen lagi'],
    voiceStyles: ['santai', 'ramah', 'semangat', 'jujur'],
  },
};

// ── Script Generator ────────────────────────────────────────────────────

function generateLocalizedScript(productName: string, category: string, price: string, country: string) {
  const c = COUNTRIES[country] || COUNTRIES.US;
  const hp = pick(c.hookPhrases);
  const cta = pick(c.ctaPhrases);
  const exp1 = pick(c.localExpressions);
  const exp2 = pick(c.localExpressions);
  const voice = pick(c.voiceStyles);

  const convertedPrice = convertPrice(price, c.currency, c.symbol);

  // Generate 3 scripts (UGC, Review, POV)
  const scripts = [
    {
      type: 'ugc',
      voiceover: [
        `${hp}! ${productName} is ${exp1}.`,
        `I've been using it for weeks now. ${voice} review — it actually delivers.`,
        `${productName} solved my daily problem. ${exp2}!`,
        `Get yours now. ${cta}`,
      ].join(' '),
    },
    {
      type: 'review',
      voiceover: [
        `Full honest review of ${productName}. Price: ${convertedPrice}.`,
        `Pros: amazing build quality, saves time. Cons: honestly, none.`,
        `This ${category} is ${exp1}. Highly recommend for the price.`,
        `${cta}`,
      ].join(' '),
    },
    {
      type: 'pov',
      voiceover: [
        `POV: You finally found a ${category} that's ${exp1}.`,
        `Morning routine just got upgraded. ${productName} makes everything easier.`,
        `Your friends will ask what changed. ${voice} — tell them!`,
        `${cta}`,
      ].join(' '),
    },
  ];

  return {
    country,
    language: c.language,
    currency: c.currency,
    price: convertedPrice,
    hook: hp,
    cta,
    expressions: [exp1, exp2],
    voiceStyle: voice,
    scripts,
  };
}

function convertPrice(price: string, currency: string, symbol: string): string {
  const num = parseFloat(price.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return symbol + 'XX';
  const rates: Record<string, number> = { USD: 1, GBP: 0.79, MYR: 4.7, THB: 36, PHP: 56, VND: 25000, IDR: 16000 };
  const rate = rates[currency] || 1;
  const converted = Math.round(num * rate * 100) / 100;
  if (currency === 'VND') return Math.round(converted / 1000) * 1000 + ' ' + symbol;
  if (currency === 'IDR') return symbol + ' ' + Math.round(converted / 1000) * 1000;
  return symbol + converted.toFixed(2);
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ── API ─────────────────────────────────────────────────────────────────

localizationRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.localization.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (e) { next(e); }
});

localizationRoutes.get('/countries', (_req: Request, res: Response) => {
  const list = Object.entries(COUNTRIES).map(([code, cfg]) => ({ code, language: cfg.language, currency: cfg.currency + ' ' + cfg.symbol }));
  res.json(list);
});

localizationRoutes.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, countries } = req.body;
    if (!productId) throw new AppError(400, 'productId required');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError(404, 'Product not found');

    const targets = countries?.length ? countries : Object.keys(COUNTRIES);
    const results = [];

    for (const country of targets) {
      if (!COUNTRIES[country]) continue;
      const localized = generateLocalizedScript(product.product_name, product.category, product.price, country);

      const record = await prisma.localization.create({
        data: {
          id: uuid(), productId, country,
          language: localized.language, currency: localized.currency, price: localized.price,
          hook: localized.hook, cta: localized.cta, scripts: JSON.stringify(localized.scripts),
          expressions: localized.expressions.join(', '),
        },
      });
      results.push(record);
    }

    res.status(201).json({ count: results.length, items: results });
  } catch (e) { next(e); }
});

localizationRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await prisma.localization.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { next(e); }
});
