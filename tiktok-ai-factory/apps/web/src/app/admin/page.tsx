'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Building2, UserPlus, CreditCard, DollarSign, Coins, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, AreaChart, Area,
} from 'recharts';
import { cn } from '@/lib/utils';

interface Stats {
  totals: { users: number; tenants: number; products: number; videos: number; campaigns: number };
  today: { newUsers: number; payments: number; revenue: number; creditsConsumed: number };
  month: { revenue: number; creditsConsumed: number };
  subscriptions: { active: number; paying: number; distribution: { plan: string; count: number }[] };
  credits: { totalBalance: number; totalLifetime: number };
  charts: {
    dailyRegistrations: { date: string; count: number }[];
    dailyPayments: { date: string; amount: number }[];
    dailyCredits: { date: string; consumed: number }[];
    monthlyRegistrations: { date: string; count: number }[];
    monthlyPayments: { date: string; amount: number }[];
    monthlyCredits: { date: string; consumed: number }[];
  };
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('tiktok-vf-auth') || '{}').accessToken : null;

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/stats`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Failed to load stats');
      setStats(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPageLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || !['admin', 'superadmin'].includes(user.role))) {
      router.push('/login');
      return;
    }
    if (user) fetchStats();
  }, [user, loading, router, fetchStats]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchStats, 60_000);
    return () => clearInterval(interval);
  }, [user, fetchStats]);

  if (loading || !user) return <div className="p-8 text-gray-400">Loading...</div>;

  const CHART_COLORS = {
    primary: '#6366f1',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    muted: '#94a3b8',
    grid: '#f1f5f9',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">Real-time platform overview</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button onClick={fetchStats} className="text-xs text-brand-600 hover:underline">Refresh</button>
          <span className="text-xs text-gray-400">Auto-refresh 60s</span>
        </div>
      </div>

      {pageLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-5 h-24" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* ─── KPI Cards Row 1 ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard
              label="Total Users" value={fmtNum(stats.totals.users)}
              icon={Users} color="indigo" href="/admin/users"
            />
            <KpiCard
              label="Total Tenants" value={fmtNum(stats.totals.tenants)}
              icon={Building2} color="sky" href="/admin/tenants"
            />
            <KpiCard
              label="Today Signups" value={fmtNum(stats.today.newUsers)}
              icon={UserPlus} color="emerald"
              trend={stats.today.newUsers > 0 ? 'up' : undefined}
            />
            <KpiCard
              label="Today Revenue" value={`$${fmtNum(stats.today.revenue)}`}
              icon={DollarSign} color="amber"
              trend={stats.today.revenue > 0 ? 'up' : undefined}
            />
            <KpiCard
              label="Month Revenue" value={`$${fmtNum(stats.month.revenue)}`}
              icon={TrendingUp} color="green"
            />
            <KpiCard
              label="Credits Consumed" value={fmtNum(stats.month.creditsConsumed)}
              icon={Coins} color="purple"
              trend={stats.month.creditsConsumed > 0 ? 'up' : 'down'}
            />
          </div>

          {/* ─── KPI Cards Row 2 ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniStat
              label="Active Subscriptions"
              value={`${stats.subscriptions.active} (${stats.subscriptions.paying} paid)`}
              href="/admin/payments"
            />
            <MiniStat
              label="Total Credit Balance"
              value={`${fmtNum(stats.credits.totalBalance)} credits`}
              href="/admin/credits"
            />
            <MiniStat
              label="Total Videos"
              value={fmtNum(stats.totals.videos)}
              href="/videos"
            />
            <MiniStat
              label="Active Campaigns"
              value={fmtNum(stats.totals.campaigns)}
              href="/campaigns-v2"
            />
          </div>

          {/* ─── Chart: 7-Day Registrations ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Registrations (Last 7 Days)" subtitle="New user signups per day">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.charts.dailyRegistrations}>
                  <defs>
                    <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={shortDate} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Area
                    type="monotone" dataKey="count" stroke={CHART_COLORS.primary}
                    fill="url(#regGradient)" strokeWidth={2} name="Registrations"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ─── Chart: 7-Day Revenue ───────────────────────────────── */}
            <ChartCard title="Revenue (Last 7 Days)" subtitle="Payment amount per day (USD)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.charts.dailyPayments}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={shortDate} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ─── Chart: 7-Day Credits ────────────────────────────────── */}
            <ChartCard title="Credits Consumed (Last 7 Days)" subtitle="AI credits used per day">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.charts.dailyCredits}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={shortDate} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any) => [Number(value || 0).toLocaleString(), 'Credits']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="consumed" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} name="Credits Used" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ─── Chart: Plan Distribution ────────────────────────────── */}
            <ChartCard title="Subscription Plans" subtitle="Distribution by plan">
              {stats.subscriptions.distribution.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No subscription data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.subscriptions.distribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="plan" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Subscribers" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* ─── Chart: 30-Day Trend ───────────────────────────────────── */}
          <ChartCard title="30-Day Performance Overview" subtitle="Registrations, Revenue & Credits trend">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.charts.monthlyRegistrations.map((r, i) => ({
                date: r.date,
                registrations: r.count,
                revenue: stats.charts.monthlyPayments[i]?.amount || 0,
                credits: stats.charts.monthlyCredits[i]?.consumed || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="date" tick={{ fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                  interval={2}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  yAxisId="left" type="monotone" dataKey="registrations"
                  stroke={CHART_COLORS.primary} strokeWidth={2} dot={false}
                  name="New Users"
                />
                <Line
                  yAxisId="right" type="monotone" dataKey="revenue"
                  stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false}
                  name="Revenue ($)"
                />
                <Line
                  yAxisId="left" type="monotone" dataKey="credits"
                  stroke={CHART_COLORS.accent} strokeWidth={2} dot={false}
                  name="Credits Used"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ─── Quick Links ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickLink href="/admin/users" icon={Users} label="User Management" desc="View & manage users" />
            <QuickLink href="/admin/tenants" icon={Building2} label="Tenant Management" desc="Manage workspaces" />
            <QuickLink href="/admin/credits" icon={Coins} label="Credit Management" desc="Adjust balances" />
            <QuickLink href="/admin/payments" icon={DollarSign} label="Payment Management" desc="View revenue" />
          </div>
        </>
      ) : (
        <div className="bg-red-50 text-red-600 rounded-xl p-6">
          Failed to load dashboard data: {error || 'Unknown error'}
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, href, trend }: {
  label: string; value: string; icon: any; color: string; href?: string; trend?: 'up' | 'down';
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600', sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600',
  };

  const content = (
    <div className="bg-white border rounded-xl p-4 hover:shadow-md transition cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className={cn('p-1.5 rounded-lg', colorMap[color] || colorMap.indigo)}>
          <Icon size={14} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold">{value}</span>
        {trend && (
          trend === 'up'
            ? <ArrowUpRight size={14} className="text-green-500 mb-0.5" />
            : <ArrowDownRight size={14} className="text-red-500 mb-0.5" />
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function MiniStat({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="bg-white border rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-gray-400 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, desc }: {
  href: string; icon: any; label: string; desc: string;
}) {
  return (
    <Link href={href} className="bg-white border rounded-xl p-4 hover:shadow-md transition flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gray-50">
        <Icon size={16} className="text-gray-500" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
    </Link>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function fmtNum(n: number | undefined | null): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function shortDate(d: string): string {
  return d.slice(5); // "MM-DD"
}
