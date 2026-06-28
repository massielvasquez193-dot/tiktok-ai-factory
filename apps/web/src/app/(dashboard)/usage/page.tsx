'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { BarChart3, TrendingUp, DollarSign, Zap, Users, Video } from 'lucide-react';

export default function UsagePage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch('/api/videos', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/scripts', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([videos, scripts, workspaces]) => {
      setStats({ videos: videos.total || videos.length || 0, scripts: scripts.length || scripts.items?.length || 0, workspaces: workspaces.data?.length || 1 });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><BarChart3 size={24}/> Usage Dashboard</h2>
      <p className="text-sm text-gray-500 mb-6">Your platform usage at a glance</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Videos', value: stats?.videos || 0, icon: Video, color: 'bg-purple-50 text-purple-700' },
          { label: 'Scripts', value: stats?.scripts || 0, icon: Zap, color: 'bg-blue-50 text-blue-700' },
          { label: 'Workspaces', value: stats?.workspaces || 0, icon: Users, color: 'bg-green-50 text-green-700' },
          { label: 'Cost Est.', value: '$0.00', icon: DollarSign, color: 'bg-yellow-50 text-yellow-700' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center mx-auto mb-3`}><s.icon size={24}/></div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card text-center py-16">
        <TrendingUp size={48} className="mx-auto text-gray-300 mb-3"/>
        <h3 className="text-lg font-semibold text-gray-700">Advanced Analytics</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">Detailed cost breakdowns, provider usage charts, and ROI analysis coming in Sprint 3 — Billing & Credits.</p>
      </div>
    </div>
  );
}
