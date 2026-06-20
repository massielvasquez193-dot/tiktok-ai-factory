'use client';
import { useEffect, useState, useCallback } from 'react';
import { ago, fmt } from '@/lib/utils';
import { Play, RefreshCw, Trash2, Download, AlertTriangle, CheckCircle, Clock, Loader2, Zap, Settings, XCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function SeedanceProviderPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const load = useCallback(async () => {
    const [t, p, stats] = await Promise.all([
      fetch('/api/providers/seedance').then(r => r.json()).catch(() => []),
      fetch('/api/prompts').then(r => r.json()).catch(() => []),
      fetch('/api/providers/stats').then(r => r.json()).catch(() => ({})),
    ]);
    setTasks(t); setPrompts(p); setPollCount(stats.activePollers || 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-poll when tasks are active
  useEffect(() => {
    const active = tasks.some(t => t.status === 'submitted' || t.status === 'processing' || t.status === 'pending');
    if (!active) return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [tasks, load]);

  const create = async (promptId: string) => {
    await fetch('/api/providers/seedance/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId }),
    });
    load();
  };

  const createBulk = async (promptIds: string[]) => {
    await fetch('/api/providers/seedance/create-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptIds }),
    });
    load();
  };

  const retry = async (id: string) => {
    await fetch(`/api/providers/seedance/${id}/retry`, { method: 'POST' });
    load();
  };

  const cancel = async (id: string) => {
    await fetch(`/api/providers/seedance/${id}/cancel`, { method: 'POST' });
    load();
  };

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle size={14} className="text-green-500" />;
    if (s === 'processing' || s === 'submitted' || s === 'pending') return <Loader2 size={14} className="text-blue-500 animate-spin" />;
    if (s === 'failed') return <AlertTriangle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-gray-400" />;
  };

  const counts = {
    total: tasks.length, completed: tasks.filter(t => t.status === 'completed').length,
    active: tasks.filter(t => ['pending', 'submitted', 'processing'].includes(t.status)).length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  // Group prompts by product for easy batch creation
  const grouped: Record<string, any[]> = {};
  for (const p of prompts) {
    if (p.model !== 'seedance') continue;
    const key = p.storyboard?.script?.product?.product_name || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap size={24} className="text-purple-500" /> Seedance Provider
          </h2>
          <p className="text-gray-500 text-sm">Mock adapter for ByteDance Seedance 2.0 AI video generation</p>
        </div>
        <div className="flex items-center gap-3">
          {pollCount > 0 && (
            <span className="text-xs text-blue-500 bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> {pollCount} active
            </span>
          )}
          <span className="badge-yellow">Mock Mode</span>
        </div>
      </div>

      {/* Create */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Play size={18} /> Create Seedance Tasks</h3>
        {Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-gray-400">Generate Seedance prompts first (use /prompts with seedance model)</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([product, productPrompts]) => (
              <div key={product} className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">{product} ({productPrompts.length} prompts)</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => createBulk(productPrompts.map(p => p.id))} className="btn-primary text-xs py-1.5 px-3">
                    Generate All ({productPrompts.length})
                  </button>
                  {productPrompts.slice(0, 6).map(p => (
                    <button key={p.id} onClick={() => create(p.id)}
                      className="text-xs px-2 py-1 rounded border hover:bg-purple-50 hover:border-purple-300">
                      Shot #{p.sceneNumber}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.total, color: 'bg-gray-50' },
          { label: 'Completed', value: counts.completed, color: 'bg-green-50 text-green-700' },
          { label: 'In Progress', value: counts.active, color: 'bg-blue-50 text-blue-700' },
          { label: 'Failed', value: counts.failed, color: 'bg-red-50 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`card text-center ${s.color}`}>
            <p className="text-2xl font-bold">{loading ? '-' : s.value}</p>
            <p className="text-xs mt-1 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Task List */}
      <div className="card">
        <h3 className="font-semibold mb-4">Task History</h3>
        {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Zap size={32} className="mx-auto mb-2 opacity-30" />
            <p>No Seedance tasks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {statusIcon(t.status)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-purple-500 uppercase bg-purple-50 px-1.5 py-0.5 rounded">Seedance</span>
                      <span className="text-sm font-medium truncate">
                        {t.prompt?.storyboard?.script?.product?.product_name || 'Raw prompt'}
                      </span>
                      <span className="text-xs text-gray-400">Shot #{t.prompt?.sceneNumber}</span>
                      {t.externalTaskId && <span className="text-xs text-gray-300 font-mono">{t.externalTaskId}</span>}
                    </div>
                    {(t.status === 'pending' || t.status === 'submitted' || t.status === 'processing') && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-sm">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${t.progress}%` }} />
                      </div>
                    )}
                    {t.error && <p className="text-xs text-red-500 mt-1">{t.error}</p>}
                    {t.videoUrl && <p className="text-xs text-green-600 mt-1 truncate">Local: {t.videoUrl}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <span className={`badge-${t.status === 'completed' ? 'green' : t.status === 'failed' ? 'red' : 'blue'} text-xs`}>{t.status}</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{ago(t.createdAt)}</span>
                  {t.status === 'completed' && t.videoUrl && (
                    <a href={t.videoUrl} target="_blank" className="p-1.5 hover:bg-green-50 rounded text-gray-400 hover:text-green-500"><Download size={14} /></a>
                  )}
                  {(t.status === 'failed') && (
                    <button onClick={() => retry(t.id)} className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-500"><RefreshCw size={14} /></button>
                  )}
                  {(t.status === 'pending' || t.status === 'submitted' || t.status === 'processing') && (
                    <button onClick={() => cancel(t.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><XCircle size={14} /></button>
                  )}
                  {t.status === 'completed' && (
                    <button onClick={() => window.confirm('Delete?') && fetch(`/api/providers/seedance/${t.id}`, { method: 'DELETE' }).then(load)}
                      className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
