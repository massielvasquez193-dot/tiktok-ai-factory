'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { useTranslation } from '@/i18n';

const COUNTRIES = ['US', 'MY', 'SG', 'TH', 'PH'];
const CATEGORIES = ['Skincare', 'Supplements', 'Food & Beverage', 'Electronics', 'Home & Kitchen', 'Fashion', 'Beauty', 'Health', 'Other'];

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    product_name: '', brand: '', category: 'General', target_country: 'US',
    benefits: [''], ingredients: [''], price: '$',
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  const addArr = (f: 'benefits' | 'ingredients') => setForm({ ...form, [f]: [...form[f], ''] });
  const updArr = (f: 'benefits' | 'ingredients', i: number, v: string) => {
    const a = [...form[f]]; a[i] = v; setForm({ ...form, [f]: a });
  };
  const delArr = (f: 'benefits' | 'ingredients', i: number) => setForm({ ...form, [f]: form[f].filter((_, j) => j !== i) });

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };
  const removePreview = (i: number) => {
    setImages(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const product = await api.createProduct({
        product_name: form.product_name,
        brand: form.brand,
        category: form.category,
        target_country: form.target_country,
        benefits: form.benefits.filter(Boolean),
        ingredients: form.ingredients.filter(Boolean),
        price: form.price,
      });
      // Upload images
      if (images.length > 0) {
        const fd = new FormData();
        images.forEach(f => fd.append('images', f));
        await fetch(`/api/products/${product.id}/images`, { method: 'POST', body: fd });
      }
      router.push(`/products/${product.id}`);
    } catch (err) {
      alert('Failed: ' + (err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Link href="/products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to Products
      </Link>
      <h2 className="text-2xl font-bold mb-6">New Product</h2>

      <form onSubmit={submit} className="space-y-5">
        {/* Product Name + Brand */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name <span className="text-red-500">*</span></label>
            <input className="input" required value={form.product_name}
              onChange={e => update('product_name', e.target.value)} placeholder="e.g. BlendJet 2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <input className="input" value={form.brand}
              onChange={e => update('brand', e.target.value)} placeholder="e.g. BlendJet" />
          </div>
        </div>

        {/* Category + Country + Price */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className="input" value={form.category} onChange={e => update('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Country</label>
            <select className="input" value={form.target_country} onChange={e => update('target_country', e.target.value)}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <input className="input" value={form.price} onChange={e => update('price', e.target.value)} placeholder="$49.99" />
          </div>
        </div>

        {/* Benefits + Ingredients */}
        <div className="grid grid-cols-2 gap-6">
          {(['benefits', 'ingredients'] as const).map(field => (
            <div key={field}>
              <label className="block text-sm font-medium mb-2 capitalize">{field}</label>
              {form[field].map((v, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="input" value={v} placeholder={`${field === 'benefits' ? 'e.g. Portable design' : 'e.g. Vitamin C'}`}
                    onChange={e => updArr(field, i, e.target.value)} />
                  <button type="button" onClick={() => delArr(field, i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => addArr(field)} className="text-sm text-brand-500 hover:underline flex items-center gap-1">
                <Plus size={14} /> Add {field === 'benefits' ? 'benefit' : 'ingredient'}
              </button>
            </div>
          ))}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Product Images</label>
          <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-brand-400 transition-colors">
            <div className="text-center">
              <Upload size={28} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload images</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 10MB</p>
            </div>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
          </label>
          {previews.length > 0 && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt="" className="w-24 h-24 object-cover rounded-lg border" />
                  <button type="button" onClick={() => removePreview(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Create Product'}
          </button>
          <Link href="/products" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
