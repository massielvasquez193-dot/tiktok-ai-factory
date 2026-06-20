'use client';
import { useEffect, useState, useCallback } from 'react';
import { ago, fmt } from '@/lib/utils';
import { Play, RefreshCw, Trash2, Download, AlertTriangle, CheckCircle, Clock, Loader2, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n';

const MODELS = ['seedance', 'kling', 'veo', 'runway'];

export default function VideoQueuePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [promptsByProduct, setPromptsByProduct] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('seedance');

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([
      fetch('/api/video-tasks').then(r => r.json()).catch(() => []),
      fetch('/api/prompts').then(r => r.json()).catch(() => []),
    ]);
    setTasks(t);
    setPrompts(p);
    // Group prompts by product
    const grouped: Record<string, any[]> = {};
    for (const prompt of p) {
      const key = prompt.storyboard?.script?.product?.product_name || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(prompt);
    }
    setPromptsByProduct(grouped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll for pending/running tasks
  useEffect(() => {
    const active = tasks.some(t => t.status === 'pending' || t.status === 'running');
    if (!active) return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [tasks, load]);

  const createTask = async (promptId: string, model: string) => {
    await fetch('/api/video-tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId, model }),
    });
    load();
  };

  const createBulk = async (promptIds: string[], model: string) => {
    await fetch('/api/video-tasks/create-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptIds, model }),
    });
    load();
  };

  const retry = async (id: string) => {
    await fetch(`/api/video-tasks/${id}/retry`, { method: 'POST' });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/video-tasks/${id}`, { method: 'DELETE' });
    load();
  };

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle size={14} className="text-green-500" />;
    if (s === 'running' || s === 'pending') return <Loader2 size={14} className="text-blue-500 animate-spin" />;
    if (s === 'failed') return <AlertTriangle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-gray-400" />;
  };

  const counts = { total: tasks.length, completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'running').length,
    failed: tasks.filter(t => t.status === 'failed').length };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Video Queue</h2>
        <p className="text-gray-500 text-sm">Manage AI video generation tasks</p>
      </div>

      {/* Create */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Play size={18} /> Create Tasks</h3>

        {/* Pick a prompt */}
        {Object.keys(promptsByProduct).length === 0 ? (
          <p className="text-sm text-gray-400">Generate prompts first (see /prompts page)</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(promptsByProduct).map(([productName, productPrompts]) => (
              <div key={productName} className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">{productName} ({productPrompts.length} prompts)</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <select className="input text-xs w-28 py-1.5" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                    {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button onClick={() => {
                    const ids = productPrompts.filter((p: any) => p.model === selectedModel).map((p: any) => p.id);
                    if (ids.length) createBulk(ids, selectedModel);
                  }} className="btn-secondary text-xs py-1.5 px-3">Generate All {selectedModel}</button>
                  <span className="text-xs text-gray-400">or pick one:</span>
                  {productPrompts.slice(0, 8).map((p: any) => (
                    <button key={p.id} onClick={() => createTask(p.id, p.model)}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50 flex items-center gap-1">
                      Shot #{p.sceneNumber} <span className={`uppercase ${p.model === 'seedance' ? 'text-purple-500' : 'text-blue-500'}`}>{p.model}</span>
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
          { label: 'In Progress', value: counts.pending, color: 'bg-blue-50 text-blue-700' },
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
        <h3 className="font-semibold mb-4">Task List</h3>
        {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : tasks.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No tasks yet. Create one above.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {statusIcon(t.status)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase ${t.model === 'seedance' ? 'text-purple-500' : t.model === 'kling' ? 'text-blue-500' : t.model === 'veo' ? 'text-green-500' : 'text-orange-500'}`}>{t.model}</span>
                      <span className="text-sm truncate">{t.prompt?.storyboard?.script?.product?.product_name || '—'}</span>
                      <span className="text-xs text-gray-400">Shot #{t.prompt?.sceneNumber}</span>
                    </div>
                    {t.status === 'pending' || t.status === 'running' ? (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5 max-w-xs">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${t.progress || 10}%` }} />
                      </div>
                    ) : t.error ? (
                      <p className="text-xs text-red-500 mt-1 truncate">{t.error}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <span className="text-xs text-gray-400 w-16 text-right">{ago(t.createdAt)}</span>
                  {t.status === 'completed' && t.videoUrl && (
                    <a href={t.videoUrl} target="_blank" className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Download size={12} /> Download</a>
                  )}
                  {t.status === 'failed' && (
                    <button onClick={() => retry(t.id)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1 text-orange-500"><RefreshCw size={12} /> Retry</button>
                  )}
                  <button onClick={() => del(t.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
