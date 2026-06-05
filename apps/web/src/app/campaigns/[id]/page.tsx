'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ago } from '@/lib/utils';
import { ArrowLeft, Play, CheckCircle, Clock, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const d = await api.getCampaign(id); setC(d);
      if (d.tasks?.length) { const done = d.tasks.filter((t: any) => t.status === 'completed').length; setProgress(Math.round((done / d.tasks.length) * 100)); }
    } catch (e) {}
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); const i = setInterval(() => { if (c?.status === 'generating') fetch(); }, 5000); return () => clearInterval(i); }, [fetch, c?.status]);

  if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin mx-auto" size={32} /></div>;
  if (!c) return <div className="text-center py-20 text-gray-400">Not found</div>;

  const statusMap: Record<string, any> = { completed: CheckCircle, generating: Loader2, failed: AlertTriangle, draft: Clock };
  const colorMap: Record<string, string> = { completed: 'text-green-500', generating: 'text-yellow-500 animate-spin', failed: 'text-red-500', draft: 'text-gray-400' };
  const SIcon = statusMap[c.status] || Clock;
  const SColor = colorMap[c.status] || 'text-gray-400';

  return (
    <div className="max-w-4xl">
      <Link href="/campaigns" className="flex items-center gap-2 text-sm text-gray-500 mb-4"><ArrowLeft size={14} />Back</Link>
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4"><SIcon size={48} className={SColor} /><div><h2 className="text-xl font-bold">{c.name}</h2><p className="text-sm text-gray-500">{c.product?.name} · {ago(c.createdAt)}</p></div></div>
          <div className="flex gap-2">
            {c.status === 'draft' && <button className="btn-primary flex items-center gap-2" onClick={async () => { await api.updateCampaignStatus(id, 'generating'); fetch(); }}><Play size={14} />Run Pipeline</button>}
          </div>
        </div>
        {c.status === 'generating' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1"><span>Progress</span><span>{progress}%</span></div>
            <div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-brand-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </div>
      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Tasks</h3>
        <div className="space-y-2">
          {c.tasks?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {t.status === 'completed' ? <CheckCircle size={18} className="text-green-500" /> : t.status === 'running' ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : t.status === 'failed' ? <AlertTriangle size={18} className="text-red-500" /> : <Clock size={18} className="text-gray-400" />}
                <div><p className="text-sm font-medium capitalize">{t.type.replace(/_/g, ' ')}</p><p className="text-xs text-gray-500">{t.status}</p></div>
              </div>
              {t.progress > 0 && <span className="text-sm text-gray-500">{t.progress}%</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-4">Videos ({c.videos?.length || 0})</h3>
        {!c.videos?.length ? <p className="text-sm text-gray-400">No videos yet</p> : (
          <div className="grid grid-cols-2 gap-4">
            {c.videos.map((v: any) => (
              <div key={v.id} className="border rounded-lg overflow-hidden">
                <div className="aspect-[9/16] bg-gray-100 flex items-center justify-center">
                  {v.status === 'completed' ? <video src={v.url} controls className="w-full h-full object-cover" /> : <Loader2 className="animate-spin" size={24} />}
                </div>
                <div className="p-3"><p className="text-sm font-medium truncate">{v.filename}</p><p className="text-xs text-gray-500">{v.provider} · {v.duration}s</p>
                  {v.url && <a href={v.url} download className="text-xs text-brand-500 flex items-center gap-1 mt-1"><Download size={12} />Download</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
