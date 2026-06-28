'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Cpu, CheckCircle, XCircle, AlertTriangle, Activity, Shield, ArrowUpDown, Wifi, WifiOff, Zap } from 'lucide-react';

const ALL_PROVIDERS = [
  { key:'deepseek', type:'LLM', icon:'🧠', models:['deepseek-chat','deepseek-reasoner'], configured:true, status:'healthy', latency:120, uptime:'99.9%', region:'Global' },
  { key:'openai', type:'LLM', icon:'🤖', models:['gpt-4o','gpt-4o-mini'], configured:false, status:'available', latency:null, uptime:null, region:'Global' },
  { key:'claude', type:'LLM', icon:'🧪', models:['claude-opus-4-8','claude-sonnet-4-6'], configured:false, status:'available', latency:null, uptime:null, region:'Global' },
  { key:'gemini', type:'LLM', icon:'🌟', models:['gemini-2.5-pro','gemini-2.5-flash'], configured:false, status:'available', latency:null, uptime:null, region:'Global' },
  { key:'seedance', type:'Video', icon:'🎬', models:['doubao-seedance-2.0'], configured:true, status:'healthy', latency:2300, uptime:'95.2%', region:'Asia-Pacific' },
  { key:'kling', type:'Video', icon:'🎥', models:['kling-v2'], configured:true, status:'healthy', latency:800, uptime:'99.8%', region:'Asia-Pacific' },
  { key:'veo', type:'Video', icon:'🎞️', models:['veo-3'], configured:false, status:'available', latency:null, uptime:null, region:'Global' },
  { key:'runway', type:'Video', icon:'📽️', models:['gen-4'], configured:false, status:'available', latency:null, uptime:null, region:'Global' },
  { key:'elevenlabs', type:'TTS', icon:'🎙️', models:['eleven-multilingual-v2'], configured:false, status:'available', latency:null, uptime:null, region:'Global' },
  { key:'azure', type:'TTS', icon:'🔊', models:['azure-tts-neural'], configured:false, status:'available', latency:null, uptime:null, region:'Global' },
];

export default function ProviderHubPage() {
  const { token } = useAuth();
  const [providers, setProviders] = useState(ALL_PROVIDERS);
  const [selectedType, setSelectedType] = useState('all');
  const [ws, setWs] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.providers) {
          setProviders(prev => prev.map(p => {
            const api = d.providers.find((a:any) => a.name?.toLowerCase() === p.key);
            return { ...p, configured: !!api, apiInfo: api };
          }));
        }
      }).catch(() => {});
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success && d.data[0]) setWs(d.data[0]); }).catch(() => {});
  }, [token]);

  const filtered = selectedType === 'all' ? providers : providers.filter(p => p.type.toLowerCase() === selectedType.toLowerCase());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Cpu size={24}/> Provider Hub</h2><p className="text-sm text-gray-500">{providers.filter(p=>p.configured).length} configured · {providers.filter(p=>p.status==='healthy').length} healthy</p></div>
        <button className="btn-primary flex items-center gap-2"><Zap size={16}/> Test All Connections</button>
      </div>

      <div className="flex gap-2 mb-6">{['all','LLM','Video','TTS'].map(t => <button key={t} onClick={()=>setSelectedType(t.toLowerCase())} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedType===t.toLowerCase()?'bg-brand-500 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>)}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(p => (
          <div key={p.key} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icon}</span>
                <div><h3 className="font-semibold text-gray-900">{p.key.charAt(0).toUpperCase()+p.key.slice(1)}</h3><p className="text-xs text-gray-500">{p.type} · {p.models.join(', ')}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${p.status==='healthy'?'bg-green-500':p.status==='degraded'?'bg-yellow-500':'bg-gray-300'}`} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.configured?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{p.configured?'Configured':'Available'}</span>
              </div>
            </div>

            {p.configured && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-gray-500">Latency</p><p className="text-sm font-semibold text-gray-700">{p.latency ? `${p.latency}ms` : '—'}</p></div>
                <div><p className="text-xs text-gray-500">Uptime</p><p className="text-sm font-semibold text-gray-700">{p.uptime || '—'}</p></div>
                <div><p className="text-xs text-gray-500">Region</p><p className="text-sm font-semibold text-gray-700">{p.region || '—'}</p></div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button className={`flex-1 py-2 rounded-lg text-sm font-medium ${p.configured?'bg-gray-100 text-gray-700 hover:bg-gray-200':'bg-brand-500 text-white hover:bg-brand-600'}`}>{p.configured?'Reconfigure':'Set Up API Key'}</button>
              {p.configured && <button className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" title="Test connection"><Wifi size={14}/></button>}
              {p.configured && <button className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm" title="Toggle priority"><ArrowUpDown size={14}/></button>}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-6 text-center py-8">
        <Shield size={40} className="mx-auto text-gray-300 mb-3"/>
        <h3 className="font-semibold text-gray-700">Provider Routing & Failover</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Automatic provider failover, priority routing, and load balancing will be available when all providers are configured.</p>
      </div>
    </div>
  );
}
