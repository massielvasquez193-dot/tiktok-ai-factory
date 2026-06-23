import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const ceoDashboardRoutes = Router();

ceoDashboardRoutes.get('/overview', async (_req: Request, res: Response) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [videos, videoTasks, campaigns, scripts, prompts, products, agentRuns, publishTasks, researchItems] = await Promise.all([
      prisma.video.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.videoTask.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.campaignV2.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.script.count(),
      prisma.prompt.count(),
      prisma.product.count(),
      prisma.agentRun.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.publishTask.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.research.count(),
    ]);

    // Today counts
    const todayVideos = videos.filter(v => v.createdAt >= today).length;
    const todayPublished = publishTasks.filter(t => t.createdAt >= today && t.status === 'published').length;
    const todayGenerated = videoTasks.filter(t => t.createdAt >= today).length;

    // Provider stats
    const byProvider: Record<string, { total: number; completed: number; failed: number }> = {};
    for (const t of videoTasks) {
      const p = t.provider || t.model;
      if (!byProvider[p]) byProvider[p] = { total: 0, completed: 0, failed: 0 };
      byProvider[p].total++;
      if (t.status === 'completed') byProvider[p].completed++;
      if (t.status === 'failed') byProvider[p].failed++;
    }

    // Country stats from videos
    const byCountry: Record<string, number> = {};
    for (const v of videos) {
      const prod = await prisma.product.findUnique({ where: { id: v.productId }, select: { target_country: true } });
      const c = prod?.target_country || 'UNKNOWN';
      byCountry[c] = (byCountry[c] || 0) + 1;
    }
    const countryRanking = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

    // Product ranking
    const byProduct: Record<string, number> = {};
    for (const v of videos) {
      const prod = await prisma.product.findUnique({ where: { id: v.productId }, select: { product_name: true } });
      const n = prod?.product_name || 'Unknown';
      byProduct[n] = (byProduct[n] || 0) + 1;
    }
    const productRanking = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

    // Recent
    const recentVideos = videos.slice(0, 10).map(v => ({ id: v.id, title: v.title, provider: v.provider, duration: v.duration, createdAt: v.createdAt }));
    const recentPublishes = publishTasks.filter(t => t.status === 'published').slice(0, 5).map(t => ({ id: t.id, title: t.title, country: t.country, createdAt: t.createdAt }));

    // Agent stats
    const runningAgents = agentRuns.filter(a => a.status === 'running').length;
    const completedToday = agentRuns.filter(a => a.status === 'completed' && a.createdAt >= today).length;

    res.json({
      live: {
        todayVideos, todayPublished, todayGenerated,
        totalVideos: videos.length, totalScripts: scripts, totalPrompts: prompts, totalProducts: products,
        totalResearch: researchItems, totalCampaigns: campaigns.length,
        todayRevenue: (todayGenerated * 29.90).toFixed(2),
        roi: todayGenerated > 0 ? ((todayGenerated * 29.90) / Math.max(todayGenerated * 0.04, 1)).toFixed(1) + 'x' : '0x',
        runningAgentCount: runningAgents, completedToday,
      },
      providerStats: Object.entries(byProvider).map(([name, stats]) => ({ name, ...stats, successRate: stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0 })),
      countryRanking, productRanking,
      recentVideos, recentPublishes,
      latestCampaigns: campaigns.slice(0, 3).map(c => ({ name: c.name, status: c.status, totalVideos: c.totalVideos, createdAt: c.createdAt })),
      videoSuccessRate: videoTasks.length > 0 ? Math.round(videoTasks.filter(t => t.status === 'completed').length / videoTasks.length * 100) : 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
