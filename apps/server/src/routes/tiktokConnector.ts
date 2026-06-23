import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { syncTikTokData } from '../services/tiktokConnector';

export const tiktokConnectorRoutes = Router();

tiktokConnectorRoutes.get('/metrics', async (_req: Request, res: Response) => {
  try { res.json(await prisma.tikTokMetrics.findMany({ orderBy: { date: 'desc' }, take: 30 })); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

tiktokConnectorRoutes.get('/overview', async (_req: Request, res: Response) => {
  try {
    const metrics = await prisma.tikTokMetrics.findMany({ orderBy: { date: 'desc' } });
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
    const totalOrders = metrics.reduce((s, m) => s + m.orders, 0);
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
    const byCountry: Record<string, any> = {};
    for (const m of metrics) {
      if (!byCountry[m.country]) byCountry[m.country] = { revenue: 0, orders: 0, spend: 0, count: 0 };
      byCountry[m.country].revenue += m.revenue; byCountry[m.country].orders += m.orders; byCountry[m.country].spend += m.spend; byCountry[m.country].count++;
    }
    res.json({ totalRevenue, totalOrders, totalSpend, roi: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) + 'x' : '0x', byCountry: Object.entries(byCountry).map(([name, data]) => ({ name, ...data })) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

tiktokConnectorRoutes.post('/sync', async (_req: Request, res: Response) => {
  try { const r = await syncTikTokData(); res.json({ synced: r.synced, videosSynced: r.videosSynced }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
