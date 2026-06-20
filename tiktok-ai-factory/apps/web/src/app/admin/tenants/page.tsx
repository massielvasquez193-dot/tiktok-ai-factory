'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminTenantsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || !['admin', 'superadmin'].includes(user.role))) {
      router.push('/login');
      return;
    }
    if (user) {
      const token = JSON.parse(localStorage.getItem('tiktok-vf-auth') || '{}').accessToken;
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/tenant/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : [])
        .then(setTenants)
        .catch(() => {});
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tenant Management</h1>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Slug</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Plan</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Members</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No tenants found</td></tr>
            ) : tenants.map((t: any) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 text-sm font-medium">{t.name}</td>
                <td className="p-3 text-sm text-gray-500">{t.slug}</td>
                <td className="p-3"><PlanBadge plan={t.plan} /></td>
                <td className="p-3"><StatusBadge status={t.status} /></td>
                <td className="p-3 text-sm">{t._count?.members || 0}</td>
                <td className="p-3 text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600', starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700', enterprise: 'bg-amber-100 text-amber-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[plan] || ''}`}>{plan}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      status === 'active' ? 'bg-green-100 text-green-700' :
      status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
    }`}>{status}</span>
  );
}
