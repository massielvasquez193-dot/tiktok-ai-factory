import { prisma } from '../index';
import { v4 as uuid } from 'uuid';

const COUNTRIES = ['US','UK','MY','TH','PH','VN','ID'];

export async function syncTikTokData() {
  const results: any[] = [];
  for (const country of COUNTRIES) {
    try {
      const metrics = generateMockMetrics(country);
      const record = await prisma.tikTokMetrics.create({ data: { id: uuid(), country, ...metrics } });
      results.push(record);

      const rawData = { ...metrics, syncedAt: new Date().toISOString(), country, products: mockProducts(country), topVideos: mockVideos(country) };
      await prisma.tikTokData.create({ data: { id: uuid(), platform: 'tiktok_shop', dataType: 'metrics', country, rawData: JSON.stringify(rawData) } });
    } catch (e: any) { console.error('Sync error:', e.message); }
  }

  // Also sync Video Performance data
  const videos = await prisma.video.findMany({ take: 50 });
  for (const v of videos) {
    const exists = await prisma.videoPerformance.findFirst({ where: { videoId: v.id } });
    if (exists) continue;
    const views = Math.floor(Math.random() * 500000) + 1000;
    const likes = Math.floor(views * (0.02 + Math.random() * 0.08));
    const orders = Math.floor(views * (0.001 + Math.random() * 0.005));
    const revenue = orders * (9.9 + Math.random() * 40);
    const spend = Math.floor(views * 0.001 * (0.5 + Math.random() * 1.5));
    await prisma.videoPerformance.create({
      data: {
        id: uuid(), videoId: v.id, platform: 'tiktok', country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
        language: 'en', views, likes, comments: Math.floor(likes * 0.1), shares: Math.floor(views * 0.01),
        saves: Math.floor(views * 0.01), followers: Math.floor(views * 0.002), clicks: Math.floor(views * 0.05),
        orders, revenue, spend, ctr: Math.round(Math.random() * 500) / 100, cvr: Math.round(Math.random() * 1000) / 100,
        roas: Math.round(revenue / Math.max(spend, 1) * 100) / 100, score: 0,
      },
    });
  }

  return { synced: results.length, videosSynced: videos.length };
}

function generateMockMetrics(country: string) {
  const base = country === 'US' ? 10000 : country === 'MY' ? 3000 : country === 'TH' ? 2500 : country === 'PH' ? 2000 : country === 'VN' ? 1500 : 1000;
  const orders = Math.floor(base * (0.8 + Math.random() * 0.4));
  const revenue = Math.round(orders * (15 + Math.random() * 35) * 100) / 100;
  const spend = Math.round(revenue * (0.2 + Math.random() * 0.3) * 100) / 100;
  const impressions = Math.floor(orders * (50 + Math.random() * 100));
  const clicks = Math.floor(impressions * (0.02 + Math.random() * 0.05));
  return {
    date: new Date(), orders, revenue, spend, clicks, impressions,
    ctr: Math.round(clicks / Math.max(impressions, 1) * 10000) / 100,
    cvr: Math.round(orders / Math.max(clicks, 1) * 10000) / 100,
    gmv: revenue, videos: Math.floor(orders / 5),
  };
}

function mockProducts(country: string) {
  return [
    { name: 'Product A', orders: Math.floor(Math.random() * 500), revenue: Math.floor(Math.random() * 5000) },
    { name: 'Product B', orders: Math.floor(Math.random() * 300), revenue: Math.floor(Math.random() * 3000) },
    { name: 'Product C', orders: Math.floor(Math.random() * 200), revenue: Math.floor(Math.random() * 2000) },
  ];
}

function mockVideos(country: string) {
  return [
    { id: uuid(), views: Math.floor(Math.random() * 100000), likes: Math.floor(Math.random() * 5000), ctr: Math.round(Math.random() * 5 * 100) / 100 },
    { id: uuid(), views: Math.floor(Math.random() * 50000), likes: Math.floor(Math.random() * 2000), ctr: Math.round(Math.random() * 4 * 100) / 100 },
  ];
}

// Auto-sync cron
let interval: NodeJS.Timeout | null = null;
export function startTikTokSync(intervalMinutes: number = 1440) {
  console.log('[TikTokSync] Auto-sync started every ' + intervalMinutes + ' minutes');
  interval = setInterval(async () => {
    try {
      const result = await syncTikTokData();
      console.log('[TikTokSync] Synced ' + result.synced + ' countries, ' + result.videosSynced + ' videos');
    } catch (e: any) { console.error('[TikTokSync] Error:', e.message); }
  }, intervalMinutes * 60000);
}
export function stopTikTokSync() { if (interval) clearInterval(interval); }
