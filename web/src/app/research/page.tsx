'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Search, TrendingUp, ExternalLink } from 'lucide-react';

export default function ResearchPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getResearchVideos({ limit: '20' }).catch(() => []),
      api.getResearchTemplates().catch(() => []),
    ]).then(([v, t]) => {
      setVideos(v); setTemplates(t);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Viral Research</h2>
          <p className="text-gray-500 text-sm mt-1">{videos.length} videos · {templates.length} templates</p>
        </div>
        <button className="btn-primary flex items-center gap-2" disabled>
          <Search size={16} /> Run Research
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Templates */}
        <div className="card">
          <h3 className="font-semibold mb-4">Viral Templates</h3>
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400">No templates yet. Run the Viral Research Agent to discover patterns.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t: any) => (
                <div key={t.id} className="p-4 border rounded-lg">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.category}</p>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{t.hookPattern}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="card">
          <h3 className="font-semibold mb-4">Top Viral Videos</h3>
          {videos.length === 0 ? (
            <p className="text-sm text-gray-400">No research data yet. Use the CLI to run research first.</p>
          ) : (
            <div className="space-y-2">
              {videos.slice(0, 10).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.description || 'No description'}</p>
                    <p className="text-xs text-gray-500">
                      {v.platform} · {v.author} · [{v.hookType}] {v.structure}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 ml-4">
                    <span>{formatNumber(v.views)} views</span>
                    <span>{formatNumber(v.likes)} likes</span>
                    {v.url && <a href={v.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
