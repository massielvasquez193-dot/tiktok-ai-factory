'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { FileText, ExternalLink } from 'lucide-react';

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getScripts().then(setScripts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Scripts</h2>
          <p className="text-gray-500 text-sm mt-1">{scripts.length} scripts generated</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-400 text-center py-12">Loading...</p>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText size={32} className="mx-auto mb-2" />
            <p>No scripts yet. Scripts are generated automatically when you create a campaign.</p>
            <Link href="/campaigns/new" className="btn-primary inline-flex items-center gap-2 mt-4">
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map((s: any) => (
              <div key={s.id} className="p-4 border rounded-lg hover:border-brand-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="badge-info mr-2">{s.scriptType}</span>
                    <span className="badge-info mr-2">{s.language}</span>
                    <span className={`badge-${s.status === 'approved' ? 'success' : 'info'}`}>{s.status}</span>
                  </div>
                  <span className="text-xs text-gray-500">{timeAgo(s.createdAt)}</span>
                </div>
                {s.content?.hook?.text && (
                  <p className="text-sm text-gray-700 font-medium">Hook: {s.content.hook.text}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {s.content?.scenes?.length || 0} scenes · {s.content?.duration_seconds || 0}s
                  {s.product?.name ? ` · ${s.product.name}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
