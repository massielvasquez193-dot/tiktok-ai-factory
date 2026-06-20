'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count?: { memberships: number };
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  const token = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('tiktok-vf-auth') || '{}').accessToken : null;

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/admin/users?search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) setUsers(await res.json());
    } catch {} finally {
      setPageLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    if (!loading && (!user || !['admin', 'superadmin'].includes(user.role))) {
      router.push('/login');
      return;
    }
    if (user) fetchUsers();
  }, [user, loading, router, fetchUsers]);

  const updateRole = async (userId: string, role: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  };

  if (loading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="border rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-brand-500 outline-none"
          onKeyDown={e => e.key === 'Enter' && fetchUsers()}
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Email</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Role</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Verified</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Created</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 text-sm">{u.email}</td>
                <td className="p-3 text-sm">{u.name || '—'}</td>
                <td className="p-3">
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </td>
                <td className="p-3 text-sm">
                  {u.emailVerified ? <span className="text-green-600">✓</span> : <span className="text-gray-400">—</span>}
                </td>
                <td className="p-3 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-sm">
                  <button onClick={() => {/* TODO */}} className="text-brand-600 hover:underline text-xs">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
