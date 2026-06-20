'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (user) fetchData();
  }, [user, loading, router]);

  const token = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('tiktok-vf-auth') || '{}').accessToken : null;
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchData = async () => {
    if (!token) return;
    const [balanceRes, ledgerRes] = await Promise.all([
      fetch(`${API}/api/credits/balance`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/credits/ledger?pageSize=5`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (balanceRes.ok) setBalance(await balanceRes.json());
    if (ledgerRes.ok) setHistory((await ledgerRes.json()).items || []);
  };

  const openBillingPortal = async () => {
    setLoadingBilling(true);
    try {
      const res = await fetch(`${API}/api/payments/billing-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally {
      setLoadingBilling(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Profile */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-3">Profile</h2>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Email:</span> {user.email}</p>
          <p><span className="text-gray-500">Name:</span> {user.name || '—'}</p>
          <p><span className="text-gray-500">Role:</span> <RoleBadge role={user.role} /></p>
        </div>
      </section>

      {/* Credits */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-3">Credit Wallet</h2>
        {balance && (
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-600">{balance.balance}</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold">{balance.frozen}</p>
              <p className="text-xs text-gray-500">Frozen</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold">{balance.lifetime}</p>
              <p className="text-xs text-gray-500">Lifetime</p>
            </div>
          </div>
        )}
        <h3 className="text-sm font-medium mb-2">Recent Transactions</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {history.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="text-gray-600">{item.description || item.type}</span>
                <span className={item.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {item.amount >= 0 ? '+' : ''}{item.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Billing */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-3">Billing</h2>
        <p className="text-sm text-gray-500 mb-3">
          Manage your subscription, payment methods, and invoices via Stripe.
        </p>
        <button onClick={openBillingPortal} disabled={loadingBilling}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition text-sm">
          {loadingBilling ? 'Loading...' : 'Open Billing Portal'}
        </button>
      </section>

      {/* Logout */}
      <section className="bg-white border rounded-xl p-6">
        <button onClick={() => { logout(); router.push('/login'); }}
          className="text-red-600 hover:underline text-sm">
          Sign Out
        </button>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    user: 'bg-gray-100 text-gray-700', admin: 'bg-blue-100 text-blue-700', superadmin: 'bg-amber-100 text-amber-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[role] || ''}`}>{role}</span>;
}
