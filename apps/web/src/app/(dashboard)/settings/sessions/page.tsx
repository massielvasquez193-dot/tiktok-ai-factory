'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Shield, Monitor, Smartphone, X, AlertCircle } from 'lucide-react';

interface Session { id: string; ipAddress: string | null; userAgent: string | null; createdAt: string; expires: string; }

export default function SessionsPage() {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/auth/sessions', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) setSessions(d.data);
      else setError(d.error || 'Failed to load');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function revoke(id: string) {
    try {
      await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) { setError(err.message); }
  }

  useEffect(() => { load(); }, [token]);

  if (!user) return null;

  function formatTime(ts: string) { return new Date(ts).toLocaleString(); }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1">Active Sessions</h2>
      <p className="text-sm text-gray-500 mb-6">Manage your active login sessions</p>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
      {loading ? <div className="text-gray-400 text-sm">Loading sessions...</div> : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Monitor size={18} className="text-gray-500"/></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.userAgent?.split(' ').slice(0,3).join(' ') || 'Unknown device'}</p>
                  <p className="text-xs text-gray-500">IP: {s.ipAddress || 'Unknown'} · Created: {formatTime(s.createdAt)}</p>
                </div>
              </div>
              <button onClick={() => revoke(s.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Revoke session"><X size={16}/></button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No active sessions</p>}
        </div>
      )}
    </div>
  );
}
