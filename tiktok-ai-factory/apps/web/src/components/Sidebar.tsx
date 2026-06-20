'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Package, FileText, Video, Layout, Sparkles, Play, Film, FolderOpen, Database, BarChart3, Send, Globe, Rocket, Mic, Languages, Search, Settings, Images, TrendingUp, Shield, User, Activity } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();

  const NAV = [
    { href: '/', key: 'menu.dashboard', icon: LayoutDashboard },
    { href: '/products', key: 'menu.products', icon: Package },
    { href: '/scripts', key: 'menu.scripts', icon: FileText },
    { href: '/storyboards', key: 'menu.storyboards', icon: Layout },
    { href: '/prompts', key: 'menu.prompts', icon: Sparkles },
    { href: '/campaigns-v2', key: 'menu.campaignsV2', icon: Rocket },
    { href: '/campaigns', key: 'menu.campaigns', icon: Play },
    { href: '/agent', key: 'menu.agent', icon: Rocket },
    { href: '/knowledge', key: 'menu.knowledge', icon: Database },
    { href: '/research', key: 'menu.research', icon: Search },
    { href: '/providers', key: 'menu.seedance', icon: Film },
    { href: '/video-generator', key: 'menu.videoGenerator', icon: Sparkles },
    { href: '/videos', key: 'menu.videos', icon: Video },
    { href: '/video-queue', key: 'menu.videoQueue', icon: Play },
    { href: '/assets', key: 'menu.assets', icon: Images },
    { href: '/asset-library', key: 'menu.assetLibrary', icon: FolderOpen },
    { href: '/localization', key: 'menu.localization', icon: Languages },
    { href: '/post-production', key: 'menu.postProduction', icon: Mic },
    { href: '/data-center', key: 'menu.dataCenter', icon: TrendingUp },
    { href: '/publish', key: 'menu.publish', icon: Send },
    { href: '/publishing', key: 'menu.publishing', icon: Globe },
    { href: '/performance', key: 'menu.performance', icon: BarChart3 },
    { href: '/automation', key: 'menu.automation', icon: Settings },
    { href: '/environment', key: 'menu.environment', icon: Activity },
  ];

  // Admin links — only shown to admin/superadmin users
  const ADMIN_NAV = [
    { href: '/admin', key: 'Admin Dashboard', icon: Shield },
    { href: '/admin/users', key: 'Users', icon: User },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="p-6 border-b">
        <h1 className="text-lg font-bold"><span className="text-brand-500">TikTok</span> AI Factory</h1>
        <p className="text-xs text-gray-500 mt-1">{t('desc.dashboard', 'AI Video Production System')}</p>
      </div>
      <nav className="flex-1 p-4 space-y-0.5">
        {NAV.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors', active ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-50')}>
              <Icon size={16} /><span className="truncate">{t(key)}</span>
            </Link>
          );
        })}

        {/* ─── Admin Section ─── */}
        {user && ['admin', 'superadmin'].includes(user.role) && (
          <>
            <div className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Admin</div>
            {ADMIN_NAV.map(({ href, key, icon: Icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link key={href} href={href} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors', active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50')}>
                  <Icon size={16} /><span className="truncate">{key}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <div className="p-4 border-t space-y-2">
        {user ? (
          <Link href="/settings" className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-600 transition">
            <User size={14} /><span>{user.email}</span>
          </Link>
        ) : (
          <Link href="/login" className="text-xs text-brand-600 hover:underline">Sign In</Link>
        )}
        <div className="text-xs text-gray-400 flex items-center justify-between">
          <span>v2.2.0</span>
        </div>
      </div>
    </aside>
  );
}
