import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

interface ExtractedPattern {
  hook: string; cta: string; structure: string; prompt: string;
  country: string; category: string; score: number; videoId: string;
}

export async function analyzeTopPerformers(): Promise<{ analyzed: number; patterns: ExtractedPattern[] }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get top 100 by views
  const topViews = await prisma.videoPerformance.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    orderBy: { views: 'desc' },
    take: 100,
  });

  // Get top 100 by conversion (orders)
  const topConvert = await prisma.videoPerformance.findMany({
    where: { createdAt: { gte: sevenDaysAgo }, orders: { gt: 0 } },
    orderBy: { orders: 'desc' },
    take: 100,
  });

  // Merge + deduplicate
  const seen = new Set<string>();
  const allTop = [...topViews, ...topConvert].filter(v => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId); return true;
  });

  const patterns: ExtractedPattern[] = [];

  for (const v of allTop) {
    const score = calcScore(v);

    // Get product info
    const video = await prisma.video.findUnique({ where: { id: v.videoId } });
    const product = video ? await prisma.product.findUnique({ where: { id: video.productId } }) : null;

    // Extract pattern from research or generate
    const hook = await extractBestHook(product?.category || 'General', v.country || 'US');
    const cta = await extractBestCTA(v.country || 'US');
    const structure = getTopStructure(score);
    const prompt = generateWinningPrompt(product?.product_name || 'Product', product?.category || 'General', v.country || 'US');

    // Save to Knowledge Base
    await Promise.all([
      prisma.knowledgeHook.create({
        data: { id: uuid(), hook, language: 'en', country: v.country || 'US', category: product?.category || 'General', source: 'auto-learn', views: v.views, likes: v.likes, viralScore: Math.round(score), tags: 'auto,viral' },
      }),
      prisma.knowledgeCta.create({
        data: { id: uuid(), cta, country: v.country || 'US', language: 'en', source: 'auto-learn', viralScore: Math.round(score) },
      }),
      prisma.knowledgeStructure.create({
        data: { id: uuid(), structureName: structure, sceneCount: 5, category: product?.category || 'General', country: v.country || 'US', viralScore: Math.round(score), scenes: JSON.stringify(['hook','problem','solution','proof','cta']) },
      }),
      prisma.knowledgePrompt.create({
        data: { id: uuid(), provider: 'seedance', prompt, category: product?.category || 'General', country: v.country || 'US', viralScore: Math.round(score) },
      }),
    ]);

    // Save learning insight
    await prisma.learningInsight.create({
      data: {
        type: 'auto_extracted',
        content: JSON.stringify({ hook, cta, structure, prompt, views: v.views, score: Math.round(score) }),
        score: Math.round(score),
        sourceVideoId: v.videoId,
        country: v.country || 'US',
      },
    });

    patterns.push({ hook, cta, structure, prompt, country: v.country || 'US', category: product?.category || 'General', score: Math.round(score), videoId: v.videoId });
  }

  return { analyzed: allTop.length, patterns };
}

function calcScore(v: any): number {
  return Math.round((v.views * 0.4 + v.likes * 0.2 + v.comments * 0.15 + v.shares * 0.15 + (v.orders || 0) * 0.1) / 1000 * 10) / 10 * 100 / 100;
}

async function extractBestHook(category: string, country: string): Promise<string> {
  const existing = await prisma.knowledgeHook.findFirst({
    where: { category, country },
    orderBy: { viralScore: 'desc' },
  });
  if (existing) {
    const variations = [
      existing.hook,
      'You NEED this in your life — here is why',
      'I tested this ' + category + ' for 7 days straight',
      'Stop scrolling — this ' + category + ' changed everything',
      'The ' + category + ' that is breaking TikTok right now',
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }
  return 'Discover why everyone is talking about this ' + category;
}

async function extractBestCTA(country: string): Promise<string> {
  const ctas: Record<string, string[]> = {
    US: ['Link in bio!', 'Shop now — limited stock!', 'Tap to grab yours', 'Use code VIRAL20'],
    MY: ['Link di bio!', 'Beli sekarang!', 'Stok terhad — cepat!', 'Kod VIRAL20'],
    TH: ['ลิงก์ในไบโอ!', 'ซื้อเลย!', 'ของมีจำกัด!', 'โค้ด VIRAL20'],
    PH: ['Link sa bio!', 'Bili na!', 'Limited stock!', 'Code VIRAL20'],
    VN: ['Link trong bio!', 'Mua ngay!', 'Số lượng có hạn!', 'Mã VIRAL20'],
    ID: ['Link di bio!', 'Beli sekarang!', 'Stok terbatas!', 'Kode VIRAL20'],
  };
  const pool = ctas[country] || ctas.US;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getTopStructure(score: number): string {
  if (score >= 80) return 'Hook→POV→Demo→Proof→Urgency CTA';
  if (score >= 60) return 'Hook→Problem→Solution→Social Proof→CTA';
  return 'Hook→Reveal→Demo→Result→CTA';
}

function generateWinningPrompt(productName: string, category: string, country: string): string {
  return [
    'Vertical 9:16 video. ' + category + ' product demo featuring ' + productName + '.',
    'Camera: POV handheld, natural window lighting, shallow DOF.',
    'Style: UGC authentic feel, TikTok native aesthetic.',
    'Target: ' + country + ' market. 4K resolution, 30fps.',
    'No watermarks. No logos. Clean composition.',
  ].join(' ');
}

// ── Cron job ────────────────────────────────────────────────────────────

export function startAutoLearning(intervalMinutes: number = 360) {
  console.log('[AutoLearning] Started — analyzing every ' + intervalMinutes + ' minutes');
  setInterval(async () => {
    try {
      const result = await analyzeTopPerformers();
      console.log('[AutoLearning] Analyzed ' + result.analyzed + ' top performers, extracted ' + result.patterns.length + ' patterns');
    } catch (err: any) {
      console.error('[AutoLearning] Error:', err.message);
    }
  }, intervalMinutes * 60000);
}
