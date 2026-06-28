'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { CreditCard, ArrowUpCircle, ArrowDownCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success && d.data[0]) { setWs(d.data[0]); loadSub(d.data[0].id); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function loadSub(wsId: string) {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/subscription`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) { setSub(d.data.subscription); setPlan(d.data.plan); }
    } catch {}
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/subscription/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) { setMessage('Subscription canceled'); loadSub(ws.id); }
    } catch (err: any) { setMessage(err.message); }
  }

  async function handleUpgrade(planName: string) {
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/subscription`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ planName }) });
      const d = await res.json();
      if (d.success) { setMessage(`Upgraded to ${planName}`); loadSub(ws.id); }
    } catch (err: any) { setMessage(err.message); }
  }

  if (loading) return <div className="text-gray-400 py-8">Loading billing...</div>;
  if (!ws) return <div className="text-gray-400 py-8">No workspace found</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><CreditCard size={24}/> Billing & Subscription</h2>
      <p className="text-sm text-gray-500 mb-6">Manage your plan and payment methods</p>

      {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700"><AlertCircle size={16}/>{message}</div>}

      <div className="card mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-lg">{plan?.displayName || 'Free'} Plan</h3>
            <p className="text-sm text-gray-500">{sub?.status === 'active' ? 'Active' : sub?.status} · {sub?.billingPeriod || 'monthly'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${sub?.status==='active'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{sub?.status || 'free'}</span>
        </div>
        <div className="py-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Credits/month</span><span className="font-medium">{plan?.creditMonthly || 50}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Max members</span><span className="font-medium">{plan?.maxMembers || 1}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Video generations</span><span className="font-medium">{plan?.maxVideoGenerations || 5}/mo</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Next billing date</span><span className="font-medium">{sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}</span></div>
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <Link href="/pricing" className="btn-primary flex items-center gap-2"><ArrowUpCircle size={16}/> Change Plan</Link>
        {sub?.status === 'active' && <button onClick={handleCancel} className="btn-secondary flex items-center gap-2 text-red-600"><XCircle size={16}/> Cancel</button>}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Quick Plan Switch (Dev)</h3>
        <div className="flex flex-wrap gap-2">
          {['free','starter','pro','business'].map(pn => (
            <button key={pn} onClick={() => handleUpgrade(pn)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">{pn}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
