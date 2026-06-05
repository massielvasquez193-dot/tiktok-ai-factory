'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Trash2, Upload, X } from 'lucide-react';
import { useTranslation } from '@/i18n';

const COUNTRIES = ['US', 'MY', 'SG', 'TH', 'PH'];
const CATEGORIES = ['Skincare', 'Supplements', 'Food & Beverage', 'Electronics', 'Home & Kitchen', 'Fashion', 'Beauty', 'Health', 'Other'];

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getProduct(id).then(p => {
      setProduct(p);
      setForm({
        product_name: p.product_name || '',
        brand: p.brand || '',
        category: p.category || 'General',
        target_country: p.target_country || 'US',
        benefits: JSON.parse(p.benefits || '[]'),
        ingredients: JSON.parse(p.ingredients || '[]'),
        price: p.price || '$0',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });
  const addArr = (f: string) => setForm({ ...form, [f]: [...form[f], ''] });
  const updArr = (f: string, i: number, v: string) => { const a = [...form[f]]; a[i] = v; setForm({ ...form, [f]: a }); };
  const delArr = (f: string, i: number) => setForm({ ...form, [f]: form[f].filter((_: any, j: number) => j !== i) });

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProduct(id, form);
      const p = await api.getProduct(id);
      setProduct(p);
      alert('Saved!');
    } catch (err) { alert('Failed: ' + (err as Error).message); }
    setSaving(false);
  };

  const del = async () => {
    if (!confirm('Delete this product permanently?')) return;
    await api.deleteProduct(id);
    router.push('/products');
  };

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('images', f));
    await fetch(`/api/products/${id}/images`, { method: 'POST', body: fd });
    const p = await api.getProduct(id);
    setProduct(p);
  };

  const removeImage = async (imageId: string) => {
    await fetch(`/api/products/${id}/images/${imageId}`, { method: 'DELETE' });
    const p = await api.getProduct(id);
    setProduct(p);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!product) return <div className="text-center py-20 text-gray-400">Not found</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex gap-2">
          <button onClick={del} className="btn-secondary flex items-center gap-2 text-red-500 hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="card mb-6">
        {/* Images */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Product Images</h3>
            <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1">
              <Upload size={12} /> Upload
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
            </label>
          </div>
          <div className="flex gap-3 flex-wrap">
            {product.images?.map((img: any) => (
              <div key={img.id} className="relative group">
                <img src={img.url} alt={img.filename} className="w-28 h-28 object-cover rounded-lg border" />
                <button onClick={() => removeImage(img.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
              </div>
            ))}
            {(!product.images || product.images.length === 0) && (
              <div className="w-28 h-28 rounded-lg bg-gray-50 border border-dashed flex items-center justify-center text-xs text-gray-400">No images</div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
              <input className="input text-sm" value={form.product_name} onChange={e => update('product_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
              <input className="input text-sm" value={form.brand} onChange={e => update('brand', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select className="input text-sm" value={form.category} onChange={e => update('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
              <select className="input text-sm" value={form.target_country} onChange={e => update('target_country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
              <input className="input text-sm" value={form.price} onChange={e => update('price', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Benefits</label>
              {form.benefits.map((v: string, i: number) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="input text-sm" value={v} onChange={e => updArr('benefits', i, e.target.value)} />
                  <button onClick={() => delArr('benefits', i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => addArr('benefits')} className="text-xs text-brand-500 hover:underline">+ Add benefit</button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Ingredients</label>
              {form.ingredients.map((v: string, i: number) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="input text-sm" value={v} onChange={e => updArr('ingredients', i, e.target.value)} />
                  <button onClick={() => delArr('ingredients', i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => addArr('ingredients')} className="text-xs text-brand-500 hover:underline">+ Add ingredient</button>
            </div>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>ID: {product.id}</p>
        <p>Created: {new Date(product.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(product.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
