'use client';
import { useEffect, useState } from 'react';
import { Play, Pause, Clock, Settings, RefreshCw, Trash2, CheckCircle, AlertTriangle, Plus, Calendar } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function AutomationPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ agents: [], intervals: [] });
  const [loading, setL] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [agentType, setType] = useState('tiktok_agent');
  const [selCountries, setSel] = useState<string[]>(['US','MY','TH']);
  const [productId, setPid] = useState('');
  const [intervalMins, setInt] = useState(60);
  const [startTime, setStart] = useState('08:00');
  const [endTime, setEnd] = useState('18:00');

  const load = () => {
    Promise.all([
      fetch('/api/automation').then(r=>r.json()).catch(()=>[]),
      fetch('/api/products').then(r=>r.json()).catch(()=>[]),
      fetch('/api/automation/config').then(r=>r.json()).catch(()=>({agents:[],intervals:[]})),
    ]).then(([j,p,c])=>{setJobs(j);setProducts(p);setConfig(c);setL(false);});
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{if(jobs.some(j=>j.status==='running')){const i=setInterval(load,10000);return()=>clearInterval(i);}},[jobs]);

  const create = async () => {
    if(!name) return alert('Name required');
    await fetch('/api/automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,agentType,countries:selCountries,productId:productId||null,intervalMinutes:intervalMins,startTime,endTime,enabled:true})});
    setShowForm(false);load();
  };

  const toggle = async (id:string, enabled:boolean) => {
    await fetch('/api/automation/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})});load();
  };

  const runNow = async (id:string) => { await fetch('/api/automation/'+id+'/run',{method:'POST'});load(); };
  const del = async (id:string) => { if(!confirm('Delete?'))return; await fetch('/api/automation/'+id,{method:'DELETE'});load(); };

  const stats = { total:jobs.length, running:jobs.filter(j=>j.enabled&&j.status!=='paused').length, todayRuns:jobs.reduce((s,j)=>s+j.totalRuns,0), success:jobs.reduce((s,j)=>s+j.successRuns,0) };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Settings size={24}/> {t('title.automation')}</h2><p className="text-gray-500 text-sm">{t('automation.totalJobs')}: {stats.total} · {t('automation.active')}: {stats.running} · {t('automation.runsToday')}: {stats.todayRuns}</p></div>
        <button onClick={()=>setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16}/> {t('automation.newJob')}</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[{l:t('automation.active'),v:stats.running,c:'bg-green-50 text-green-700'},{l:t('automation.totalJobs'),v:stats.total,c:'bg-blue-50 text-blue-700'},{l:t('automation.runsToday'),v:stats.todayRuns,c:'bg-purple-50 text-purple-700'},{l:t('label.success'),v:stats.success,c:'bg-yellow-50 text-yellow-700'}].map(s=><div key={s.l} className={`card text-center ${s.c}`}><p className="text-2xl font-bold">{loading?'-':s.v}</p><p className="text-xs mt-1 opacity-70">{s.l}</p></div>)}
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm mb-1 block">{t('automation.jobName')}</label><input className="input text-sm" value={name} onChange={e=>setName(e.target.value)} placeholder="Daily Auto Run"/></div>
            <div><label className="text-sm mb-1 block">{t('automation.agentType')}</label><select className="input text-sm" value={agentType} onChange={e=>setType(e.target.value)}>{config.agents?.map((a:string)=><option key={a} value={a}>{a.replace(/_/g,' ')}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="text-sm mb-1 block">{t('automation.interval')}</label><select className="input text-sm" value={intervalMins} onChange={e=>setInt(Number(e.target.value))}>{config.intervals?.map((i:number)=><option key={i} value={i}>{i} min</option>)}</select></div>
            <div><label className="text-sm mb-1 block">Start</label><input type="time" className="input text-sm" value={startTime} onChange={e=>setStart(e.target.value)}/></div>
            <div><label className="text-sm mb-1 block">End</label><input type="time" className="input text-sm" value={endTime} onChange={e=>setEnd(e.target.value)}/></div>
          </div>
          <div className="mb-4"><label className="text-sm mb-2 block">{t('automation.countries')}</label><div className="grid grid-cols-5 gap-1.5">{'US,UK,MY,TH,PH,VN,ID,SG,CA,AU'.split(',').map(c=><button key={c} onClick={()=>setSel(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])} className={`text-xs px-2 py-1.5 rounded-lg border ${selCountries.includes(c)?'bg-brand-500 text-white':'bg-white'}`}>{c}</button>)}</div></div>
          <div className="mb-4"><label className="text-sm mb-1 block">{t('automation.product')}</label><select className="input text-sm" value={productId} onChange={e=>setPid(e.target.value)}><option value="">{t('filter.all')}</option>{products.map((p:any)=><option key={p.id} value={p.id}>{p.product_name}</option>)}</select></div>
          <button onClick={create} className="btn-primary w-full">{t('button.create')} — {intervalMins}min · {selCountries.length} {t('label.country')}</button>
        </div>
      )}

      <div className="space-y-3">
        {loading?<p className="text-center py-8">Loading...</p>:jobs.length===0?<div className="card text-center py-12 text-gray-400"><Clock size={32} className="mx-auto mb-2 opacity-30"/><p>No automation jobs yet</p></div>:jobs.map(j=>(
          <div key={j.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${j.enabled?'bg-green-500':'bg-gray-300'}`}/>
                <div>
                  <p className="font-medium text-sm">{j.name}</p>
                  <p className="text-xs text-gray-500">{j.agentType.replace(/_/g,' ')} · every {j.intervalMinutes}min · {JSON.parse(j.countries||'[]').join(',')} · {j.startTime}-{j.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {j.nextRunAt&&<span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/>Next: {new Date(j.nextRunAt).toLocaleTimeString()}</span>}
                <span className="text-xs text-gray-500">Runs: {j.successRuns}/{j.totalRuns}</span>
                <button onClick={()=>toggle(j.id,!j.enabled)} className={`p-1.5 rounded ${j.enabled?'bg-green-50 text-green-500':'bg-gray-50 text-gray-400'}`}>{j.enabled?<Pause size={14}/>:<Play size={14}/>}</button>
                <button onClick={()=>runNow(j.id)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><RefreshCw size={12}/> Run Now</button>
                <button onClick={()=>del(j.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400"/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
