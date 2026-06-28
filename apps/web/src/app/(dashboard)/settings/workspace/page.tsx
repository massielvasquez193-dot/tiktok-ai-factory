'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Building2, Globe, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export default function WorkspaceSettingsPage() {
  const { token } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.success && d.data.length > 0) { setWs(d.data[0]); setName(d.data[0].name); setSlug(d.data[0].slug); }
      }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/workspaces/${ws.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, slug }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setWs(d.data); setSuccess('Workspace updated');
    } catch (err: any) { setError(err.message); }
  }

  async function handleDelete() {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/workspaces/${ws.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).error);
      window.location.href = '/';
    } catch (err: any) { setError(err.message); }
  }

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;
  if (!ws) return <div className="text-gray-400 py-8">No workspace found. Create one first.</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1">Workspace Settings</h2>
      <p className="text-sm text-gray-500 mb-6">Manage your workspace configuration</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700"><CheckCircle size={16}/>{success}</div>}

      <form onSubmit={handleSave} className="space-y-4 card">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center"><Building2 size={24}/></div>
          <div><p className="font-medium text-gray-900">{ws.name}</p><p className="text-xs text-gray-500">Created {new Date(ws.createdAt).toLocaleDateString()} · {ws.memberCount} members · {ws.role} role</p></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Workspace Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="input" required/></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug</label><div className="relative"><Globe size={16} className="absolute left-3 top-3 text-gray-400"/><input type="text" value={slug} onChange={e => setSlug(e.target.value)} className="input pl-10" required/></div><p className="text-xs text-gray-400 mt-1">Used in URLs: tiktok-ai-factory.com/workspace/{slug || 'your-slug'}</p></div>
        <button type="submit" className="btn-primary">Save changes</button>
      </form>

      <div className="card mt-6 border-red-200 bg-red-50">
        <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Danger Zone</h3>
        <p className="text-sm text-red-600 mb-4">Deleting your workspace will remove all associated data including videos, scripts, and campaigns. This action cannot be undone.</p>
        <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Delete Workspace</button>
      </div>
    </div>
  );
}
