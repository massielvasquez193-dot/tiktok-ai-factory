'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { FolderKanban, Plus, Archive, Trash2, Play, FileText, Video, X } from 'lucide-react';

export default function AIProjectsPage() {
  const { token } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('active');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success && d.data[0]) { setWs(d.data[0]); loadProjects(d.data[0].id); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function loadProjects(wsId: string) {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/ai/projects${filter !== 'all' ? `?status=${filter}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) setProjects(d.data);
    } catch {}
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/ai/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, description }) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setShowCreate(false); setName(''); setDescription(''); loadProjects(ws.id);
    } catch (err: any) { setMsg(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete project?')) return;
    await fetch(`/api/workspaces/${ws.id}/ai/projects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadProjects(ws.id);
  }

  async function handleArchive(id: string) {
    await fetch(`/api/workspaces/${ws.id}/ai/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: 'archived' }) });
    loadProjects(ws.id);
  }

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><FolderKanban size={24}/> AI Projects</h2><p className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> New Project</button>
      </div>
      {msg && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{msg}</div>}
      <div className="flex gap-2 mb-4">{['active','all','archived'].map(f => <button key={f} onClick={() => { setFilter(f); setTimeout(() => loadProjects(ws.id), 0); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}</div>
      {showCreate && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">New Project</h3><button onClick={() => setShowCreate(false)}><X size={16}/></button></div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Summer 2026 Campaign" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={2} placeholder="Project description..." /></div>
            <div className="flex gap-3"><button type="submit" className="btn-primary">Create</button><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}
      {projects.length === 0 ? (
        <div className="card text-center py-12"><FolderKanban size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500">No projects yet</p><p className="text-sm text-gray-400 mt-1">Create your first AI project to get started</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3"><div><h3 className="font-semibold text-gray-900">{p.name}</h3><p className="text-xs text-gray-500 mt-0.5">{p.description || 'No description'}</p></div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span></div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3"><span className="flex items-center gap-1"><FileText size={12}/>{p.scriptCount} scripts</span><span className="flex items-center gap-1"><Video size={12}/>{p.videoCount} videos</span></div>
              <div className="flex gap-2"><button className="text-xs px-3 py-1 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 flex items-center gap-1"><Play size={12}/>Open</button><button onClick={() => handleArchive(p.id)} className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1"><Archive size={12}/>Archive</button><button onClick={() => handleDelete(p.id)} className="text-xs px-3 py-1 text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-1"><Trash2 size={12}/></button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
