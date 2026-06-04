'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', category: '', price: '$', offer: '', salesPage: '', country: 'US',
    persona: '', painPoints: [''], benefits: [''],
  });
  const [submitting, setSubmitting] = useState(false);

  const addField = (field: 'painPoints' | 'benefits') => {
    setForm({ ...form, [field]: [...form[field], ''] });
  };
  const updateField = (field: 'painPoints' | 'benefits', idx: number, value: string) => {
    const arr = [...form[field]];
    arr[idx] = value;
    setForm({ ...form, [field]: arr });
  };
  const removeField = (field: 'painPoints' | 'benefits', idx: number) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...form,
        painPoints: form.painPoints.filter(Boolean),
        benefits: form.benefits.filter(Boolean),
      };
      const product = await api.createProduct(data);
      router.push(`/products/${product.id}`);
    } catch (err) {
      alert('Failed to create product: ' + (err as Error).message);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl">
      <Link href="/products" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back
      </Link>
      <h2 className="text-2xl font-bold mb-6">New Product</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input className="input" required value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., BlendJet 2 Portable Blender" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input className="input" value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              placeholder="e.g., Portable Blender" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <input className="input" value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              placeholder="$49.99" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Country</label>
            <select className="input" value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}>
              <option value="US">US</option>
              <option value="MY">Malaysia</option>
              <option value="SG">Singapore</option>
              <option value="TH">Thailand</option>
              <option value="PH">Philippines</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Offer / Discount</label>
          <input className="input" value={form.offer}
            onChange={e => setForm({ ...form, offer: e.target.value })}
            placeholder="e.g., 15% off with code SMOOTHIE15" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Target Audience</label>
          <input className="input" value={form.persona}
            onChange={e => setForm({ ...form, persona: e.target.value })}
            placeholder="e.g., Busy professionals 22-40 who want quick healthy meals" />
        </div>

        {/* Pain Points */}
        <div>
          <label className="block text-sm font-medium mb-2">Pain Points</label>
          {form.painPoints.map((pp, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="input" value={pp} placeholder={`Pain point ${i + 1}`}
                onChange={e => updateField('painPoints', i, e.target.value)} />
              <button type="button" onClick={() => removeField('painPoints', i)} className="p-2 text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addField('painPoints')} className="text-sm text-brand-500 hover:underline flex items-center gap-1">
            <Plus size={14} /> Add pain point
          </button>
        </div>

        {/* Benefits */}
        <div>
          <label className="block text-sm font-medium mb-2">Benefits / Outcomes</label>
          {form.benefits.map((b, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="input" value={b} placeholder={`Benefit ${i + 1}`}
                onChange={e => updateField('benefits', i, e.target.value)} />
              <button type="button" onClick={() => removeField('benefits', i)} className="p-2 text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addField('benefits')} className="text-sm text-brand-500 hover:underline flex items-center gap-1">
            <Plus size={14} /> Add benefit
          </button>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Create Product'}
          </button>
          <Link href="/products" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
