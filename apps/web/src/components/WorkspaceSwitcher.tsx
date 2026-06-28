'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';

interface Workspace { id: string; name: string; slug: string; role: string; memberCount: number; }

export function WorkspaceSwitcher() {
  const { token } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => { setActive(localStorage.getItem('active_workspace_id')); }, []);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setWorkspaces(d.data); }).catch(() => {});
  }, [token]);

  function select(id: string) { setActive(id); localStorage.setItem('active_workspace_id', id); setOpen(false); }

  const current = workspaces.find(w => w.id === active) || workspaces[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
        <Building2 size={16} className="text-gray-400 shrink-0"/>
        <span className="truncate flex-1 text-left">{current?.name || 'Select workspace'}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0"/>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30">
          {workspaces.map(w => (
            <button key={w.id} onClick={() => select(w.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-left">
              <Building2 size={16} className="text-gray-400 shrink-0"/>
              <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{w.name}</p><p className="text-xs text-gray-500">{w.memberCount} member{w.memberCount!==1?'s':''} · {w.role}</p></div>
              {w.id === (active || workspaces[0]?.id) && <Check size={14} className="text-brand-500 shrink-0"/>}
            </button>
          ))}
          <a href="/settings/workspace" className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-500 hover:bg-brand-50 border-t border-gray-100 mt-1"><Plus size={14}/> New workspace</a>
        </div>
      )}
    </div>
  );
}
