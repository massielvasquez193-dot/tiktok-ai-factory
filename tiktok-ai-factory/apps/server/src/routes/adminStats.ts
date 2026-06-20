import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../auth/auth.middleware';

export const adminStatsRoutes = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
}

/** GET /api/admin/stats — comprehensive dashboard stats */
adminStatsRoutes.get('/stats', requireAuth, requireRole('admin', 'superadmin'), asyncHandler(async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last7Days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    last7Days.push(d);
  }
  const last30Days: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    last30Days.push(d);
  }

  // Run all queries in parallel
  const [
    totalUsers,           totalTenants,        totalProducts,
    totalVideos,          totalCampaigns,
    todayUsers,           todayPaymentsCount,   todayPaymentsSum,
    todayCreditsConsumed,
    monthRevenue,         monthCreditsConsumed,
    activeSubscriptions,  payingSubscriptions,
    totalCreditBalance,   totalLifetimeCredits,
    planDistribution,
    // 7-day time series
    dailyReg7,            dailyPayments7,       dailyCredits7,
    // 30-day time series
    dailyReg30,           dailyPayments30,      dailyCredits30,
  ] = await Promise.all([
    // ─── Totals ───────────────────────────────────────
    prisma.user.count(),
    prisma.tenant.count(),
    prisma.product.count(),
    prisma.video.count(),
    prisma.campaignV2.count(),

    // ─── Today ────────────────────────────────────────
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.payment.count({ where: { createdAt: { gte: todayStart }, status: 'succeeded' } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: todayStart }, status: 'succeeded' } }),
    prisma.creditLedger.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: todayStart }, type: 'usage', amount: { lt: 0 } },
    }),

    // ─── This month ───────────────────────────────────
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: monthStart }, status: 'succeeded' } }),
    prisma.creditLedger.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: monthStart }, type: 'usage', amount: { lt: 0 } },
    }),

    // ─── Subscriptions ────────────────────────────────
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.subscription.count({ where: { status: 'active', plan: { not: 'free' } } }),

    // ─── Credits ──────────────────────────────────────
    prisma.creditWallet.aggregate({ _sum: { balance: true } }),
    prisma.creditWallet.aggregate({ _sum: { lifetime: true } }),

    // ─── Plan distribution ────────────────────────────
    prisma.subscription.groupBy({
      by: ['plan'],
      _count: { id: true },
    }),

    // ─── 7-day time series (registration) ─────────────
    Promise.all(last7Days.map(async (d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = await prisma.user.count({
        where: { createdAt: { gte: d, lt: next } },
      });
      return { date: d.toISOString().slice(0, 10), count };
    })),

    // ─── 7-day time series (payments) ─────────────────
    Promise.all(last7Days.map(async (d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const agg = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: d, lt: next }, status: 'succeeded' },
      });
      return { date: d.toISOString().slice(0, 10), amount: agg._sum.amount || 0 };
    })),

    // ─── 7-day time series (credits consumed) ─────────
    Promise.all(last7Days.map(async (d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const agg = await prisma.creditLedger.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: d, lt: next }, type: 'usage', amount: { lt: 0 } },
      });
      return { date: d.toISOString().slice(0, 10), consumed: Math.abs(agg._sum.amount || 0) };
    })),

    // ─── 30-day time series ───────────────────────────
    Promise.all(last30Days.map(async (d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      return prisma.user.count({ where: { createdAt: { gte: d, lt: next } } });
    })).then(counts =>
      last30Days.map((d, i) => ({ date: d.toISOString().slice(0, 10), count: counts[i] })),
    ),

    Promise.all(last30Days.map(async (d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const agg = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: d, lt: next }, status: 'succeeded' },
      });
      return { date: d.toISOString().slice(0, 10), amount: agg._sum.amount || 0 };
    })),

    Promise.all(last30Days.map(async (d) => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const agg = await prisma.creditLedger.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: d, lt: next }, type: 'usage', amount: { lt: 0 } },
      });
      return { date: d.toISOString().slice(0, 10), consumed: Math.abs(agg._sum.amount || 0) };
    })),
  ]);

  res.json({
    // ─── KPI Cards ────────────────────────────────────
    totals: {
      users: totalUsers,
      tenants: totalTenants,
      products: totalProducts,
      videos: totalVideos,
      campaigns: totalCampaigns,
    },
    today: {
      newUsers: todayUsers,
      payments: todayPaymentsCount,
      revenue: todayPaymentsSum._sum.amount || 0,
      creditsConsumed: Math.abs(todayCreditsConsumed._sum.amount || 0),
    },
    month: {
      revenue: monthRevenue._sum.amount || 0,
      creditsConsumed: Math.abs(monthCreditsConsumed._sum.amount || 0),
    },
    subscriptions: {
      active: activeSubscriptions,
      paying: payingSubscriptions,
      distribution: planDistribution.map(g => ({ plan: g.plan, count: g._count.id })),
    },
    credits: {
      totalBalance: totalCreditBalance._sum.balance || 0,
      totalLifetime: totalLifetimeCredits._sum.lifetime || 0,
    },

    // ─── Charts Data ──────────────────────────────────
    charts: {
      dailyRegistrations: dailyReg7,
      dailyPayments: dailyPayments7,
      dailyCredits: dailyCredits7,
      monthlyRegistrations: dailyReg30,
      monthlyPayments: dailyPayments30,
      monthlyCredits: dailyCredits30,
    },
  });
}));
