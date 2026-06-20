'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminCreditsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [targetUser, setTargetUser] = useState('');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && (!user || !['admin', 'superadmin'].includes(user.role))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleAdjust = async () => {
    setMessage('');
    const token = JSON.parse(localStorage.getItem('tiktok-vf-auth') || '{}').accessToken;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/credits/admin/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUser, amount, reason }),
      });
      const data = await res.json();
      if (res.ok) setMessage(`✅ Credits adjusted. New balance: ${data.newBalance}`);
      else setMessage(`❌ ${data.message || 'Error'}`);
    } catch {
      setMessage('❌ Request failed');
    }
  };

  if (loading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Credit Management</h1>
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="font-bold">Adjust User Credits</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Target User ID</label>
          <input type="text" value={targetUser} onChange={e => setTargetUser(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="User UUID" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount (positive=add, negative=deduct)</label>
          <input type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
            placeholder="E.g., Refund for failed task" />
        </div>
        <button onClick={handleAdjust}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition">
          Adjust Credits
        </button>
        {message && <p className={`text-sm p-3 rounded-lg ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{message}</p>}
      </div>
    </div>
  );
}
