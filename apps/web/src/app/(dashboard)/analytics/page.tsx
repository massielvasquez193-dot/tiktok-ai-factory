'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { BarChart3, TrendingUp, Eye, Heart, MessageCircle, Share2, MousePointerClick, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4F46E5','#7C3AED','#06B6D4','#F59E0B','#10B981'];

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch('/api/ceo-dashboard/overview', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/performance', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([overview, perf]) => {
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const mockViews = [{date:'Mon',views:1200},{date:'Tue',views:2300},{date:'Wed',views:1800},{date:'Thu',views:2900},{date:'Fri',views:3500},{date:'Sat',views:4100},{date:'Sun',views:3800}];
  const mockEngagement = [{name:'Likes',value:450},{name:'Comments',value:120},{name:'Shares',value:89},{name:'Saves',value:210}];

  if (loading) return <div className="text-gray-400 py-8">Loading analytics...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={24}/> Analytics</h2><p className="text-sm text-gray-500">Video performance & engagement</p></div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['7d','30d','90d','all'].map(p => (
            <button key={p} onClick={()=>setPeriod(p)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${period===p?'bg-white shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{p==='all'?'All':p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          {label:'Total Views',value:'24.5K',icon:Eye,color:'bg-blue-50 text-blue-700'},
          {label:'Engagement',value:'8.2%',icon:Heart,color:'bg-pink-50 text-pink-700'},
          {label:'CTR',value:'3.5%',icon:MousePointerClick,color:'bg-purple-50 text-purple-700'},
          {label:'Revenue',value:'$1,240',icon:DollarSign,color:'bg-green-50 text-green-700'},
        ].map(s => (
          <div key={s.label} className="card"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}><s.icon size={20}/></div><div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p></div></div></div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card"><h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16}/> Views Over Time</h3><ResponsiveContainer width="100%" height={250}><LineChart data={mockViews}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="date" stroke="#9ca3af" fontSize={12}/><YAxis stroke="#9ca3af" fontSize={12}/><Tooltip/><Line type="monotone" dataKey="views" stroke="#4F46E5" strokeWidth={2} dot={{fill:'#4F46E5'}}/></LineChart></ResponsiveContainer></div>
        <div className="card"><h3 className="font-semibold mb-4 flex items-center gap-2"><Activity size={16}/> Engagement Breakdown</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={mockEngagement} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name,value})=>`${name}: ${value}`}><Cell fill={COLORS[0]}/><Cell fill={COLORS[1]}/><Cell fill={COLORS[2]}/><Cell fill={COLORS[3]}/></Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      </div>

      <div className="card text-center py-8">
        <BarChart3 size={40} className="mx-auto text-gray-300 mb-3"/>
        <h3 className="font-semibold text-gray-700">Advanced Analytics</h3>
        <p className="text-sm text-gray-400 mt-1">Real-time performance data, conversion tracking, and AI-powered insights coming in next release.</p>
      </div>
    </div>
  );
}
