'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function ProductsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getProducts().then(setProducts).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.deleteProduct(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t('title.products')}</h2>
          <p className="text-gray-500 text-sm">{products.length} {t('label.product').toLowerCase()}</p>
        </div>
        <Link href="/products/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t('button.addProduct')}
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <p className="text-center py-12 text-gray-400">Loading...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">{t('products.noProducts')}</p>
            <p className="text-sm mt-1">{t('desc.products')}</p>
            <Link href="/products/new" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Plus size={14} /> {t('button.addProduct')}
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="pb-3 font-medium w-16">{t('products.image')}</th>
                <th className="pb-3 font-medium">{t('products.name')}</th>
                <th className="pb-3 font-medium">{t('label.brand')}</th>
                <th className="pb-3 font-medium">{t('label.category')}</th>
                <th className="pb-3 font-medium">{t('label.country')}</th>
                <th className="pb-3 font-medium">{t('label.price')}</th>
                <th className="pb-3 font-medium">{t('label.status')}</th>
                <th className="pb-3 font-medium text-right w-28">{t('label.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3">
                    {p.images?.[0] ? (
                      <img src={p.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon size={16} className="text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    <Link href={`/products/${p.id}`} className="font-medium text-brand-600 hover:underline">
                      {p.product_name}
                    </Link>
                  </td>
                  <td className="py-3 text-sm text-gray-600">{p.brand || '-'}</td>
                  <td className="py-3 text-sm text-gray-600">{p.category}</td>
                  <td className="py-3 text-sm">{p.target_country}</td>
                  <td className="py-3 text-sm font-medium">{p.price}</td>
                  <td className="py-3">
                    <span className={p.status === 'active' ? 'badge-green' : 'badge-blue'}>{p.status}</span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/products/${p.id}`} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                        <Edit size={14} />
                      </Link>
                      <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
