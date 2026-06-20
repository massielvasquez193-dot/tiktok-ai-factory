'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Zap, ArrowRight, Cpu } from 'lucide-react';
import { useTranslation } from '@/i18n';

const PROVIDER_INFO: Record<string, { color: string; label: string; desc: string; href: string }> = {
  seedance: { color: 'border-purple-200 bg-purple-50', label: 'Seedance 2.0', desc: 'ByteDance Volcengine Ark — TikTok-optimized', href: '/providers/seedance' },
  kling: { color: 'border-blue-200 bg-blue-50', label: 'Kling AI', desc: 'Kuaishou — cinematic commercial grade', href: '/providers/kling' },
  veo: { color: 'border-green-200 bg-green-50', label: 'Veo 2', desc: 'Google DeepMind — photorealistic 8K', href: '/providers/veo' },
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    fetch('/api/providers').then(r => r.json()).then(d => setProviders(d.providers || [])).catch(() => {});
    fetch('/api/providers/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Cpu size={24} /> Provider Architecture</h2>
        <p className="text-gray-500 text-sm">Unified interface for all AI video providers</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {providers.map((p: any) => {
          const info = PROVIDER_INFO[p.name] || { color: 'border-gray-200', label: p.name, desc: '', href: `/providers/${p.name}` };
          return (
            <Link key={p.name} href={info.href} className={`card border-2 ${info.color} hover:shadow-md transition-shadow group`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">{info.label}</h3>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
              <p className="text-sm text-gray-500 mb-3">{info.desc}</p>
              <div className="text-xs text-gray-400 font-mono">
                <p>Model: {p.model}</p>
                <p className="truncate">URL: {p.baseUrl}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Status</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className={stats.activePollers > 0 ? 'text-green-500' : 'text-gray-400'} />
            <span className="text-sm">{stats.activePollers || 0} active pollers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{providers.length} registered providers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
