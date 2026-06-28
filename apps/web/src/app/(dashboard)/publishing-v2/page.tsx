'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Send, Calendar, RotateCw, X, Play, Clock, CheckCircle, XCircle, Filter, Plus, Trash2 } from 'lucide-react';

const PLATFORM_ICONS: Record<string, string> = { tiktok: '🎵', youtube_shorts: '▶️', instagram_reels: '📷' };
const PLATFORM_LABELS: Record<string, string> = { tiktok: 'TikTok', youtube_shorts: 'YouTube Shorts', instagram_reels: 'Instagram Reels' };

export default function PublishingV2Page() {
  const { token } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState('');

  // Form state
  const [videoId, setVideoId] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [publishNow, setPublishNow] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success && d.data[0]) { setWs(d.data[0]); loadData(d.data[0].id); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function loadData(wsId: string) {
    try {
      const [sj, ss, sv] = await Promise.all([
        fetch(`/api/workspaces/${wsId}/publishing/jobs?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`/api/workspaces/${wsId}/publishing/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/videos', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      if (sj.success) setJobs(sj.data.jobs);
      if (ss.success) setStats(ss.data);
      if (sv.success || sv.items) setVideos(sv.data || sv.items || []);
    } catch {}
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setMsg('');
    try {
      const body: any = { videoId, platform, title, description, hashtags, pinnedComment: '', scheduledAt: publishNow ? null : scheduledAt };
      const res = await fetch(`/api/workspaces/${ws.id}/publishing/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      if (publishNow) {
        await fetch(`/api/workspaces/${ws.id}/publishing/jobs/${d.data.id}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
      setShowCreate(false); loadData(ws.id); setMsg(publishNow ? 'Published!' : 'Scheduled!');
    } catch (err: any) { setMsg(err.message); }
  }

  async function handleRetry(jobId: string) {
    try { await fetch(`/api/workspaces/${ws.id}/publishing/jobs/${jobId}/retry`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); loadData(ws.id); }
    catch (err: any) { setMsg(err.message); }
  }

  async function handleDelete(jobId: string) {
    if (!confirm('Delete this publishing job?')) return;
    try { await fetch(`/api/workspaces/${ws.id}/publishing/jobs/${jobId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); loadData(ws.id); }
    catch (err: any) { setMsg(err.message); }
  }

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  if (loading) return <div className="text-gray-400 py-8">Loading publishing center...</div>;
  if (!ws) return <div className="text-gray-400 py-8">No workspace found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Send size={24}/> Publishing Center</h2><p className="text-sm text-gray-500">{stats?.total || 0} jobs · {stats?.published || 0} published</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> New Publish</button>
      </div>

      {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('!')?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
            { label: 'Scheduled', value: stats.scheduled, color: 'bg-blue-100 text-blue-700' },
            { label: 'Published', value: stats.published, color: 'bg-green-100 text-green-700' },
            { label: 'Failed', value: stats.failed, color: 'bg-red-100 text-red-700' },
            { label: 'Draft', value: stats.drafted, color: 'bg-yellow-100 text-yellow-700' },
          ].map(s => (
            <div key={s.label} className={`card text-center ${s.color}`}><p className="text-2xl font-bold">{s.value}</p><p className="text-xs mt-1">{s.label}</p></div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all','draft','scheduled','queued','published','failed'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter===f?'bg-brand-500 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
        ))}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">New Publish Job</h3><button onClick={()=>setShowCreate(false)}><X size={16}/></button></div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Video</label><select value={videoId} onChange={e=>setVideoId(e.target.value)} className="input" required><option value="">Select video...</option>{videos.map((v:any)=><option key={v.id} value={v.id}>{v.title||'Untitled'} ({v.provider})</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Platform</label><select value={platform} onChange={e=>setPlatform(e.target.value)} className="input">{Object.entries(PLATFORM_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="input" placeholder="Video caption..." required/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label><input type="text" value={hashtags} onChange={e=>setHashtags(e.target.value)} className="input" placeholder="#tiktok #viral #product"/> </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2"><input type="radio" checked={publishNow} onChange={()=>setPublishNow(true)}/> Publish Now</label>
              <label className="flex items-center gap-2"><input type="radio" checked={!publishNow} onChange={()=>setPublishNow(false)}/> Schedule</label>
            </div>
            {!publishNow && <div><label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date & Time</label><input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="input" required/></div>}
            <div className="flex gap-3"><button type="submit" className="btn-primary flex items-center gap-2">{publishNow?<><Play size={14}/>Publish Now</>:<><Calendar size={14}/>Schedule</>}</button><button type="button" onClick={()=>setShowCreate(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}

      {/* Job List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12"><Send size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500">No publishing jobs yet</p><p className="text-sm text-gray-400 mt-1">Create your first publish job to get started</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(j => (
            <div key={j.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{PLATFORM_ICONS[j.platform] || '📤'}</span>
                <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate max-w-xs">{j.title || 'Untitled'}</p><p className="text-xs text-gray-500">{PLATFORM_LABELS[j.platform]} · {j.scheduledAt ? new Date(j.scheduledAt).toLocaleString() : 'Immediate'} · {j.retryCount}/{j.maxRetries} retries</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.status==='published'?'bg-green-100 text-green-700':j.status==='failed'?'bg-red-100 text-red-700':j.status==='scheduled'?'bg-blue-100 text-blue-700':j.status==='queued'?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'}`}>{j.status}</span>
                {j.status === 'failed' && <button onClick={()=>handleRetry(j.id)} className="p-1.5 text-gray-400 hover:text-brand-500" title="Retry"><RotateCw size={14}/></button>}
                {j.status !== 'published' && <button onClick={()=>handleDelete(j.id)} className="p-1.5 text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={14}/></button>}
                {j.status === 'published' && j.externalPostUrl && <a href={j.externalPostUrl} target="_blank" className="text-xs text-brand-500 hover:underline">{PLATFORM_LABELS[j.platform]?.split(' ')[0]} ↗</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
