'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatNumber, timeAgo } from '@/lib/utils';
import { ArrowLeft, Play, RefreshCw, Download, ExternalLink, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const fetchCampaign = useCallback(async () => {
    try {
      const data = await api.getCampaign(id);
      setCampaign(data);
      // Calculate progress
      if (data.tasks?.length) {
        const done = data.tasks.filter((t: any) => t.status === 'completed').length;
        setProgress(Math.round((done / data.tasks.length) * 100));
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCampaign();
    // Poll if generating
    const interval = setInterval(() => {
      if (campaign?.status === 'generating') fetchCampaign();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchCampaign, campaign?.status]);

  if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin mx-auto" size={32} /></div>;
  if (!campaign) return <div className="text-center py-20 text-gray-400">Campaign not found</div>;

  const statusIcon = {
    completed: <CheckCircle size={48} className="text-green-500" />,
    generating: <Loader2 size={48} className="text-yellow-500 animate-spin" />,
    failed: <AlertTriangle size={48} className="text-red-500" />,
    draft: <Clock size={48} className="text-gray-400" />,
  }[campaign.status] || <Clock size={48} className="text-gray-400" />;

  return (
    <div className="max-w-4xl">
      <Link href="/campaigns" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to Campaigns
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {statusIcon}
            <div>
              <h2 className="text-xl font-bold">{campaign.name}</h2>
              <p className="text-sm text-gray-500">
                {campaign.product?.name || 'Unknown'} · Created {timeAgo(campaign.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {campaign.status === 'draft' && (
              <button
                className="btn-primary flex items-center gap-2"
                onClick={async () => {
                  await api.updateCampaignStatus(id, 'generating');
                  fetchCampaign();
                }}
              >
                <Play size={14} /> Run Pipeline
              </button>
            )}
            <button className="btn-secondary flex items-center gap-2" onClick={fetchCampaign}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {campaign.status === 'generating' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-brand-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Tasks</h3>
        <div className="space-y-3">
          {campaign.tasks?.map((task: any) => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {task.status === 'completed' ? <CheckCircle size={18} className="text-green-500" />
                  : task.status === 'running' ? <Loader2 size={18} className="text-blue-500 animate-spin" />
                  : task.status === 'failed' ? <AlertTriangle size={18} className="text-red-500" />
                  : <Clock size={18} className="text-gray-400" />}
                <div>
                  <p className="text-sm font-medium">{task.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">Status: {task.status}</p>
                </div>
              </div>
              {task.progress > 0 && task.progress < 100 && (
                <span className="text-sm text-gray-500">{task.progress}%</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Videos */}
      <div className="card">
        <h3 className="font-semibold mb-4">Videos ({campaign.videos?.length || 0})</h3>
        {!campaign.videos?.length ? (
          <p className="text-sm text-gray-400">No videos generated yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {campaign.videos.map((v: any) => (
              <div key={v.id} className="border rounded-lg overflow-hidden">
                <div className="aspect-[9/16] bg-gray-100 flex items-center justify-center">
                  {v.status === 'completed' ? (
                    <video src={v.url} controls className="w-full h-full object-cover" poster={v.metadata?.thumbnail} />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      <p className="text-xs">{v.status}</p>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{v.filename}</p>
                  <p className="text-xs text-gray-500">
                    {v.provider} · {v.duration > 0 ? `${v.duration}s` : 'pending'}
                  </p>
                  {v.status === 'completed' && v.url && (
                    <a href={v.url} download className="text-xs text-brand-500 hover:underline flex items-center gap-1 mt-1">
                      <Download size={12} /> Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
