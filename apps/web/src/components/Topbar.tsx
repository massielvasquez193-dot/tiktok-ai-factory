'use client';
import { useAuth } from '@/lib/auth/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User, ChevronDown, Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  async function handleLogout() { await logout(); router.push('/login'); }

  const initials = user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600 hidden sm:block">TikTok AI Factory</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><Bell size={18}/></button>
        <div ref={ref} className="relative">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-semibold">{initials}</div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">{user.name}</span>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block"/>
          </button>
          {open && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-900 truncate">{user.name}</p><p className="text-xs text-gray-500 truncate">{user.email}</p></div>
              <Link href="/settings/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><User size={16}/> Profile Settings</Link>
              <Link href="/settings/sessions" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Settings size={16}/> Sessions</Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"><LogOut size={16}/> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
