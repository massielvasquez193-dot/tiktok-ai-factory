'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isPublicRoute } from '@/lib/routes';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

/**
 * DashboardLayout — private route guard.
 *
 * - On public routes:     pass through without auth check (safety net).
 * - While loading session: show a minimal spinner (avoids blank page).
 * - No session:            redirect to /login.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';

  // Safety: never guard public routes
  if (isPublicRoute(pathname)) return <>{children}</>;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
