'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Eye, Heart, MessageCircle, Share2, Globe, Sparkles, Lightbulb, Download, Search, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'];

export default function DataCenterPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<any>(null);
  const [videos, setVideos] = useState<any>({ items: [], total: 0 });
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [learning, setLearning] = useState<any[]>([]);
  const [loading, setL] = useState(true);
  const [page, setPage] = useState(1);

  const load = () => {
    Promise.all([
      fetch('/api/data-center/overview').then(r => r.json()).catch(() => null),
      fetch('/api/data-center/videos?page=' + page + '&limit=20&sort=views').then(r => r.json()).catch(() => ({ items: [], total: 0 })),
      fetch('/api/data-center/ai/insights').then(r => r.json()).catch(() => null),
      fetch('/api/data-center/learning').then(r => r.json()).catch(() => []),
    ]).then(([d, v, a, l]) => { setData(d); setVideos(v); setAiInsights(a); setLearning(l); setL(false); });
  };
  useEffect(() => { load(); }, [page]);

  const sync = async () => { await fetch('/api/data-center/sync', { method: 'POST' }); load(); };
  const learn = async () => { await fetch('/api/data-center/learn', { method: 'POST' }); load(); };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!data) return <div className="text-center py-20 text-gray-400">No data — click Sync to generate mock data</div>;

  const tabs = ['overview','videos','countries','trends','ai','learning'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={24}/> {t('menu.dataCenter') || 'Data Center'}</h2><p className="text-gray-500 text-sm">{data.totalVideos} videos · ${data.totalRevenue?.toFixed(0) || 0} revenue</p></div>
        <div className="flex gap-2">
          <button onClick={sync} className="btn-secondary text-sm flex items-center gap-1"><RefreshCw size={14}/> Sync Data</button>
          <button onClick={() => window.open('/api/data-center/videos?page=1&limit=100', '_blank')} className="btn-secondary text-sm flex items-center gap-1"><Download size={14}/> Export JSON</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full ${tab===t?'bg-brand-500 text-white':'bg-gray-100 text-gray-600'}`}>{t}</button>)}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[{l:'Total Views',v:data.totalViews,icon:Eye,c:'text-blue-500'},{l:'Likes',v:data.totalLikes,icon:Heart,c:'text-red-500'},{l:'Comments',v:data.totalComments,icon:MessageCircle,c:'text-green-500'},{l:'Shares',v:data.totalShares,icon:Share2,c:'text-purple-500'},{l:'GMV',v:'$'+(data.totalRevenue||0).toFixed(0),icon:DollarSign,c:'text-yellow-500'}].map(s=>(
          <div key={s.l} className="card flex items-center gap-3"><s.icon size={20} className={s.c}/><div><p className="text-xs text-gray-500">{s.l}</p><p className="text-lg font-bold">{s.v?.toLocaleString()}</p></div></div>
        ))}
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[{l:'CTR',v:data.avgCtr?.toFixed(1)+'%'},{l:'CVR',v:data.avgCvr?.toFixed(1)+'%'},{l:'ROAS',v:data.avgRoas?.toFixed(1)+'x'},{l:'Viral Rate',v:data.viralRate+'%'},{l:'Videos',v:data.totalVideos}].map(s=>(
          <div key={s.l} className="card text-center"><p className="text-2xl font-bold">{s.v}</p><p className="text-xs text-gray-500 mt-1">{s.l}</p></div>
        ))}
      </div>

      {/* Charts */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">View Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.viewTrend || []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2}/></LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.revenueTrend || []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98133"/></AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Videos Table */}
      {tab === 'videos' && (
        <div className="card">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-gray-500 uppercase"><th className="p-2 text-left">#</th><th className="p-2 text-left">Video</th><th className="p-2 text-right">Views</th><th className="p-2 text-right">Likes</th><th className="p-2 text-right">Comments</th><th className="p-2 text-right">Shares</th><th className="p-2 text-right">CTR</th><th className="p-2 text-right">CVR</th><th className="p-2 text-right">Revenue</th><th className="p-2 text-right">Score</th><th className="p-2 text-center">Grade</th></tr></thead>
            <tbody>
              {videos.items.map((v: any, i: number) => {
                const score = Math.round((v.views*0.4+v.likes*0.2+v.comments*0.15+v.shares*0.15+v.orders*0.1)/1000*10)/10;
                const grade = score>=90?'A+':score>=70?'A':score>=50?'B':score>=30?'C':'D';
                return <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-xs text-gray-400">{i+1}</td>
                  <td className="p-2 text-xs"><div className="truncate max-w-[200px]">{v.videoId?.slice(0,12)}</div><span className="text-gray-400">{v.country}</span></td>
                  <td className="p-2 text-xs text-right font-mono">{v.views?.toLocaleString()}</td>
                  <td className="p-2 text-xs text-right">{v.likes?.toLocaleString()}</td>
                  <td className="p-2 text-xs text-right">{v.comments?.toLocaleString()}</td>
                  <td className="p-2 text-xs text-right">{v.shares?.toLocaleString()}</td>
                  <td className="p-2 text-xs text-right">{v.ctr}%</td>
                  <td className="p-2 text-xs text-right">{v.cvr}%</td>
                  <td className="p-2 text-xs text-right font-mono">${v.revenue?.toFixed(0)}</td>
                  <td className="p-2 text-xs text-right font-bold">{score}</td>
                  <td className="p-2 text-center"><span className={`text-xs px-1.5 py-0.5 rounded font-bold ${grade==='A+'?'bg-green-100 text-green-700':grade==='A'?'bg-blue-100 text-blue-700':grade==='B'?'bg-yellow-100 text-yellow-700':grade==='C'?'bg-orange-100 text-orange-700':'bg-red-100 text-red-700'}`}>{grade}</span></td>
                </tr>;
              })}
            </tbody>
          </table>
          <div className="flex justify-center gap-4 mt-4"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="btn-secondary text-xs">Prev</button><span className="text-xs text-gray-500">Page {page}</span><button onClick={()=>setPage(p=>p+1)} disabled={page*20>=videos.total} className="btn-secondary text-xs">Next</button></div>
        </div>
      )}

      {/* Countries */}
      {tab === 'countries' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Country Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byCountry || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{data.byCountry?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Top Countries</h3>
            {(data.byCountry || []).map((c: any, i: number) => (
              <div key={i} className="flex justify-between py-2 border-b text-sm"><span>{c.name}</span><span className="font-mono font-bold">{c.value}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {tab === 'trends' && (
        <div className="grid grid-cols-1 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">7-Day Performance Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.viewTrend || []}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Bar dataKey="views" fill="#3b82f6" name="Views"/></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {tab === 'ai' && aiInsights && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Sparkles size={16} className="text-purple-500"/> AI Recommendations</h3>
            {aiInsights.recommendations?.map((r: string, i: number) => <div key={i} className="flex items-start gap-2 py-2 border-b text-sm"><span className="text-purple-500 font-bold">#{i+1}</span><span>{r}</span></div>)}
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm">Top Performing Videos</h3>
            {aiInsights.topVideos?.map((v: any, i: number) => (
              <div key={i} className="flex justify-between py-1.5 border-b text-sm"><span>{v.videoId}</span><span className={`text-xs px-1.5 py-0.5 rounded font-bold ${v.grade==='A+'?'bg-green-100 text-green-700':v.grade==='A'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{v.grade}</span><span className="font-mono">{v.score}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Learning */}
      {tab === 'learning' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Learning Insights ({learning.length})</h3>
            <button onClick={learn} className="btn-primary text-sm flex items-center gap-1"><Lightbulb size={14}/> Auto Learn</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {learning.map((l: any, i: number) => (
              <div key={i} className="card"><div className="flex items-center gap-2 mb-2"><span className="badge-blue text-xs">{l.type}</span><span className="text-xs text-gray-400">{l.country}</span></div><p className="text-xs text-gray-600">{l.content?.slice(0, 150)}</p><div className="flex justify-between mt-2 pt-2 border-t text-xs"><span>Score: {l.score}</span></div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
