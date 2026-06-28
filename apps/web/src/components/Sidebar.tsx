'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { LayoutDashboard, Package, FileText, Video, Layout, Sparkles, Play, Film, FolderOpen, Database, BarChart3, Send, Globe, Rocket, Mic, Languages, Search, Settings, Images, TrendingUp, Users, Cpu, Key } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

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
    { href: '/usage', key: 'menu.usage', icon: BarChart3 },
    { href: '/settings/members', key: 'menu.members', icon: Users },
    { href: '/settings/workspace', key: 'menu.workspaceSettings', icon: Settings },
    { href: '/settings/providers', key: 'menu.providers', icon: Cpu },
    { href: '/settings/api-keys', key: 'menu.apiKeys', icon: Key },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="p-4 border-b">
        <h1 className="text-sm font-bold"><span className="text-brand-500">TikTok</span> AI Factory</h1>
        <div className="mt-2"><WorkspaceSwitcher /></div>
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
      </nav>
      <div className="p-4 border-t text-xs text-gray-400 flex items-center justify-between">
        <span>v2.1.0</span>
      </div>
    </aside>
  );
}
