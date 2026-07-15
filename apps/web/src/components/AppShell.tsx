'use client';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { isPublicRoute } from '@/lib/routes';

/**
 * AppShell — always renders children.
 *
 * On public routes:  plain layout (no sidebar, no auth requirement).
 * On app routes:     sidebar + content area. Auth guard is handled
 *                    by (dashboard)/layout.tsx, not here.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const isPublic = isPublicRoute(pathname);

  if (isPublic) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
