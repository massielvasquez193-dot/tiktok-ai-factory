'use client';
import { useEffect, useState, useRef } from 'react';
import { Rocket, Sparkles, Play, CheckCircle, Loader2, AlertTriangle, Clock, Upload, Film, Zap, Globe, Target, FileText, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function VideoGeneratorPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'generate'|'pipeline'|'jobs'>('pipeline');
  const [products, setProducts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setL] = useState(true);
  const [running, setRunning] = useState(false);

  // Pipeline form
  const [productId, setPid] = useState('');
  const [countries, setCountries] = useState<string[]>(['US','MY','TH']);
  const [scriptCount, setSc] = useState(3);
  const [status, setStatus] = useState<any>(null);
  const [pollId, setPollId] = useState<NodeJS.Timeout|null>(null);

  const load = () => {
    Promise.all([
      fetch('/api/products').then(r => r.json()).catch(() => []),
      fetch('/api/video-generator/tasks').then(r => r.json()).catch(() => []),
      fetch('/api/video-generator/jobs').then(r => r.json()).catch(() => []),
    ]).then(([p, t, j]) => { setProducts(p); setTasks(t); setJobs(j); setL(false); });
  };
  useEffect(() => { load(); return () => { if (pollId) clearInterval(pollId); }; }, []);

  const runPipeline = async () => {
    if (!productId) return alert('Select a product');
    setRunning(true);
    const fd = new FormData();
    fd.append('productId', productId);
    fd.append('countries', countries.join(','));
    fd.append('scriptCount', String(scriptCount));
    const r = await fetch('/api/video-generator/run', { method: 'POST', body: fd });
    const data = await r.json();
    setStatus(data);
    const pid = setInterval(async () => {
      const resp = await fetch('/api/video-generator/jobs/' + data.jobId);
      const s = await resp.json();
      setStatus(s); load();
      if (s.status === 'completed' || s.status === 'failed') { clearInterval(pid); setRunning(false); }
    }, 2000);
    setPollId(pid);
  };

  const stats = tasks.length > 0 ? { total: tasks.length, completed: tasks.filter(t=>t.status==='completed').length, failed: tasks.filter(t=>t.status==='failed').length } : { total: 0, completed: 0, failed: 0 };
  const statusIcon = (s: string) => { if (s==='completed'||s==='done') return <CheckCircle size={14} className="text-green-500"/>; if (s==='running') return <Loader2 size={14} className="text-blue-500 animate-spin"/>; if (s==='failed') return <AlertTriangle size={14} className="text-red-500"/>; return <Clock size={14} className="text-gray-400"/>; };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Rocket size={24}/> AI Video Pipeline</h2><p className="text-gray-500 text-sm">{t('desc.agent')}</p></div>
        <div className="flex gap-2">
          {['pipeline','generate','jobs'].map(tb => <button key={tb} onClick={() => setTab(tb as any)} className={`text-xs px-3 py-1.5 rounded-full ${tab===tb?'bg-brand-500 text-white':'bg-gray-100 text-gray-600'}`}>{tb==='pipeline'?'Run Pipeline':tb==='generate'?'Generate Video':'Job Monitor'}</button>)}
        </div>
      </div>

      {tab === 'pipeline' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><SettingsIcon size={18}/> Configuration</h3>
            <div className="space-y-3">
              <div><label className="text-xs mb-1 block">Product</label><select className="input text-sm" value={productId} onChange={e=>setPid(e.target.value)}><option value="">Select...</option>{products.map(p=><option key={p.id} value={p.id}>{p.product_name}</option>)}</select></div>
              <div><label className="text-xs mb-2 block">Countries</label><div className="grid grid-cols-5 gap-1">{'US,UK,MY,TH,PH,VN,ID,SG,CA,AU'.split(',').map(c=><button key={c} onClick={()=>setCountries(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])} className={`text-xs px-2 py-1 rounded border ${countries.includes(c)?'bg-brand-500 text-white':'bg-white'}`}>{c}</button>)}</div></div>
              <div><label className="text-xs mb-1 block">Scripts per country</label><select className="input text-sm" value={scriptCount} onChange={e=>setSc(Number(e.target.value))}>{[1,2,3,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
              <button onClick={runPipeline} disabled={running||!productId} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg"><Rocket size={20}/> {running?'Running...':'Run Full Pipeline'}</button>
            </div>
          </div>

          <div className="card col-span-2">
            <h3 className="font-semibold mb-4">Pipeline Status</h3>
            {!status ? (
              <div className="text-center py-12 text-gray-400"><Rocket size={40} className="mx-auto mb-2 opacity-30"/><p>Select product and click Run Full Pipeline</p></div>
            ) : (
              <div className="space-y-3">
                {(status.steps||[]).map((s:any,i:number) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${s.status==='completed'||s.status==='done'?'bg-green-50 border-green-200':s.status==='running'?'bg-blue-50 border-blue-200 animate-pulse':'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">{statusIcon(s.status)}<span className="text-sm font-medium capitalize">{s.step}</span>{s.count&&<span className="text-xs text-gray-500">×{s.count}</span>}</div>
                    <span className={`text-xs ${s.status==='completed'?'text-green-500':s.status==='running'?'text-blue-500':''}`}>{s.status}</span>
                  </div>
                ))}
                {status.status==='completed'&&<div className="text-center text-green-600 font-bold pt-2">✅ Pipeline Complete!</div>}
                {status.error&&<div className="text-center text-red-500 pt-2">❌ {status.error}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'generate' && (
        <div className="card">
          <h3 className="font-semibold mb-4"><Sparkles size={18} className="inline mr-2"/>Generate Video (Raw API)</h3>
          <GenerateForm products={products} onSuccess={load}/>
        </div>
      )}

      {tab === 'jobs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            <div className="card text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total</p></div>
            <div className="card text-center bg-green-50"><p className="text-2xl font-bold text-green-700">{stats.completed}</p><p className="text-xs text-green-500">Completed</p></div>
            <div className="card text-center bg-blue-50"><p className="text-2xl font-bold text-blue-700">{jobs.filter(j=>j.status==='running').length}</p><p className="text-xs text-blue-500">Active Jobs</p></div>
            <div className="card text-center bg-red-50"><p className="text-2xl font-bold text-red-700">{stats.failed}</p><p className="text-xs text-red-500">Failed</p></div>
          </div>
          <div className="card"><h3 className="font-semibold mb-3">Task History</h3>
            {tasks.slice(0, 20).map(t=>(<div key={t.id} className="flex justify-between py-2 border-b text-sm"><span>{t.model} — {t.prompt?.prompt?.slice(0,60)}</span><span className={t.status==='completed'?'badge-green':'badge-blue'}>{t.status}</span></div>))}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsIcon({size}:any){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}

function GenerateForm({products,onSuccess}:any){
  const [model,setModel]=useState('seedance');const [prompt,setPrompt]=useState('');const [ar,setAr]=useState('9:16');const [dur,setDur]=useState(5);const [qty,setQty]=useState(1);const [gen,setGen]=useState(false);
  const genVid=async()=>{if(!prompt)return alert('Enter prompt');setGen(true);const fd=new FormData();fd.append('prompt',prompt);fd.append('model',model);fd.append('aspectRatio',ar);fd.append('duration',String(dur));fd.append('quantity',String(qty));await fetch('/api/video-generator/generate',{method:'POST',body:fd});setGen(false);onSuccess();};
  return <div className="space-y-4">
    <div className="grid grid-cols-4 gap-3">
      <div><label className="text-xs mb-1 block">Model</label><select className="input text-xs py-1.5" value={model} onChange={e=>setModel(e.target.value)}><option value="seedance">Seedance 2.0</option><option value="kling">Kling</option><option value="veo">Veo 2</option></select></div>
      <div><label className="text-xs mb-1 block">Ratio</label><select className="input text-xs py-1.5" value={ar} onChange={e=>setAr(e.target.value)}>{['9:16','1:1','16:9'].map(a=><option key={a}>{a}</option>)}</select></div>
      <div><label className="text-xs mb-1 block">Duration</label><select className="input text-xs py-1.5" value={dur} onChange={e=>setDur(Number(e.target.value))}>{[5,8,10,15].map(d=><option key={d}>{d}s</option>)}</select></div>
      <div><label className="text-xs mb-1 block">Quantity</label><select className="input text-xs py-1.5" value={qty} onChange={e=>setQty(Number(e.target.value))}>{[1,2,4].map(q=><option key={q}>{q}</option>)}</select></div>
    </div>
    <textarea className="input text-sm h-20" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe your video..."/>
    <button onClick={genVid} disabled={gen||!prompt} className="btn-primary w-full">{gen?'Generating...':'Generate'}</button>
  </div>;
}
