'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPaymentsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !['admin', 'superadmin'].includes(user.role))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment Management</h1>
      <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
        <p className="text-lg mb-2">💳</p>
        <p>Payment records available in Stripe Dashboard</p>
        <a
          href="https://dashboard.stripe.com/test/payments"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 hover:underline text-sm mt-2 inline-block"
        >
          Open Stripe Dashboard →
        </a>
      </div>
    </div>
  );
}
