'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Package, Video, FileText, TrendingUp, Plus, Play } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    products: 0, campaigns: 0, scripts: 0, videos: 0,
  });
  const [products, setProducts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, c] = await Promise.all([
          api.getProducts().catch(() => []),
          api.getCampaigns().catch(() => []),
        ]);
        setProducts(p);
        setCampaigns(c);
        setStats({
          products: p.length,
          campaigns: c.length,
          scripts: c.reduce((acc: number, c: any) => acc + (c.tasks?.length || 0), 0),
          videos: c.reduce((acc: number, c: any) => acc + (c.videos?.length || 0), 0),
        });
      } catch (e) { /* API not available yet */ }
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: 'Products', value: stats.products, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', href: '/products' },
    { label: 'Campaigns', value: stats.campaigns, icon: Video, color: 'text-green-600', bg: 'bg-green-50', href: '/campaigns' },
    { label: 'Scripts', value: stats.scripts, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', href: '/scripts' },
    { label: 'Videos', value: stats.videos, icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50', href: '/campaigns' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 mt-1">TikTok AI Video Factory Overview</p>
        </div>
        <div className="flex gap-3">
          <Link href="/products/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Product
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold mt-1">{loading ? '-' : value}</p>
              </div>
              <div className={`p-3 rounded-lg ${bg}`}>
                <Icon size={20} className={color} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-6">
        {/* Products */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Products</h3>
            <Link href="/products" className="text-sm text-brand-500 hover:underline">View all</Link>
          </div>
          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={32} className="mx-auto mb-2" />
              <p>No products yet. Add your first product to get started.</p>
              <Link href="/products/new" className="btn-primary inline-flex items-center gap-2 mt-4">
                <Plus size={14} /> Add Product
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {products.slice(0, 5).map((p: any) => (
                <Link key={p.id} href={`/products/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category} · {p.country}</p>
                  </div>
                  <span className={`badge-${p.status === 'active' ? 'success' : 'info'}`}>{p.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Campaigns</h3>
            <Link href="/campaigns" className="text-sm text-brand-500 hover:underline">View all</Link>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Video size={32} className="mx-auto mb-2" />
              <p>No campaigns yet. Select a product to start generating.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((c: any) => (
                <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.tasks?.length || 0} tasks</p>
                  </div>
                  <span className={`badge-${c.status === 'completed' ? 'success' : c.status === 'generating' ? 'warning' : 'info'}`}>
                    {c.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
