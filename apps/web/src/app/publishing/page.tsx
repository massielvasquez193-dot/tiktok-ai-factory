'use client';
import { useEffect, useState } from 'react';
import { Send, Clock, CheckCircle, AlertTriangle, Calendar, Globe, Hash, MessageSquare, FileText } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function PublishingPage() {
  const [items, setItems] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setL] = useState(true);
  const [videoId, setVid] = useState('');
  const [country, setC] = useState('US');
  const [genMode, setGen] = useState<'single'|'bulk'>('single');

  const load = () => {
    Promise.all([
      fetch('/api/publishing').then(r => r.json()).catch(() => []),
      fetch('/api/videos').then(r => r.json()).then(d => d.items || []).catch(() => []),
    ]).then(([p, v]) => { setItems(p); setVideos(v); setL(false); });
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!videoId) return alert('Select video');
    await fetch('/api/publishing/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, country }) });
    load();
  };

  const bulkGenerate = async () => {
    const cs = ['US','UK','MY','TH','PH','VN','ID'];
    for (const c of cs) { await fetch('/api/publishing/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, country: c }) }); }
    load();
  };

  const schedule = async (id: string, at: string) => {
    await fetch('/api/publishing/' + id + '/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: at }) });
    load();
  };

  const publish = async (id: string) => { await fetch('/api/publishing/' + id + '/publish', { method: 'POST' }); load(); };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/publishing/' + id, { method: 'DELETE' }); load(); };

  const stats = { total: items.length, pending: items.filter(i => i.status === 'pending').length, scheduled: items.filter(i => i.status === 'scheduled').length, published: items.filter(i => i.status === 'published').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Send size={24} /> Publish Center</h2><p className="text-gray-500 text-sm">{items.length} tasks · {stats.published} published</p></div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4"><FileText size={18} className="inline mr-2" />Generate Publishing Content</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div><label className="text-xs mb-1 block">Video</label><select className="input text-xs py-1.5" value={videoId} onChange={e => setVid(e.target.value)}><option value="">Select...</option>{videos.map(v => <option key={v.id} value={v.id}>{v.title?.slice(0,35) || v.id?.slice(0,12)}</option>)}</select></div>
          <div><label className="text-xs mb-1 block">Country</label><select className="input text-xs py-1.5" value={country} onChange={e => setC(e.target.value)}>{['US','UK','MY','TH','PH','VN','ID','SG','CA','AU'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="flex items-end gap-2">
            <button onClick={generate} disabled={!videoId} className="btn-primary text-xs py-1.5 px-4 flex-1">Generate</button>
            <button onClick={bulkGenerate} disabled={!videoId} className="btn-secondary text-xs py-1.5 px-4">Bulk 7 Countries</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[{l:'Pending',v:stats.pending,c:'text-yellow-600 bg-yellow-50'},{l:'Scheduled',v:stats.scheduled,c:'text-blue-600 bg-blue-50'},{l:'Published',v:stats.published,c:'text-green-600 bg-green-50'},{l:'Total',v:stats.total,c:'text-gray-600 bg-gray-50'}].map(s => (
          <div key={s.l} className={`card text-center ${s.c}`}><p className="text-2xl font-bold">{loading ? '-' : s.v}</p><p className="text-xs mt-1 opacity-70">{s.l}</p></div>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : items.length === 0 ? (
          <div className="card text-center py-12 text-gray-400"><Send size={32} className="mx-auto mb-2 opacity-30" /><p>Select a video and generate publishing content</p></div>
        ) : items.map(p => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={14} className="text-gray-400" />
                  <span className="font-bold text-sm">{p.country}</span>
                  <span className={`text-xs ${p.status==='published'?'badge-green':p.status==='scheduled'?'badge-blue':'badge-yellow'}`}>{p.status}</span>
                  {p.scheduledAt && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10} />{new Date(p.scheduledAt).toLocaleString()}</span>}
                </div>
                <p className="text-sm font-medium mb-1">{p.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mb-1">{p.description}</p>
                <p className="text-xs text-blue-500">{p.hashtags}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MessageSquare size={10} />Pinned: {p.pinnedComment}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {p.status === 'pending' && (
                  <>
                    <button onClick={() => schedule(p.id, new Date(Date.now() + 3600000).toISOString())} className="btn-secondary text-xs py-1 px-2">Schedule +1h</button>
                    <button onClick={() => publish(p.id)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1"><Send size={12} /> Publish</button>
                  </>
                )}
                {p.status === 'scheduled' && <button onClick={() => publish(p.id)} className="btn-primary text-xs py-1 px-3">Publish Now</button>}
                <button onClick={() => del(p.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
