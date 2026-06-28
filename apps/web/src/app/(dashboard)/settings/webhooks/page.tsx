'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Webhook, Plus, Copy, Trash2, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';

const MOCK_WEBHOOKS = [
  { id:'1', name:'Video Complete', url:'https://api.example.com/webhook/video-ready', events:['video.completed'], status:'active', deliveries:142, failures:3 },
  { id:'2', name:'Script Ready', url:'https://api.example.com/webhook/script', events:['script.generated'], status:'active', deliveries:89, failures:0 },
];

export default function WebhooksPage() {
  const { token } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [webhooks] = useState(MOCK_WEBHOOKS);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Webhook size={24}/> Webhooks</h2><p className="text-sm text-gray-500">Configure webhook endpoints for real-time events</p></div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16}/> Add Webhook</button>
      </div>

      <div className="card mb-6 bg-purple-50 border-purple-200">
        <div className="flex items-center gap-3 mb-2"><ExternalLink size={18} className="text-purple-600"/><h3 className="font-semibold text-purple-800">API & Webhook Access</h3></div>
        <p className="text-sm text-purple-700 mb-3">Webhooks and public API access are available on Pro plans and above. Your API rate limit: 1000 req/min.</p>
        <div className="flex gap-3">
          <a href="/settings/api-keys" className="text-sm px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium">Manage API Keys →</a>
          <a href="/developers" className="text-sm px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium">API Docs ↗</a>
        </div>
      </div>

      <div className="space-y-3">
        {webhooks.map(w => (
          <div key={w.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${w.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}><Webhook size={20}/></div>
                <div><p className="font-medium text-gray-900">{w.name}</p><p className="text-xs text-gray-500 font-mono">{w.url}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs text-gray-500"><p>{w.deliveries} deliveries</p><p>{w.failures > 0 ? `${w.failures} failed` : 'All successful'}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{w.status}</span>
                <button className="p-1 text-gray-400 hover:text-gray-600"><RefreshCw size={14}/></button>
                <button className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
        {webhooks.length === 0 && <div className="card text-center py-12"><Webhook size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500">No webhooks configured</p></div>}
      </div>

      <div className="card mt-6">
        <h3 className="font-semibold mb-3">Available Events</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {['video.completed','video.failed','script.generated','storyboard.created','publishing.published','publishing.failed','credits.low','subscription.renewed'].map(e => (
            <div key={e} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm"><span className="w-2 h-2 rounded-full bg-brand-500"/><span className="font-mono text-xs">{e}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
