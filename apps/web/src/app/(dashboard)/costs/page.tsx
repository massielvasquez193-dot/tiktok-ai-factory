'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DollarSign, Cpu, Zap, TrendingDown, CreditCard, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CostsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30d');

  const providerCosts = [
    { name:'DeepSeek', cost:8.20, color:'#4F46E5' },
    { name:'Seedance', cost:42.00, color:'#7C3AED' },
    { name:'Kling', cost:15.30, color:'#F59E0B' },
    { name:'ElevenLabs', cost:3.50, color:'#10B981' },
    { name:'OpenAI', cost:2.10, color:'#06B6D4' },
  ];

  const categoryCosts = [
    { name:'Videos', cost:57.30 },
    { name:'Scripts', cost:5.80 },
    { name:'TTS', cost:3.50 },
    { name:'Research', cost:2.10 },
    { name:'Publishing', cost:2.40 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><DollarSign size={24}/> AI Cost Center</h2><p className="text-sm text-gray-500">Track your AI spending across providers</p></div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['7d','30d','90d'].map(p=><button key={p} onClick={()=>setPeriod(p)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${period===p?'bg-white shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{p}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          {label:'Total Cost',value:'$71.10',icon:DollarSign,color:'bg-yellow-50 text-yellow-700'},
          {label:'Credits Used',value:'890',icon:Zap,color:'bg-purple-50 text-purple-700'},
          {label:'Avg/Video',value:'$1.42',icon:TrendingDown,color:'bg-green-50 text-green-700'},
          {label:'Est Monthly',value:'$85',icon:TrendingDown,color:'bg-blue-50 text-blue-700'},
        ].map(s=>(
          <div key={s.label} className="card"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}><s.icon size={20}/></div><div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p></div></div></div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card"><h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu size={16}/> Cost by Provider</h3><ResponsiveContainer width="100%" height={250}><BarChart data={providerCosts} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis type="number" stroke="#9ca3af" fontSize={12} tickFormatter={v=>`$${v}`}/><YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={90}/><Tooltip formatter={v=>[`$${v}`, 'Cost']}/><Bar dataKey="cost" radius={[0,4,4,0]}>{providerCosts.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="card"><h3 className="font-semibold mb-4 flex items-center gap-2"><CreditCard size={16}/> Cost by Category</h3><ResponsiveContainer width="100%" height={250}><BarChart data={categoryCosts}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="name" stroke="#9ca3af" fontSize={12}/><YAxis stroke="#9ca3af" fontSize={12} tickFormatter={v=>`$${v}`}/><Tooltip formatter={v=>[`$${v}`, 'Cost']}/><Bar dataKey="cost" fill="#4F46E5" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      </div>

      <div className="card text-center py-8"><DollarSign size={40} className="mx-auto text-gray-300 mb-3"/><h3 className="font-semibold text-gray-700">Cost Reports</h3><p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">Monthly cost reports and detailed provider analytics are generated at the end of each billing period.</p><button className="btn-secondary mt-4 flex items-center gap-2 mx-auto"><Download size={14}/>Export Report (CSV)</button></div>
    </div>
  );
}
