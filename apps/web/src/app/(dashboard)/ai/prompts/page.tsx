'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Library, Plus, Star, Copy, Trash2, Search, X, Check } from 'lucide-react';

export default function PromptLibraryPage() {
  const { token } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tab, setTab] = useState<'saved' | 'templates'>('saved');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  // Form
  const [pname, setPname] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  const [model, setModel] = useState('seedance');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success && d.data[0]) { setWs(d.data[0]); loadData(d.data[0].id); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function loadData(wsId: string) {
    try {
      const [pr, tm] = await Promise.all([
        fetch(`/api/workspaces/${wsId}/ai/prompts${search ? `?search=${search}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`/api/workspaces/${wsId}/ai/templates`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      if (pr.success) setPrompts(pr.data);
      if (tm.success) setTemplates(tm.data);
    } catch {}
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/ai/prompts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: pname, prompt, negativePrompt: negPrompt, model, category, tags: tags.split(',').map(t => t.trim()).filter(Boolean) }) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setShowCreate(false); setPname(''); setPrompt(''); loadData(ws.id);
    } catch (err: any) { setMsg(err.message); }
  }

  async function toggleFav(id: string) {
    await fetch(`/api/workspaces/${ws.id}/ai/prompts/${id}/favorite`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/workspaces/${ws.id}/ai/prompts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadData(ws.id);
  }

  function copyToClipboard(text: string) { navigator.clipboard.writeText(text); setMsg('Copied!'); setTimeout(() => setMsg(''), 2000); }

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Library size={24}/> Prompt Library</h2><p className="text-sm text-gray-500">{prompts.length} saved · {templates.length} templates</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Save Prompt</button>
      </div>
      {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg === 'Copied!' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['saved','templates'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium ${tab === t ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t === 'saved' ? 'Saved Prompts' : 'Templates'}</button>)}
        </div>
        <div className="relative flex-1 max-w-xs"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input value={search} onChange={e => { setSearch(e.target.value); setTimeout(() => ws && loadData(ws.id), 300); }} placeholder="Search prompts..." className="input text-sm pl-9 h-9" /></div>
      </div>

      {showCreate && (
        <div className="card mb-6"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Save Prompt</h3><button onClick={() => setShowCreate(false)}><X size={16}/></button></div>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium mb-1">Name</label><input value={pname} onChange={e => setPname(e.target.value)} className="input text-sm" required /></div><div><label className="block text-xs font-medium mb-1">Model</label><select value={model} onChange={e => setModel(e.target.value)} className="input text-sm"><option value="seedance">Seedance</option><option value="kling">Kling</option><option value="veo">Veo</option></select></div></div>
            <div><label className="block text-xs font-medium mb-1">Prompt</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="input text-sm" rows={3} required /></div>
            <div><label className="block text-xs font-medium mb-1">Negative Prompt</label><input value={negPrompt} onChange={e => setNegPrompt(e.target.value)} className="input text-sm" /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium mb-1">Category</label><select value={category} onChange={e => setCategory(e.target.value)} className="input text-sm"><option value="general">General</option><option value="hook">Hook</option><option value="demo">Demo</option><option value="cta">CTA</option></select></div><div><label className="block text-xs font-medium mb-1">Tags (comma)</label><input value={tags} onChange={e => setTags(e.target.value)} className="input text-sm" placeholder="ugc, beauty, 720p" /></div></div>
            <div className="flex gap-3"><button type="submit" className="btn-primary text-sm">Save</button><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button></div>
          </form>
        </div>
      )}

      {tab === 'saved' ? (
        prompts.length === 0 ? <div className="card text-center py-12"><Library size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500">No saved prompts</p></div> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between mb-2"><p className="font-medium text-gray-900 text-sm">{p.name}</p><button onClick={() => toggleFav(p.id)} className={p.isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}><Star size={14} fill={p.isFavorite ? 'currentColor' : 'none'} /></button></div>
              <p className="text-xs text-gray-600 mb-2 line-clamp-3 font-mono bg-gray-50 p-2 rounded">{p.prompt}</p>
              <div className="flex items-center justify-between"><div className="flex gap-1"><span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.model}</span><span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.category}</span></div><div className="flex gap-1"><button onClick={() => copyToClipboard(p.prompt)} className="p-1 text-gray-400 hover:text-brand-500"><Copy size={12}/></button><button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={12}/></button></div></div>
            </div>
          ))}
        </div>
      ) : (
        templates.length === 0 ? <div className="card text-center py-12"><Library size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500">No templates created</p></div> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="card"><div className="flex items-start justify-between mb-2"><p className="font-medium text-gray-900 text-sm">{t.name}</p><span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{t.category}</span></div><p className="text-xs text-gray-600 line-clamp-3 font-mono bg-gray-50 p-2 rounded mb-2">{t.content}</p><div className="flex items-center gap-2 text-xs text-gray-500"><span>{t.usageCount} uses</span><span>·</span><span>{t.language}</span>{t.isPublic && <span className="text-green-600">· Public</span>}{t.isOfficial && <span className="text-brand-600">· Official</span>}</div></div>
          ))}
        </div>
      )}
    </div>
  );
}
