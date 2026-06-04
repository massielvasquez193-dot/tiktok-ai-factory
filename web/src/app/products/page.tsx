'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatNumber, timeAgo } from '@/lib/utils';
import { Plus, Search, ExternalLink } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-gray-500 text-sm mt-1">{products.length} products</p>
        </div>
        <Link href="/products/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-gray-400 text-center py-12">Loading...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No products yet</p>
            <Link href="/products/new" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Plus size={14} /> Add Your First Product
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Country</th>
                <th className="pb-3 font-medium">Scripts</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3">
                    <Link href={`/products/${p.id}`} className="font-medium text-brand-600 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 text-sm text-gray-600">{p.category}</td>
                  <td className="py-3 text-sm">{p.country}</td>
                  <td className="py-3 text-sm">{p._count?.scripts || 0}</td>
                  <td className="py-3">
                    <span className={`badge-${p.status === 'active' ? 'success' : 'info'}`}>{p.status}</span>
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/campaigns/new?productId=${p.id}`} className="btn-secondary text-xs py-1.5 px-3">
                      Generate
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
