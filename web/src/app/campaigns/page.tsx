'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatNumber, timeAgo } from '@/lib/utils';
import { Plus, Play, ExternalLink } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaigns().then(setCampaigns).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Campaigns</h2>
          <p className="text-gray-500 text-sm mt-1">{campaigns.length} campaigns</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-400 text-center py-12">Loading...</p>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No campaigns yet. Add a product first, then create a campaign.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c: any) => (
              <Link key={c.id} href={`/campaigns/${c.id}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${c.status === 'completed' ? 'bg-green-50' : c.status === 'generating' ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                    <Play size={16} className={c.status === 'completed' ? 'text-green-600' : c.status === 'generating' ? 'text-yellow-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.product?.name || 'Unknown product'} · {c.tasks?.length || 0} tasks · {timeAgo(c.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{c.videos?.length || 0} videos</span>
                  <span className={`badge-${c.status === 'completed' ? 'success' : c.status === 'generating' ? 'warning' : 'info'}`}>
                    {c.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
