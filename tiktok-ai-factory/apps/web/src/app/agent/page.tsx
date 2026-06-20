'use client';
import { useEffect, useState } from 'react';
import { Rocket, Play, CheckCircle, Loader2, AlertTriangle, Clock, Globe, Zap, Search, FileText, Sparkles, Film, Mic, Send, BarChart3, ArrowRight, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n';

const COUNTRIES = ['US','UK','MY','TH','PH','VN','ID','SG','CA','AU'];
const STEPS = [
  { key:'research',icon:Search,label:'Research competitor trends'},
  { key:'knowledge',icon:Zap,label:'Query Knowledge Base'},
  { key:'scripts',icon:FileText,label:'Generate video scripts'},
  { key:'storyboard',icon:Film,label:'Create storyboards'},
  { key:'prompts',icon:Sparkles,label:'Generate AI prompts'},
  { key:'video',icon:Film,label:'Call Seedance API'},
  { key:'post',icon:Mic,label:'Run post production'},
  { key:'complete',icon:CheckCircle,label:'Pipeline complete'},
];

export default function AgentPage() {
  const { t } = useTranslation();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setL] = useState(true);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({ productLink:'', productName:'', category:'Skincare', price:'$29.99', countries:['US','MY','TH'], language:'en', scriptCount:3 });

  const load = () => { fetch('/api/agent').then(r => r.json()).then(setRuns).catch(()=>{}).finally(()=>setL(false)); };
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, []);

  const toggle = (c: string) => setForm(f => ({ ...f, countries: f.countries.includes(c) ? f.countries.filter(x=>x!==c) : [...f.countries, c] }));

  const run = async () => {
    if (!form.productLink && !form.productName) return alert('Enter product link or name');
    setRunning(true);
    await fetch('/api/agent/run', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
      productLink: form.productLink, productName: form.productName, category: form.category, price: form.price,
      countries: form.countries, language: form.language, scriptCount: form.scriptCount, name: (form.productName||'Product') + ' Auto Run',
    })});
    setRunning(false); load();
  };

  const del = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/agent/' + id, { method: 'DELETE' }); load(); };
  const statusIcon = (s: string) => { if (s==='completed') return <CheckCircle size={16} className="text-green-500"/>; if (s==='running') return <Loader2 size={16} className="text-blue-500 animate-spin"/>; if (s==='failed') return <AlertTriangle size={16} className="text-red-500"/>; return <Clock size={16} className="text-gray-400"/>; };

  const stats = { today: runs.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString()).length, total: runs.length, running: runs.filter(r => r.status==='running').length, completed: runs.filter(r => r.status==='completed').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Rocket size={24}/> {t('title.agent')}</h2><p className="text-gray-500 text-sm">One prompt → full auto: Research → Script → Prompt → Video → Post</p></div>
      </div>

      {/* One-Click Form */}
      <div className="card mb-6 border-2 border-brand-100 bg-gradient-to-r from-brand-50 to-white">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Rocket size={18} className="text-brand-500"/> Run Agent</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs mb-1 block">Product Link (TikTok/Shopify/Amazon)</label>
            <div className="flex gap-2">
              <input className="input text-sm flex-1" value={form.productLink} onChange={e => setForm({...form, productLink: e.target.value})} placeholder="https://www.tiktok.com/@brand/video/... or https://shopify.com/..."/>
              <button onClick={() => { if(form.productLink) { try { const u=new URL(form.productLink); setForm({...form, productName:u.hostname.split('.')[0]+' Product', category:'General'}); } catch{} } }} className="btn-secondary text-xs"><ExternalLink size={12}/> Parse</button>
            </div>
          </div>
          <div><label className="text-xs mb-1 block">Product Name</label><input className="input text-sm" value={form.productName} onChange={e=>setForm({...form, productName:e.target.value})} placeholder="e.g. Medicube Collagen Balm"/></div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div><label className="text-xs mb-1 block">Category</label><select className="input text-sm" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>{['Skincare','Supplements','Kitchen','Fashion','Electronics','Beauty','Health'].map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className="text-xs mb-1 block">Price</label><input className="input text-sm" value={form.price} onChange={e=>setForm({...form, price:e.target.value})}/></div>
          <div><label className="text-xs mb-1 block">Scripts</label><select className="input text-sm" value={form.scriptCount} onChange={e=>setForm({...form, scriptCount:Number(e.target.value)})}>{[1,2,3,5,8].map(n=><option key={n} value={n}>{n} per country</option>)}</select></div>
        </div>

        <div className="mb-4"><label className="text-xs mb-2 block">Target Countries</label><div className="flex flex-wrap gap-1.5">{COUNTRIES.map(c=><button key={c} onClick={()=>toggle(c)} className={`text-xs px-2.5 py-1.5 rounded-lg border ${form.countries.includes(c)?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 hover:border-brand-300'}`}>{c}</button>)}</div></div>

        <button onClick={run} disabled={running} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg bg-gradient-to-r from-brand-500 to-brand-600">
          <Rocket size={20}/> {running ? 'Agent Running...' : `Run Agent — ${form.countries.length} countries × ${form.scriptCount} scripts = ${form.countries.length*form.scriptCount} scripts`}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[{l:t('agent.today'),v:stats.today,c:'bg-blue-50'},{l:t('agent.running'),v:stats.running,c:'bg-yellow-50'},{l:t('status.completed'),v:stats.completed,c:'bg-green-50'},{l:t('agent.total'),v:stats.total,c:'bg-purple-50'}].map(s=>(<div key={s.l} className={`card text-center ${s.c}`}><p className="text-2xl font-bold">{loading?'-':s.v}</p><p className="text-xs mt-1 opacity-70">{s.l}</p></div>))}
      </div>

      {/* Run History */}
      <h3 className="font-semibold mb-3">Run History ({runs.length})</h3>
      <div className="space-y-3">
        {loading ? <p className="text-center py-8">Loading...</p> : runs.length===0 ? <p className="text-center py-8 text-gray-400">No runs yet</p> : runs.slice(0, 20).map(r => {
          const logs = (() => { try { return JSON.parse(r.log||'[]'); } catch { return []; } })();
          const cs = (() => { try { return JSON.parse(r.countries||'[]'); } catch { return []; } })();
          return (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(r.status)}
                  <div>
                    <p className="font-medium text-sm">{r.name} · {cs.join(', ')}</p>
                    <p className="text-xs text-gray-500">{r.videosGenerated} videos · {r.duration}s · {r.successRate}% success</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status==='running' && <div className="w-16 h-1.5 bg-gray-200 rounded-full"><div className="bg-blue-500 h-1.5 rounded-full" style={{width:r.progress+'%'}}/></div>}
                  <span className={`text-xs ${r.status==='completed'?'badge-green':'badge-blue'}`}>{r.status}</span>
                  <button onClick={()=>del(r.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                </div>
              </div>
              {logs.length>0 && <div className="mt-2 pt-2 border-t text-xs text-gray-500 space-y-0.5">{logs.slice(-4).map((l:any,i:number)=><div key={i}>{l.msg}</div>)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
