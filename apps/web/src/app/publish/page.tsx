'use client';
import { useEffect, useState } from 'react';
import { Send, Clock, CheckCircle, AlertTriangle, Plus, Play, Pause, Trash2, Calendar, Globe, Hash, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function PublishPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setL] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [videoId, setVid] = useState('');
  const [country, setC] = useState('US');
  const [title, setTitle] = useState('');
  const [hashtags, setHash] = useState('#tiktokmademebuyit #viral');
  const [accountCookie, setCookie] = useState('');
  const [proxy, setProxy] = useState('');
  const [scheduledAt, setSched] = useState('');

  const load = () => {
    Promise.all([
      fetch('/api/publish').then(r => r.json()).catch(() => []),
      fetch('/api/videos').then(r => r.json()).then(d => d.items || []).catch(() => []),
    ]).then(([t, v]) => { setTasks(t); setVideos(v); setL(false); });
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!videoId) return alert('Select video');
    await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, country, title, hashtags, accountCookie, proxy, scheduledAt: scheduledAt || null }) });
    setShowForm(false); load();
  };

  const publish = async (id: string) => { await fetch('/api/publish/' + id + '/publish', { method: 'POST' }); load(); };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/publish/' + id, { method: 'DELETE' }); load(); };

  const stats = { total: tasks.length, draft: tasks.filter(t => t.status === 'draft').length, scheduled: tasks.filter(t => t.status === 'scheduled').length, published: tasks.filter(t => t.status === 'published').length, failed: tasks.filter(t => t.status === 'failed').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Send size={24} /> {t('publishing.title')}</h2><p className="text-gray-500 text-sm">{stats.total} tasks · {stats.published} published</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Task</button>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {[{l:'Draft',v:stats.draft,c:'bg-gray-50'},{l:'Scheduled',v:stats.scheduled,c:'bg-blue-50 text-blue-700'},{l:'Published',v:stats.published,c:'bg-green-50 text-green-700'},{l:'Failed',v:stats.failed,c:'bg-red-50 text-red-700'},{l:'Total',v:stats.total,c:'bg-purple-50 text-purple-700'}].map(s => <div key={s.l} className={`card text-center ${s.c}`}><p className="text-2xl font-bold">{loading ? '-' : s.v}</p><p className="text-xs mt-1 opacity-70">{s.l}</p></div>)}
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs mb-1 block">Video</label><select className="input text-xs py-1.5" value={videoId} onChange={e => setVid(e.target.value)}><option value="">Select...</option>{videos.map(v => <option key={v.id} value={v.id}>{v.title?.slice(0,35) || v.id?.slice(0,12)}</option>)}</select></div>
            <div><label className="text-xs mb-1 block">Country</label><select className="input text-xs py-1.5" value={country} onChange={e => setC(e.target.value)}>{'US,UK,MY,TH,PH,VN,ID,SG,CA,AU'.split(',').map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-xs mb-1 block">Title</label><input className="input text-xs py-1.5" value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title"/></div>
            <div><label className="text-xs mb-1 block">Hashtags</label><input className="input text-xs py-1.5" value={hashtags} onChange={e => setHash(e.target.value)}/></div>
            <div><label className="text-xs mb-1 block">Account Cookie</label><input className="input text-xs py-1.5" value={accountCookie} onChange={e => setCookie(e.target.value)} placeholder="sessionid=xxx"/></div>
            <div><label className="text-xs mb-1 block">Proxy</label><input className="input text-xs py-1.5" value={proxy} onChange={e => setProxy(e.target.value)} placeholder="http://host:port"/></div>
            <div><label className="text-xs mb-1 block">Schedule</label><input type="datetime-local" className="input text-xs py-1.5" value={scheduledAt} onChange={e => setSched(e.target.value)}/></div>
            <div className="flex items-end"><button onClick={create} className="btn-primary text-xs py-1.5 w-full">Create</button></div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <p className="text-center py-8">Loading...</p> : tasks.length === 0 ? <div className="card text-center py-12 text-gray-400"><Send size={32} className="mx-auto mb-2 opacity-30"/><p>Create a publish task</p></div> : tasks.map(t => (
          <div key={t.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={14} className="text-gray-400"/><span className="font-bold text-sm">{t.country}</span>
                  <span className={`text-xs ${t.status==='published'?'badge-green':t.status==='scheduled'?'badge-blue':t.status==='failed'?'badge-red':'badge-yellow'}`}>{t.status}</span>
                  {t.scheduledAt && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/>{new Date(t.scheduledAt).toLocaleString()}</span>}
                </div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-blue-500">{t.hashtags}</p>
                {t.error && <p className="text-xs text-red-500">{t.error}</p>}
                <div className="flex gap-2 mt-1 text-xs text-gray-400">
                  {t.accountCookie && <span>Cookie: {t.accountCookie.slice(0,20)}...</span>}
                  {t.proxy && <span>Proxy: {t.proxy}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {(t.status==='draft'||t.status==='failed') && <button onClick={()=>publish(t.id)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1"><Send size={12}/> Publish</button>}
                <button onClick={()=>del(t.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400"/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
