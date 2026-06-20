'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, DollarSign, ShoppingCart, Globe, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TikTokConnectorPage() {
  const [data, setData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setL] = useState(true);

  const load = () => {
    Promise.all([
      fetch('/api/tiktok-connector/overview').then(r => r.json()).catch(() => null),
      fetch('/api/tiktok-connector/metrics').then(r => r.json()).catch(() => []),
    ]).then(([d, m]) => { setData(d); setMetrics(m); setL(false); });
  };
  useEffect(() => { load(); }, []);

  const sync = async () => { await fetch('/api/tiktok-connector/sync', { method: 'POST' }); load(); };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!data) return <div className="text-center py-20 text-gray-400">No data — click Sync</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Zap size={24}/> TikTok Connector</h2><p className="text-gray-500 text-sm">Auto-sync: TikTok Shop · Ads · Business — Daily</p></div>
        <button onClick={sync} className="btn-primary flex items-center gap-2"><RefreshCw size={14}/> Sync Now</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[{l:'Revenue',v:'$'+data.totalRevenue?.toLocaleString(),icon:DollarSign,c:'bg-green-50 text-green-700'},{l:'Orders',v:data.totalOrders?.toLocaleString(),icon:ShoppingCart,c:'bg-blue-50 text-blue-700'},{l:'Ad Spend',v:'$'+data.totalSpend?.toLocaleString(),icon:TrendingUp,c:'bg-yellow-50 text-yellow-700'},{l:'ROI',v:data.roi,icon:Globe,c:'bg-purple-50 text-purple-700'}].map(s=>(
          <div key={s.l} className={`card text-center ${s.c}`}><s.icon size={20} className="mx-auto mb-2"/><p className="text-2xl font-bold">{s.v}</p><p className="text-xs mt-1 opacity-70">{s.l}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm">By Country</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byCountry||[]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Bar dataKey="revenue" fill="#10b981" name="Revenue"/></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm">Recent Metrics</h3>
          {metrics.slice(0,10).map((m:any,i:number)=>(
            <div key={i} className="flex justify-between py-1.5 border-b text-xs">
              <span>{m.country}</span>
              <span className="font-mono">Orders:{m.orders} Rev:${m.revenue?.toLocaleString()} GMV:${m.gmv?.toLocaleString()} CTR:{m.ctr}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
