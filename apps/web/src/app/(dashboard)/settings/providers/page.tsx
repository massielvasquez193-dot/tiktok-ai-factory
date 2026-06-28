'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Cpu, CheckCircle, XCircle, AlertTriangle, Zap, Activity } from 'lucide-react';

const PROVIDER_DEFS = [
  { name: 'DeepSeek', type: 'LLM', icon: '🧠', models: ['deepseek-chat', 'deepseek-reasoner'], status: 'active' },
  { name: 'OpenAI', type: 'LLM', icon: '🤖', models: ['gpt-4o', 'gpt-4o-mini'], status: 'available' },
  { name: 'Claude', type: 'LLM', icon: '🧪', models: ['claude-opus-4-8', 'claude-sonnet-4-6'], status: 'available' },
  { name: 'Seedance', type: 'Video', icon: '🎬', models: ['doubao-seedance-2.0'], status: 'active' },
  { name: 'Kling', type: 'Video', icon: '🎥', models: ['kling-v2'], status: 'active' },
  { name: 'Veo', type: 'Video', icon: '🎞️', models: ['veo-3'], status: 'available' },
  { name: 'ElevenLabs', type: 'TTS', icon: '🎙️', models: ['eleven-multilingual-v2'], status: 'available' },
];

export default function ProvidersPage() {
  const { token } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        const list = d.providers || [];
        setProviders(PROVIDER_DEFS.map(def => {
          const configured = list.find((p: any) => p.name?.toLowerCase() === def.name.toLowerCase());
          return { ...def, configured: !!configured, config: configured };
        }));
      }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><Cpu size={24}/> AI Providers</h2>
      <p className="text-sm text-gray-500 mb-6">Configure and monitor your AI provider connections</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map(p => (
          <div key={p.name} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.type} · {p.models.join(', ')}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.configured?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{p.configured?'Configured':'Available'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`flex items-center gap-1 ${p.status==='active'?'text-green-600':'text-gray-400'}`}>
                {p.status==='active'?<CheckCircle size={12}/>:<Activity size={12}/>}
                {p.status==='active'?'Connected':'Ready to connect'}
              </span>
            </div>
            <button className="mt-3 w-full py-2 text-sm font-medium text-brand-500 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">
              {p.configured ? 'Configure' : 'Set up API Key'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
