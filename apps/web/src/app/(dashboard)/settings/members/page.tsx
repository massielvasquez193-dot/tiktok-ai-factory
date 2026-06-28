'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Users, UserPlus, X, Shield, Mail, AlertCircle, CheckCircle, MoreVertical } from 'lucide-react';

interface Member { id: string; userId: string; userName: string; userEmail: string; role: string; status: string; joinedAt: string; }

const ROLES = ['admin', 'manager', 'editor', 'viewer'];

export default function MembersPage() {
  const { token, user } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.success && d.data[0]) { setWs(d.data[0]); loadMembers(d.data[0].id); }
      }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function loadMembers(wsId: string) {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) setMembers(d.data);
    } catch {}
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`${inviteEmail} has been invited as ${inviteRole}`);
      setInviteEmail(''); setShowInvite(false); loadMembers(ws.id);
    } catch (err: any) { setError(err.message); }
  }

  async function updateRole(memberId: string, role: string) {
    try { await fetch(`/api/workspaces/${ws.id}/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ role }) }); loadMembers(ws.id); }
    catch (err: any) { setError(err.message); }
  }

  async function removeMember(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from workspace?`)) return;
    try { await fetch(`/api/workspaces/${ws.id}/members/${memberId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); loadMembers(ws.id); }
    catch (err: any) { setError(err.message); }
  }

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;
  if (!ws) return <div className="text-gray-400 py-8">No workspace found.</div>;

  const isAdmin = ['owner', 'admin'].includes(ws.role);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><Users size={24}/> Members</h2><p className="text-sm text-gray-500">{members.length} member{members.length!==1?'s':''} in {ws.name}</p></div>
        {isAdmin && <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2"><UserPlus size={16}/> Invite Member</button>}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700"><CheckCircle size={16}/>{success}</div>}

      {showInvite && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Invite Member</h3><button onClick={()=>setShowInvite(false)}><X size={16}/></button></div>
          <form onSubmit={handleInvite} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><div className="relative"><Mail size={16} className="absolute left-3 top-3 text-gray-400"/><input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} className="input pl-10" placeholder="colleague@example.com" required/></div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} className="input"><option value="admin">Admin</option><option value="manager">Manager</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select></div>
            <div className="flex gap-3"><button type="submit" className="btn-primary">Send Invite</button><button type="button" onClick={()=>setShowInvite(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">{m.userName?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)}</div>
              <div>
                <p className="text-sm font-medium text-gray-900">{m.userName} {m.userId === user?.id && <span className="text-xs text-gray-400">(you)</span>}</p>
                <p className="text-xs text-gray-500">{m.userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role==='owner'?'bg-yellow-100 text-yellow-700':m.role==='admin'?'bg-purple-100 text-purple-700':m.role==='manager'?'bg-blue-100 text-blue-700':m.role==='editor'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{m.role}</span>
              {isAdmin && m.role !== 'owner' && (
                <div className="flex items-center gap-1">
                  <select value={m.role} onChange={e => updateRole(m.id, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <button onClick={()=>removeMember(m.id, m.userName)} className="p-1 text-gray-400 hover:text-red-500"><X size={14}/></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
