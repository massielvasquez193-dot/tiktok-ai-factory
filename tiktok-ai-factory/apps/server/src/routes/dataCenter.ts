import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { v4 } from 'uuid';

export const dataCenterRoutes = Router();

function calcScore(v: any) { return Math.round((v.views * 0.4 + v.likes * 0.2 + v.comments * 0.15 + v.shares * 0.15 + (v.orders || 0) * 0.1) / 1000 * 10) / 10; }

// ── Overview ────────────────────────────────────────────────────────────

dataCenterRoutes.get('/overview', async (_req: Request, res: Response) => {
  try {
    const perf = await prisma.videoPerformance.findMany();
    const totalVideos = perf.length;
    const totalViews = perf.reduce((s, p) => s + p.views, 0);
    const totalLikes = perf.reduce((s, p) => s + p.likes, 0);
    const totalComments = perf.reduce((s, p) => s + p.comments, 0);
    const totalShares = perf.reduce((s, p) => s + p.shares, 0);
    const totalRevenue = perf.reduce((s, p) => s + p.revenue, 0);
    const totalSpend = perf.reduce((s, p) => s + p.spend, 0);
    const avgCtr = perf.length > 0 ? Math.round(perf.reduce((s, p) => s + p.ctr, 0) / perf.length * 100) / 100 : 0;
    const avgCvr = perf.length > 0 ? Math.round(perf.reduce((s, p) => s + p.cvr, 0) / perf.length * 100) / 100 : 0;
    const avgRoas = totalSpend > 0 ? Math.round(totalRevenue / totalSpend * 100) / 100 : 0;
    const viralCount = perf.filter(p => p.views > 100000).length;
    const viralRate = totalVideos > 0 ? Math.round(viralCount / totalVideos * 100) : 0;
    const byCountry: Record<string, number> = {}; for (const p of perf) { const c = p.country || 'UNKNOWN'; byCountry[c] = (byCountry[c] || 0) + 1; }

    // By date trend
    const trend: Record<string, { views: number; revenue: number }> = {};
    for (const p of perf) {
      const date = new Date(p.createdAt).toLocaleDateString('zh-CN');
      if (!trend[date]) trend[date] = { views: 0, revenue: 0 };
      trend[date].views += p.views; trend[date].revenue += p.revenue;
    }
    const trends = Object.entries(trend).sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({ date, ...data }));
    const recentViews = trends.slice(-7);
    const recentRevenue = trends.slice(-7);

    res.json({
      totalVideos, totalViews, totalLikes, totalComments, totalShares, totalRevenue, totalSpend, avgCtr, avgCvr, avgRoas, viralRate,
      byCountry: Object.entries(byCountry).map(([name, value]) => ({ name, value })),
      viewTrend: recentViews, revenueTrend: recentRevenue,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Videos (paginated) ──────────────────────────────────────────────────

dataCenterRoutes.get('/videos', async (req: Request, res: Response) => {
  try {
    const { page, limit, country, sort, search } = req.query;
    const where: any = {};
    if (country) where.country = country as string;
    const take = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const orderBy: any = sort === 'views' ? { views: 'desc' } : sort === 'score' ? { score: 'desc' } : sort === 'revenue' ? { revenue: 'desc' } : { createdAt: 'desc' };

    const [videos, total] = await Promise.all([
      prisma.videoPerformance.findMany({ where, orderBy, take, skip }),
      prisma.videoPerformance.count({ where }),
    ]);

    // Auto-calculate scores
    const items = videos.map(v => ({ ...v, score: calcScore(v) }));

    res.json({ items, total, page: Number(page) || 1, pageSize: take });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Single video ────────────────────────────────────────────────────────

dataCenterRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const v = await prisma.videoPerformance.findUnique({ where: { id: req.params.id } });
    if (!v) return res.status(404).json({ error: 'Not found' });
    res.json({ ...v, score: calcScore(v) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Sync / Seed Mock Data ───────────────────────────────────────────────

dataCenterRoutes.post('/sync', async (_req: Request, res: Response) => {
  try {
    const videos = await prisma.video.findMany({ take: 30 });
    let count = 0;
    const countries = ['US','MY','TH','PH','VN','ID'];
    for (const v of videos) {
      const exists = await prisma.videoPerformance.findFirst({ where: { videoId: v.id } });
      if (exists) continue;
      const views = Math.floor(Math.random() * 500000) + 1000;
      const likes = Math.floor(views * (0.02 + Math.random() * 0.08));
      const comments = Math.floor(likes * (0.05 + Math.random() * 0.15));
      const shares = Math.floor(views * (0.005 + Math.random() * 0.03));
      const orders = Math.floor(views * (0.001 + Math.random() * 0.005));
      const revenue = orders * (9.9 + Math.random() * 40);
      const spend = Math.floor(views * 0.001 * (0.5 + Math.random() * 1.5));
      await prisma.videoPerformance.create({
        data: {
          videoId: v.id, platform: 'tiktok',
          country: countries[Math.floor(Math.random() * countries.length)],
          language: 'en', views, likes, comments, shares,
          saves: Math.floor(views * 0.01), followers: Math.floor(views * 0.002),
          clicks: Math.floor(views * 0.05), orders, revenue, spend,
          ctr: Math.round(Math.random() * 500) / 100,
          cvr: Math.round(Math.random() * 1000) / 100,
          roas: revenue / Math.max(spend, 1),
          score: 0,
        },
      });
      count++;
    }
    res.json({ synced: count });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── AI Insights ─────────────────────────────────────────────────────────

dataCenterRoutes.get('/ai/insights', async (_req: Request, res: Response) => {
  try {
    const perf = await prisma.videoPerformance.findMany({ orderBy: { views: 'desc' }, take: 20 });
    const byCountry: Record<string, number[]> = {};
    for (const p of perf) {
      const c = p.country || 'UNKNOWN';
      if (!byCountry[c]) byCountry[c] = [];
      byCountry[c].push(p.views);
    }
    const bestCountry = Object.entries(byCountry).sort((a, b) => {
      const avgA = a[1].reduce((s, v) => s + v, 0) / a[1].length;
      const avgB = b[1].reduce((s, v) => s + v, 0) / b[1].length;
      return avgB - avgA;
    })[0]?.[0] || 'N/A';

    // Score grading
    const grades = perf.map(p => ({
      id: p.id, videoId: p.videoId,
      score: calcScore(p),
      grade: calcScore(p) >= 90 ? 'A+' : calcScore(p) >= 70 ? 'A' : calcScore(p) >= 50 ? 'B' : calcScore(p) >= 30 ? 'C' : 'D',
    })).sort((a, b) => b.score - a.score);

    res.json({
      bestCountry,
      topVideos: grades.slice(0, 5),
      recommendations: [
        'Focus on ' + bestCountry + ' market for highest engagement',
        'Best performing videos have strong hooks in first 3 seconds',
        'Videos with clear CTA show 2x higher conversion',
        'Post between 7-9 PM local time for optimal reach',
        'UGC-style content outperforms polished studio content',
      ],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Auto Learning ──────────────────────────────────────────────────────

dataCenterRoutes.post('/learn', async (_req: Request, res: Response) => {
  try {
    const topVideos = await prisma.videoPerformance.findMany({ orderBy: { views: 'desc' }, take: 10 });
    const insights: any[] = [];

    for (const v of topVideos) {
      const product = await prisma.product.findFirst({ where: { id: (await prisma.video.findUnique({ where: { id: v.videoId } }))?.productId } });
      const insight = await prisma.learningInsight.create({
        data: {
          type: 'viral_pattern',
          content: JSON.stringify({
            videoId: v.videoId,
            views: v.views,
            country: v.country,
            ctr: v.ctr,
            hook: 'High engagement video — replicate hook pattern',
            cta: 'Clear CTA drives conversion',
          }),
          score: calcScore(v),
          sourceVideoId: v.videoId,
          country: v.country || '',
        },
      });
      insights.push(insight);
    }

    res.json({ learned: insights.length, insights });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

dataCenterRoutes.get('/learning', async (_req: Request, res: Response) => {
  try { res.json(await prisma.learningInsight.findMany({ orderBy: { score: 'desc' }, take: 50 })); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Delete ──────────────────────────────────────────────────────────────

dataCenterRoutes.delete('/:id', async (req: Request, res: Response) => {
  try { await prisma.videoPerformance.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
