'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ago } from '@/lib/utils';
import { FileText, Sparkles, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import { useTranslation } from '@/i18n';

const SCRIPT_TYPES = [
  { value: 'ugc', label: 'UGC (User Generated Content)' },
  { value: 'review', label: 'Review / Unboxing' },
  { value: 'before_after', label: 'Before & After' },
  { value: 'pov', label: 'POV (Point of View)' },
];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ms', label: 'Malay' },
  { value: 'th', label: 'Thai' },
];

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [productId, setProductId] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['ugc', 'review']);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['en']);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      api.getScripts().catch(() => []),
      api.getProducts().catch(() => []),
    ]);
    setScripts(s); setProducts(p); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) => {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const generate = async () => {
    if (!productId) return alert('Select a product');
    setGenerating(true);
    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, scriptTypes: selectedTypes, languages: selectedLangs }),
      });
      const data = await res.json();
      alert(`Generated ${data.count} scripts!`);
      load();
    } catch (e) { alert('Failed: ' + (e as Error).message); }
    setGenerating(false);
  };

  const regenerate = async (id: string) => {
    await fetch(`/api/scripts/${id}/regenerate`, { method: 'POST' });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this script?')) return;
    await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
    load();
  };

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Script Generator</h2>
        <p className="text-gray-500 text-sm">Generate TikTok video scripts with Mock AI</p>
      </div>

      {/* Generator Form */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles size={18} /> Generate Scripts</h3>

        <div className="space-y-4">
          {/* Product */}
          <div>
            <label className="block text-sm font-medium mb-1">Product</label>
            <select className="input" value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">-- Select a product --</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.product_name} ({p.category})</option>
              ))}
            </select>
          </div>

          {/* Script Types */}
          <div>
            <label className="block text-sm font-medium mb-2">Script Type</label>
            <div className="flex flex-wrap gap-2">
              {SCRIPT_TYPES.map(t => (
                <button key={t.value} onClick={() => toggle(selectedTypes, setSelectedTypes, t.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedTypes.includes(t.value) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(l => (
                <button key={l.value} onClick={() => toggle(selectedLangs, setSelectedLangs, l.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedLangs.includes(l.value) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                  }`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={generating || !productId} className="btn-primary flex items-center gap-2">
            <Sparkles size={16} /> {generating ? 'Generating...' : `Generate ${selectedTypes.length * selectedLangs.length} Scripts`}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText size={18} /> History ({scripts.length})</h3>

        {loading ? (
          <p className="text-center py-8 text-gray-400">Loading...</p>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p>No scripts yet. Select a product above and generate!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map((s: any) => (
              <div key={s.id} className="border rounded-lg p-4 hover:border-brand-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="badge-blue text-xs">{s.scriptType.replace(/_/g, ' ')}</span>
                    <span className="badge-blue text-xs">{s.language?.toUpperCase()}</span>
                    <span className="text-sm text-gray-500">{s.product?.product_name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{ago(s.createdAt)}</span>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed">{s.content}</p>

                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <button onClick={() => copyText(s.content, s.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
                    {copied === s.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copied === s.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => regenerate(s.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 px-2 py-1 rounded hover:bg-blue-50">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                  <button onClick={() => del(s.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 ml-auto">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
