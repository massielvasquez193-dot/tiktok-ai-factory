'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Film, FileText, Sparkles, Globe, Video, Mic, CheckCircle, AlertTriangle, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/i18n';

function Bar({ label, value, max, color }: any) {
  const pct = max > 0 ? Math.round(value / max * 100) : 0;
  return <div className="mb-2"><div className="flex justify-between text-xs mb-0.5"><span>{label}</span><span className="font-mono">{value}</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${color}`} style={{ width: pct + '%' }} /></div></div>;
}

export default function PerformancePage() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>({});
  const [campaigns, setCampaigns] = useState<any>({ items: [], byStatus: {} });
  const [scripts, setScripts] = useState<any>({ byType: {}, byLang: {} });
  const [research, setResearch] = useState<any>({ total: 0, avgScore: 0, topHooks: [] });
  const [prompts, setPrompts] = useState<any>({ byModel: {} });
  const [videos, setVideos] = useState<any>({ byProvider: {} });
  const [loc, setLoc] = useState<any>({ byCountry: {} });
  const [pp, setPp] = useState<any>({ total: 0 });
  const [loading, setL] = useState(true);
  const [tab, setTab] = useState('overview');

  const load = () => {
    Promise.all([
      fetch('/api/performance/overview').then(r => r.json()).catch(() => ({})),
      fetch('/api/performance/campaigns').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/performance/scripts').then(r => r.json()).catch(() => ({})),
      fetch('/api/performance/research').then(r => r.json()).catch(() => ({})),
      fetch('/api/performance/prompts').then(r => r.json()).catch(() => ({})),
      fetch('/api/performance/videos').then(r => r.json()).catch(() => ({})),
      fetch('/api/performance/localization').then(r => r.json()).catch(() => ({})),
      fetch('/api/performance/post-production').then(r => r.json()).catch(() => ({})),
    ]).then(([o, c, s, r, p, v, l, pp_]) => { setOverview(o); setCampaigns(c); setScripts(s); setResearch(r); setPrompts(p); setVideos(v); setLoc(l); setPp(pp_); setL(false); });
  };
  useEffect(() => { load(); }, []);

  const seedMock = async () => {
    await fetch('/api/performance/seed', { method: 'POST' });
    alert('Seeded 50 mock events'); load();
  };

  const maxBar = (obj: Record<string, number>) => Math.max(1, ...Object.values(obj));

  const tabs = ['overview','campaigns','scripts','research','prompts','videos','localization','post-production'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={24} /> {t('title.performance')}</h2><p className="text-gray-500 text-sm">{t('desc.performance')}</p></div>
        <div className="flex gap-2">
          <button onClick={seedMock} className="btn-secondary text-sm flex items-center gap-1"><RefreshCw size={14} /> {t('button.seedData')}</button>
          <button onClick={load} className="btn-secondary text-sm">{t('button.refresh')}</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${tab === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.replace(/-/g, ' ')}</button>)}
      </div>

      {loading ? <p className="text-center py-12">Loading...</p> : (
        <>
          {/* Overview */}
          {tab === 'overview' && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[{l:t('label.campaigns'),v:overview.campaigns,c:'bg-purple-50 text-purple-700'},{l:t('label.scripts'),v:overview.scripts,c:'bg-blue-50 text-blue-700'},{l:t('label.videos'),v:overview.videos,c:'bg-green-50 text-green-700'},{l:t('label.prompts'),v:overview.prompts,c:'bg-orange-50 text-orange-700'},{l:t('label.product'),v:overview.products,c:'bg-pink-50 text-pink-700'},{l:t('menu.research'),v:overview.research,c:'bg-yellow-50 text-yellow-700'},{l:t('label.duration'),v:overview.totalDuration+'s',c:'bg-indigo-50 text-indigo-700'},{l:t('label.success')+' Rate',v:overview.successRate+'%',c:'bg-emerald-50 text-emerald-700'}].map(s=>(<div key={s.l} className={`card text-center ${s.c}`}><p className="text-2xl font-bold">{s.v ?? '-'}</p><p className="text-xs mt-1 opacity-70">{s.l}</p></div>))}
              </div>
            </div>
          )}

          {/* Campaigns */}
          {tab === 'campaigns' && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="card"><p className="text-2xl font-bold">{campaigns.total}</p><p className="text-xs text-gray-500">Total</p></div>
                {Object.entries(campaigns.byStatus||{}).map(([k,v])=><div key={k} className="card"><p className="text-2xl font-bold">{v as number}</p><p className="text-xs text-gray-500">{k}</p></div>)}
              </div>
              <div className="card"><h3 className="font-semibold mb-3">Recent</h3>
                {campaigns.items?.map((c:any)=><div key={c.id} className="flex justify-between p-2 border-b text-sm"><span>{c.name}</span><span className="text-gray-400">{c.countries} countries · {c.totalVideos}v</span><span className={c.status==='completed'?'text-green-500':'text-gray-400'}>{c.status}</span></div>)}
              </div>
            </div>
          )}

          {/* Scripts */}
          {tab === 'scripts' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="card"><h3 className="font-semibold mb-3">By Type ({scripts.total})</h3>{Object.entries(scripts.byType||{}).map(([k,v])=><Bar key={k} label={k} value={v} max={maxBar(scripts.byType)} color="bg-blue-500"/>)}</div>
              <div className="card"><h3 className="font-semibold mb-3">By Language</h3>{Object.entries(scripts.byLang||{}).map(([k,v])=><Bar key={k} label={k} value={v as number} max={maxBar(scripts.byLang)} color="bg-green-500"/>)}</div>
            </div>
          )}

          {/* Research */}
          {tab === 'research' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="card"><h3 className="font-semibold mb-3">Overview</h3><p className="text-3xl font-bold">{research.total}</p><p className="text-sm text-gray-500">Total analyzed</p><p className="text-lg mt-2">Avg Score: <strong>{research.avgScore}/100</strong></p></div>
              <div className="card"><h3 className="font-semibold mb-3">Top Hooks</h3>{research.topHooks?.map(([k,v]:any)=><div key={k} className="text-sm py-1 border-b flex justify-between"><span className="truncate">{k}</span><span className="font-mono">{v}</span></div>)}</div>
            </div>
          )}

          {/* Prompts */}
          {tab === 'prompts' && (
            <div className="card"><h3 className="font-semibold mb-3">By Model ({prompts.total})</h3><div className="grid grid-cols-3 gap-4">{Object.entries(prompts.byModel||{}).map(([k,v])=><div key={k} className="text-center p-4 bg-gray-50 rounded"><p className="text-2xl font-bold">{v as number}</p><p className="text-sm text-gray-500 capitalize">{k}</p></div>)}</div></div>
          )}

          {/* Videos */}
          {tab === 'videos' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="card"><h3 className="font-semibold mb-3">By Provider ({videos.total})</h3>{Object.entries(videos.byProvider||{}).map(([k,v])=><Bar key={k} label={k} value={v as number} max={maxBar(videos.byProvider)} color="bg-purple-500"/>)}</div>
              <div className="card"><h3 className="font-semibold">Stats</h3><p className="text-2xl mt-2">{videos.totalDuration}s</p><p className="text-sm text-gray-500">Total duration</p><p className="text-lg mt-2">Success: <strong className="text-green-500">{videos.successRate}%</strong></p></div>
            </div>
          )}

          {/* Localization */}
          {tab === 'localization' && (
            <div className="card"><h3 className="font-semibold mb-3">By Country ({loc.total})</h3><div className="grid grid-cols-5 gap-3">{Object.entries(loc.byCountry||{}).map(([k,v])=><div key={k} className="text-center p-3 bg-gray-50 rounded"><p className="text-xl font-bold">{v as number}</p><p className="text-xs text-gray-500">{k}</p></div>)}</div></div>
          )}

          {/* Post Production */}
          {tab === 'post-production' && (
            <div className="grid grid-cols-4 gap-4">
              {[{l:'Total',v:pp.total},{l:'Subtitle',v:pp.withSubtitle},{l:'CTA',v:pp.withCta},{l:'Logo',v:pp.withLogo},{l:'BGM',v:pp.withBgm}].map(s=><div key={s.l} className="card text-center"><p className="text-2xl font-bold">{s.v??'-'}</p><p className="text-xs text-gray-500">{s.l}</p></div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
