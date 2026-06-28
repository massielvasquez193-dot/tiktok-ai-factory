'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Key, Plus, Copy, X, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function ApiKeysPage() {
  const { token } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setKeys(d.providers || []); }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      const res = await fetch('/api/providers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: keyName, type: 'api_key' }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setNewKey(d.data?.key || 'key-created');
      setKeyName(''); setShowCreate(false);
    } catch (err: any) { setError(err.message); }
  }

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><Key size={24}/> API Keys</h2><p className="text-sm text-gray-500">Manage API access to your workspace</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Create Key</button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}

      {newKey && (
        <div className="card mb-6 border-brand-200 bg-brand-50">
          <div className="flex items-center justify-between mb-2"><h3 className="font-semibold text-brand-800 flex items-center gap-2"><Key size={16}/> Key Created</h3><button onClick={()=>setNewKey(null)}><X size={16}/></button></div>
          <p className="text-sm text-brand-700 mb-2">Copy this key now. You won't be able to see it again.</p>
          <div className="flex items-center gap-2"><input type="text" value={newKey} readOnly className="input flex-1 font-mono text-sm bg-white"/><button onClick={()=>navigator.clipboard.writeText(newKey)} className="btn-secondary flex items-center gap-1"><Copy size={14}/>Copy</button></div>
        </div>
      )}

      {showCreate && (
        <div className="card mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label><input type="text" value={keyName} onChange={e=>setKeyName(e.target.value)} className="input" placeholder="My API Key" required/></div>
            <div className="flex gap-3"><button type="submit" className="btn-primary">Create</button><button type="button" onClick={()=>setShowCreate(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="card text-center py-12">
        <Key size={40} className="mx-auto text-gray-300 mb-3"/>
        <p className="text-gray-500 font-medium">API Key management coming in Sprint 3</p>
        <p className="text-sm text-gray-400 mt-1">Full API key generation, scoping, and rate limiting</p>
      </div>
    </div>
  );
}
