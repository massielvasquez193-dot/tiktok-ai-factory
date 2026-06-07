'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/i18n';

function NewCampaignForm() {
  const router = useRouter();
  const params = useSearchParams();
  const pid = params.get('productId');
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState(pid || '');
  const [name, setName] = useState('');
  const [languages, setLanguages] = useState(['en']);
  const [scriptTypes, setScriptTypes] = useState(['ugc', 'review']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.getProducts().then(setProducts).catch(() => {}); }, []);
  useEffect(() => { if (pid) setProductId(pid); }, [pid]);
  useEffect(() => {
    if (products.length > 0 && productId) {
      const p = products.find(x => x.id === productId);
      if (p) setName(`${p.name || p.product_name} Campaign`);
    }
  }, [products, productId]);

  const toggle = (arr: string[], set: (a: string[]) => void, val: string) => {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const c = await api.createCampaign({ productId, name, languages, scriptTypes });
      router.push(`/campaigns/${c.id}`);
    } catch (err) { alert('Failed: ' + (err as Error).message); setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl">
      <Link href="/campaigns" className="flex items-center gap-2 text-sm text-gray-500 mb-4"><ArrowLeft size={14} />Back</Link>
      <h2 className="text-2xl font-bold mb-6">New Campaign</h2>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Product *</label>
          <select className="input" value={productId} onChange={e => setProductId(e.target.value)} required>
            <option value="">Select product...</option>
            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label className="block text-sm font-medium mb-1">Campaign Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="My Campaign" /></div>
        <div>
          <label className="block text-sm font-medium mb-2">Languages</label>
          <div className="flex flex-wrap gap-2">
            {['en', 'ms', 'th', 'fil', 'es'].map(l => (
              <button key={l} type="button" onClick={() => toggle(languages, setLanguages, l)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${languages.includes(l) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-300'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Script Types</label>
          <div className="flex flex-wrap gap-2">
            {['ugc', 'review', 'before_after', 'pov', 'problem_solution'].map(t => (
              <button key={t} type="button" onClick={() => toggle(scriptTypes, setScriptTypes, t)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${scriptTypes.includes(t) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-300'}`}>
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4"><button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Creating...' : 'Create Campaign'}</button><Link href="/campaigns" className="btn-secondary">Cancel</Link></div>
      </form>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
      <NewCampaignForm />
    </Suspense>
  );
}
