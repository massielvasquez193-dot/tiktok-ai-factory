'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Eye, Play, Send, Globe, Trophy, CheckCircle, AlertTriangle, Clock, Rocket, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'];

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setL] = useState(true);

  const load = () => { fetch('/api/ceo-dashboard/overview').then(r => r.json()).then(setData).catch(()=>{}).finally(()=>setL(false)); };
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading Dashboard...</div>;
  if (!data) return <div className="text-center py-20 text-gray-400">No data available</div>;
  const { live, providerStats, countryRanking, productRanking, recentVideos, recentPublishes, latestCampaigns } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={24}/> CEO Dashboard</h2><p className="text-gray-500 text-sm">Real-time · auto-refresh 30s</p></div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>Live</span>
          <span>{live.totalProducts} products · {live.totalScripts} scripts · {live.totalCampaigns} campaigns</span>
        </div>
      </div>

      {/* Top KPI */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          {l:'Today Videos',v:live.todayVideos,icon:Play,c:'bg-blue-50 text-blue-700'},
          {l:'Published',v:live.todayPublished,icon:Send,c:'bg-green-50 text-green-700'},
          {l:'Generated',v:live.todayGenerated,icon:Sparkles,c:'bg-purple-50 text-purple-700'},
          {l:'Revenue',v:'$'+live.todayRevenue,icon:DollarSign,c:'bg-yellow-50 text-yellow-700'},
          {l:'ROI',v:live.roi,icon:TrendingUp,c:'bg-emerald-50 text-emerald-700'},
          {l:'Success Rate',v:data.videoSuccessRate+'%',icon:CheckCircle,c:'bg-teal-50 text-teal-700'},
        ].map(s=>(
          <div key={s.l} className={`card text-center ${s.c}`}><s.icon size={20} className="mx-auto mb-2"/><p className="text-2xl font-bold">{s.v}</p><p className="text-xs opacity-70 mt-1">{s.l}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Country Ranking */}
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Globe size={16}/> Country Ranking</h3>
          {countryRanking?.map((c:any,i:number)=>(
            <div key={i} className="flex items-center gap-3 py-2 border-b">
              <span className="text-xs font-bold w-6">{i+1}</span>
              <span className="flex-1 text-sm">{c.name}</span>
              <span className="text-xs font-mono">{c.value}</span>
              <div className="w-20 bg-gray-100 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width:Math.min(c.value/(countryRanking[0]?.value||1)*100,100)+'%'}}/></div>
            </div>
          ))}
        </div>

        {/* Product Ranking */}
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Trophy size={16}/> Top Products</h3>
          {productRanking?.map((p:any,i:number)=>(
            <div key={i} className="flex items-center gap-3 py-2 border-b">
              <span className="text-xs font-bold w-6">{['🥇','🥈','🥉','4','5'][i]}</span>
              <span className="flex-1 text-sm truncate">{p.name}</span>
              <span className="text-xs font-mono">{p.value}</span>
            </div>
          ))}
        </div>

        {/* Provider Stats */}
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Layers size={16}/> Provider Success Rate</h3>
          {providerStats?.map((p:any,i:number)=>(
            <div key={i} className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span className="font-medium">{p.name}</span><span>{p.successRate}% ({p.completed}/{p.total})</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${p.name==='seedance'?'bg-purple-500':p.name==='kling'?'bg-blue-500':'bg-green-500'}`} style={{width:p.successRate+'%'}}/></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Videos */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Play size={16}/> Recent Generations</h3>
          {(recentVideos||[]).map((v:any,i:number)=>(
            <div key={i} className="flex justify-between py-1.5 border-b text-xs">
              <span className="truncate">{v.title||'Untitled'}</span>
              <span className="text-gray-400">{v.provider}·{v.duration}s</span>
            </div>
          ))}
        </div>

        {/* Recent Publishes */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Send size={16}/> Recent Publishes</h3>
          {(recentPublishes||[]).map((p:any,i:number)=>(
            <div key={i} className="flex justify-between py-1.5 border-b text-xs">
              <span className="truncate">{p.title}</span>
              <span className="text-gray-400">{p.country}</span>
            </div>
          ))}
        </div>

        {/* Latest Campaigns */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm flex items-center gap-2"><Rocket size={16}/> Latest Campaigns</h3>
          {(latestCampaigns||[]).map((c:any,i:number)=>(
            <div key={i} className="flex justify-between py-1.5 border-b text-xs">
              <span className="truncate">{c.name}</span>
              <span className={c.status==='completed'?'text-green-500':'text-gray-400'}>{c.status}·{c.totalVideos}v</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 text-xs text-gray-400">
        <span>Research: {live.totalResearch} items · Agents: {live.runningAgentCount} running · {live.completedToday} completed today</span>
        <span className="flex items-center gap-1"><RefreshCw size={10}/> Auto-refresh every 30s</span>
      </div>
    </div>
  );
}
