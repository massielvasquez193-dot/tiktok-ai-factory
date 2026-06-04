'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { ArrowLeft, Plus, Play, Upload, FileText, Video, Package } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.getProduct(id).then(setProduct).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const form = new FormData();
    Array.from(files).forEach(f => form.append('files', f));
    form.append('productId', id);
    try {
      await fetch('/api/upload/multiple', { method: 'POST', body: form });
      // Refresh
      const updated = await api.getProduct(id);
      setProduct(updated);
    } catch (err) { alert('Upload failed'); }
    setUploading(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!product) return <div className="text-center py-20 text-gray-400">Product not found</div>;

  return (
    <div className="max-w-4xl">
      <Link href="/products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to Products
      </Link>

      {/* Product header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-gray-500 mt-1">{product.category} · {product.price} · {product.country}</p>
            {product.persona && <p className="text-sm text-gray-400 mt-2">Audience: {product.persona}</p>}
          </div>
          <div className="flex gap-2">
            <Link href={`/campaigns/new?productId=${product.id}`} className="btn-primary flex items-center gap-2">
              <Play size={14} /> Generate Videos
            </Link>
          </div>
        </div>

        {/* Pain Points + Benefits */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <h4 className="text-sm font-semibold text-red-600 mb-2">Pain Points</h4>
            <ul className="space-y-1">
              {product.painPoints?.map((pp: any) => (
                <li key={pp.id} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span> {pp.text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-600 mb-2">Benefits</h4>
            <ul className="space-y-1">
              {product.benefits?.map((b: any) => (
                <li key={b.id} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span> {b.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Assets + Upload */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Package size={18} /> Assets ({product.assets?.length || 0})
          </h3>
          <label className="btn-secondary flex items-center gap-2 cursor-pointer text-sm">
            <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Files'}
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        {product.assets?.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {product.assets.map((a: any) => (
              <div key={a.id} className="border rounded-lg overflow-hidden">
                <div className="aspect-square bg-gray-50 flex items-center justify-center">
                  {a.type === 'video' ? (
                    <Video size={24} className="text-gray-400" />
                  ) : (
                    <img src={`/uploads/images/${a.url.split('/').pop()}`} alt={a.filename} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs truncate">{a.filename}</p>
                  <p className="text-xs text-gray-400">{a.type} · {a.rights}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No assets uploaded yet. Upload product images and videos.</p>
        )}
      </div>

      {/* Scripts */}
      <div className="card">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <FileText size={18} /> Scripts ({product.scripts?.length || 0})
        </h3>
        {product.scripts?.length > 0 ? (
          <div className="space-y-3">
            {product.scripts.map((s: any) => (
              <div key={s.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-info">{s.scriptType}</span>
                  <span className="badge-info">{s.language}</span>
                </div>
                {s.content?.hook?.text && (
                  <p className="text-sm font-medium">Hook: {s.content.hook.text}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {s.content?.scenes?.length || 0} scenes · {s.content?.duration_seconds || 0}s
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No scripts yet.{' '}
            <Link href={`/campaigns/new?productId=${product.id}`} className="text-brand-500 hover:underline">
              Create a campaign to generate scripts.
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
