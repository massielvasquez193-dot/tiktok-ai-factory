'use client';
import { useEffect, useState } from 'react';
import { Globe, Sparkles, Trash2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function LocalizationPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [productId, setProductId] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'MY', 'TH', 'PH', 'VN', 'ID']);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()).catch(() => []),
      fetch('/api/localization/countries').then(r => r.json()).catch(() => []),
      fetch('/api/localization').then(r => r.json()).catch(() => []),
    ]).then(([p, c, i]) => { setProducts(p); setCountries(c); setItems(i); setLoading(false); });
  }, []);

  const toggle = (c: string) => {
    const n = new Set(selectedCountries);
    n.has(c) ? n.delete(c) : n.add(c);
    setSelectedCountries(Array.from(n));
  };

  const generate = async () => {
    if (!productId) return alert('Select product');
    setGenerating(true);
    const res = await fetch('/api/localization/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, countries: selectedCountries }),
    });
    const data = await res.json();
    setGenerating(false);
    setItems(data.items || []);
  };

  const del = async (id: string) => {
    await fetch('/api/localization/' + id, { method: 'DELETE' });
    setItems(items.filter(i => i.id !== id));
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Globe size={24} /> Localization Engine</h2><p className="text-gray-500 text-sm">Auto-localize for 7 countries</p></div>
      </div>

      {/* Generator */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Product</label>
            <select className="input text-sm" value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">Select...</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.product_name} ({p.price})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Target Countries</label>
            <div className="flex flex-wrap gap-1.5">
              {countries.map((c: any) => (
                <button key={c.code} onClick={() => toggle(c.code)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedCountries.includes(c.code) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 hover:border-brand-300'}`}>
                  {c.code} ({c.currency})
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={generate} disabled={generating || !productId} className="btn-primary flex items-center gap-2">
          <Sparkles size={14} /> {generating ? 'Localizing...' : `Generate for ${selectedCountries.length} countries`}
        </button>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Results ({items.length})</h3>
        <span className="text-xs text-gray-400">{new Set(items.map(i => i.country)).size} countries</span>
      </div>

      {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : items.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Globe size={32} className="mx-auto mb-2 opacity-30" />
          <p>No localizations yet. Select a product and generate!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((l: any) => {
            const scripts = JSON.parse(l.scripts || '[]');
            const isOpen = expanded.has(l.id);
            return (
              <div key={l.id} className="card">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => {
                  const n = new Set(expanded); isOpen ? n.delete(l.id) : n.add(l.id); setExpanded(n);
                }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-brand-600">{l.country}</span>
                    <div>
                      <p className="font-medium text-sm">{l.language}</p>
                      <p className="text-xs text-gray-500">{l.price} · {l.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{l.expressions.split(',')[0]}</span>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <button onClick={e => { e.stopPropagation(); del(l.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-green-700 mb-1">Hook</p>
                        <p className="text-green-900">{l.hook}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-purple-700 mb-1">CTA</p>
                        <p className="text-purple-900">{l.cta}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Expressions:</span>
                      {l.expressions.split(', ').map((e: string) => (
                        <span key={e} className="bg-gray-100 px-2 py-0.5 rounded">{e}</span>
                      ))}
                    </div>

                    {scripts.map((s: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 relative group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="badge-blue text-xs">{s.type.toUpperCase()}</span>
                          <button onClick={() => copyText(s.voiceover)} className="text-xs text-gray-400 hover:text-brand-500 flex items-center gap-1"><Copy size={12} /> Copy</button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{s.voiceover}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
