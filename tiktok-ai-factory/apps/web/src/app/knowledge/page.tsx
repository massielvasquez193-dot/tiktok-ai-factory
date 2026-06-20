'use client';
import { useEffect, useState } from 'react';
import { Database, TrendingUp, Zap, Lightbulb, Puzzle, Target, Film, Download, Upload, Search, BarChart3 } from 'lucide-react';
import { useTranslation } from '@/i18n';

const TABS = ['dashboard','hooks','pains','solutions','ctas','structures','prompts'];
const LABELS: Record<string,string> = {dashboard:'Insights',hooks:'Hook Library',pains:'Pain Points',solutions:'Solutions',ctas:'CTA Library',structures:'Scene Structures',prompts:'Prompt Library'};

export default function KnowledgePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState<Record<string,any>>({});
  const [stats, setStats] = useState<any>({counts:{},topHooks:[],topCtas:[],topStructures:[],topPrompts:[]});
  const [loading, setL] = useState(true);
  const [search, setSearch] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fCat, setFCat] = useState('');
  const [sort, setSort] = useState('score');

  const load = async (t: string) => {
    setL(true);
    const [s, d] = await Promise.all([
      fetch('/api/knowledge/stats').then(r => r.json()).catch(() => ({counts:{}})),
      t !== 'dashboard' ? fetch(`/api/knowledge/${t}?search=${search}&country=${fCountry}&category=${fCat}&sort=${sort}`).then(r => r.json()).catch(() => ({items:[],total:0})) : Promise.resolve({items:[],total:0}),
    ]);
    setStats(s); setData(prev => ({...prev, [t]: d})); setL(false);
  };
  useEffect(() => { load(tab); }, [tab, search, fCountry, fCat, sort]);

  const seed = async () => { await fetch('/api/knowledge/seed',{method:'POST'}); load(tab); };

  const StatCard = ({label,value,icon:Icon,color}:any) => (
    <div className="card text-center">
      <Icon size={20} className={`mx-auto mb-2 ${color}`} />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );

  const ScoreBadge = ({score}:any) => (
    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ml-2 ${score>=80?'bg-green-100 text-green-700':score>=60?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{score}</span>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Database size={24} /> {t('menu.knowledge')}</h2><p className="text-gray-500 text-sm">{t('desc.knowledge')}</p></div>
        <div className="flex gap-2">
          <button onClick={seed} className="btn-secondary text-sm">{t('button.seedData')}</button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${tab===t?'bg-brand-500 text-white':'bg-gray-100 text-gray-600'}`}>{LABELS[t]}</button>)}
      </div>

      {/* Filters */}
      {tab !== 'dashboard' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative"><Search size={14} className="absolute left-2 top-2 text-gray-400" /><input className="input text-xs py-1.5 pl-7 w-48" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <select className="input text-xs py-1.5 w-24" value={fCountry} onChange={e=>setFCountry(e.target.value)}><option value="">All</option>{'US,MY,TH,PH,VN,ID'.split(',').map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select className="input text-xs py-1.5 w-28" value={fCat} onChange={e=>setFCat(e.target.value)}><option value="">All</option>{'Skincare,Kitchen,Supplements,Fashion,Electronics'.split(',').map(c=><option key={c} value={c}>{c}</option>)}</select>
          <select className="input text-xs py-1.5 w-24" value={sort} onChange={e=>setSort(e.target.value)}><option value="score">By Score</option><option value="recent">Recent</option></select>
          <span className="text-xs text-gray-400 ml-auto">{data[tab]?.total || 0} results</span>
        </div>
      )}

      {loading ? <p className="text-center py-12">Loading...</p> : (
        <>
          {tab === 'dashboard' && (
            <div>
              <div className="grid grid-cols-7 gap-3 mb-6">
                <StatCard label={t('knowledge.hooks')} value={stats.counts?.hooks} icon={Zap} color="text-yellow-500" />
                <StatCard label={t('knowledge.pains')} value={stats.counts?.pains} icon={Lightbulb} color="text-red-500" />
                <StatCard label={t('knowledge.solutions')} value={stats.counts?.solutions} icon={Lightbulb} color="text-blue-500" />
                <StatCard label={t('knowledge.ctas')} value={stats.counts?.ctas} icon={Target} color="text-green-500" />
                <StatCard label={t('knowledge.structures')} value={stats.counts?.structures} icon={Puzzle} color="text-purple-500" />
                <StatCard label={t('knowledge.prompts')} value={stats.counts?.prompts} icon={Film} color="text-orange-500" />
                <StatCard label={t('knowledge.videos')} value={stats.counts?.videos} icon={TrendingUp} color="text-pink-500" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="card"><h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Zap size={16} className="text-yellow-500"/> {t('knowledge.topHooks')}</h3>{stats.topHooks?.map((h:any,i:number)=><div key={i} className="flex justify-between py-1.5 border-b text-sm"><span className="truncate">{h.hook}</span><ScoreBadge score={h.viralScore}/></div>)}</div>
                <div className="card"><h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Target size={16} className="text-green-500"/> {t('knowledge.topCtas')}</h3>{stats.topCtas?.map((c:any,i:number)=><div key={i} className="flex justify-between py-1.5 border-b text-sm"><span>{c.cta}</span><ScoreBadge score={c.viralScore}/></div>)}</div>
                <div className="card"><h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Puzzle size={16} className="text-purple-500"/> {t('knowledge.topStructures')}</h3>{stats.topStructures?.map((s:any,i:number)=><div key={i} className="flex justify-between py-1.5 border-b text-sm"><span className="truncate">{s.structureName}</span><ScoreBadge score={s.viralScore}/></div>)}</div>
                <div className="card"><h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Film size={16} className="text-orange-500"/> {t('knowledge.topPrompts')}</h3>{stats.topPrompts?.map((p:any,i:number)=><div key={i} className="flex justify-between py-1.5 border-b text-sm"><span className="truncate">{p.provider} — {p.prompt?.slice(0,40)}</span><ScoreBadge score={p.viralScore}/></div>)}</div>
              </div>
            </div>
          )}

          {tab !== 'dashboard' && (
            <div className="space-y-2">
              {(data[tab]?.items || []).map((item:any, i:number) => (
                <div key={item.id || i} className="card flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.hook || item.painPoint || item.solution || item.cta || item.structureName || item.prompt?.slice(0,80)}</p>
                    <div className="flex gap-2 mt-1 text-xs text-gray-400">
                      {item.country && <span>{item.country}</span>}
                      {item.category && <span className="bg-gray-100 px-1 rounded">{item.category}</span>}
                      {item.language && <span>{item.language}</span>}
                      {item.provider && <span className="font-mono">{item.provider}</span>}
                    </div>
                  </div>
                  <ScoreBadge score={item.viralScore}/>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
