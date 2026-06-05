'use client';
import { useEffect, useState } from 'react';
import { Rocket, Plus, Globe, Loader2, CheckCircle, AlertTriangle, Trash2, Clock, Check, Search, FileText, Languages, Sparkles, Film } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function CampaignV2Page() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ countries: [], levels: {}, templates: [] });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoad] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [pid, setPid] = useState('');
  const [sel, setSel] = useState<string[]>(['MY','TH','PH','VN','ID']);
  const [vpc, setVpc] = useState(3);
  const [lvl, setLvl] = useState('standard');
  const [st, setSt] = useState('ugc,review,pov');

  const load = () => {
    Promise.all([
      fetch('/api/campaigns-v2').then(r => r.json()).catch(() => []),
      fetch('/api/products').then(r => r.json()).catch(() => []),
      fetch('/api/campaigns-v2/config').then(r => r.json()).catch(() => ({ countries: [], templates: [] })),
    ]).then(([c, p, cfg]) => { setCampaigns(c); setProducts(p); setConfig(cfg); setLoad(false); });
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (campaigns.some(x => x.status === 'running')) { const i = setInterval(load, 3000); return () => clearInterval(i); } }, [campaigns]);

  const toggle = (c: string) => setSel(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const applyTemplate = (tpl: string[]) => setSel(tpl);

  const create = async () => {
    if (!name || !pid) return alert('Fill fields');
    setSubmitting(true);
    await fetch('/api/campaigns-v2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, productId: pid, countries: sel, videosPerCountry: vpc, localizationLevel: lvl, scriptTypes: st }) });
    setSubmitting(false); setShowForm(false); load();
  };

  const del = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/campaigns-v2/' + id, { method: 'DELETE' }); load(); };

  const tv = sel.length * vpc;
  const avgCost = sel.length > 0 ? sel.reduce((s: number, c: string) => s + (config.countries?.find((x: any) => x.code === c)?.costPerVideo || 0.05), 0) / sel.length : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Globe size={24} /> Multi-Country Campaign</h2><p className="text-gray-500 text-sm">{config.countries?.length || 10} countries · auto pipeline</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Campaign</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm mb-1 block">Name</label><input className="input text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Global Launch" /></div>
            <div><label className="text-sm mb-1 block">Product</label><select className="input text-sm" value={pid} onChange={e => setPid(e.target.value)}><option value="">Select...</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.product_name}</option>)}</select></div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm">Countries ({sel.length})</label>
              <div className="flex gap-1 flex-wrap">
                {config.templates?.map((t: any) => (
                  <button key={t.name} onClick={() => applyTemplate(t.countries)} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-brand-100 text-gray-500 hover:text-brand-600">{t.name}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {config.countries?.map((c: any) => (
                <button key={c.code} onClick={() => toggle(c.code)} className={`text-xs px-2 py-1.5 rounded-lg border text-center ${sel.includes(c.code) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 hover:border-brand-300'}`}>
                  {c.code}<br/><span className="text-[10px] opacity-70">{c.name.slice(0,10)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="text-sm mb-1 block">Videos/Country</label><select className="input text-sm" value={vpc} onChange={e => setVpc(Number(e.target.value))}>{[1,2,3,5,10].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
            <div><label className="text-sm mb-1 block">Level</label><select className="input text-sm" value={lvl} onChange={e => setLvl(e.target.value)}>{Object.entries(config.levels||{}).map(([k,v]:[string,any])=><option key={k} value={k}>{v.name}</option>)}</select></div>
            <div><label className="text-sm mb-1 block">Script Types</label><input className="input text-sm" value={st} onChange={e => setSt(e.target.value)} /></div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between text-sm">
            <span>{sel.length} × {vpc} = <strong>{tv} videos</strong></span>
            <span>≈ <strong className="text-brand-500">${(tv*avgCost).toFixed(2)}</strong></span>
            <button onClick={create} disabled={submitting || !name || !pid} className="btn-primary flex items-center gap-2"><Rocket size={14} /> {submitting ? 'Running...' : 'Launch'}</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : campaigns.length === 0 ? <div className="card text-center py-16 text-gray-400"><Globe size={40} className="mx-auto mb-3 opacity-30" /><p>Create a multi-country campaign to start</p></div> : campaigns.map(c => {
          const steps = (() => { try { return JSON.parse(c.result||'{}').steps||[]; } catch { return []; } })();
          const ctries = (() => { try { return JSON.parse(c.countries||'[]'); } catch { return []; } })();
          const cstats = c.countryStats || [];

          return (
            <div key={c.id} className={`card ${c.status === 'running' ? 'border-blue-200 bg-blue-50/20' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {c.status === 'running' ? <Loader2 size={20} className="text-blue-500 animate-spin" /> : c.status === 'completed' ? <CheckCircle size={20} className="text-green-500" /> : c.status === 'failed' ? <AlertTriangle size={20} className="text-red-500" /> : <Clock size={20} className="text-gray-400" />}
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{ctries.join(', ')} · {c.totalVideos} videos · ${c.costEstimate} · {c.totalScripts} scripts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'running' && <span className="text-xs text-blue-500">{c.progress}%</span>}
                  <span className={`text-xs ${c.status==='completed'?'badge-green':c.status==='running'?'badge-blue':c.status==='failed'?'badge-red':'badge-yellow'}`}>{c.status}</span>
                  <button onClick={() => del(c.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400" /></button>
                </div>
              </div>

              {/* Per-Country Stats */}
              {cstats.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {cstats.map((cs: any) => (
                    <div key={cs.country} className="bg-white rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold text-brand-600">{cs.country}</p>
                      <p className="text-xs text-gray-400">{cs.language}</p>
                      <div className="grid grid-cols-3 gap-1 mt-2 text-xs">
                        <div className="bg-gray-50 rounded p-1"><p className="font-bold text-green-600">{cs.scripts}</p><p className="text-[9px] text-gray-400">Scr</p></div>
                        <div className="bg-gray-50 rounded p-1"><p className="font-bold text-blue-600">{cs.succeeded}</p><p className="text-[9px] text-gray-400">OK</p></div>
                        <div className="bg-gray-50 rounded p-1"><p className="font-bold text-gray-600">{cs.duration}s</p><p className="text-[9px] text-gray-400">Time</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Steps */}
              {steps.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  {steps.map((s: any, i: number) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${s.status==='completed'||s.status==='done'?'bg-green-100 text-green-700':s.status==='running'?'bg-blue-100 text-blue-700':s.step==='Error'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-500'}`}>
                      {s.status==='completed'?<Check size={10}/>:s.status==='running'?<Loader2 size={10} className="animate-spin"/>:''} {s.step}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
