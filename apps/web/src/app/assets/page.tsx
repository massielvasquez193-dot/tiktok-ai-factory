'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ago, fmt } from '@/lib/utils';
import { Upload, Trash2, Filter, X, Search, Image, Film, Grid3X3, List, Play, Eye, Download, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from '@/i18n';

const TYPES = ['image', 'video'];
const CATEGORIES = ['product', 'competitor', 'ugc', 'brand'];
const COUNTRIES = ['US', 'MY', 'SG', 'TH', 'PH'];
const LANGUAGES = ['en', 'ms', 'th', 'fil', 'es'];

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ types: [], categories: [], countries: [], languages: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('image');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fLanguage, setFLanguage] = useState('');
  const [uploadCategory, setUploadCategory] = useState('product');
  const [uploadCountry, setUploadCountry] = useState('');
  const [uploadLanguage, setUploadLanguage] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (fType) params.set('type', fType);
    if (fCategory) params.set('category', fCategory);
    if (fCountry) params.set('country', fCountry);
    if (fLanguage) params.set('language', fLanguage);
    if (search) params.set('search', search);

    const [a, m] = await Promise.all([
      fetch(`/api/assets?${params}`).then(r => r.json()).catch(() => []),
      fetch('/api/assets/meta').then(r => r.json()).catch(() => ({})),
    ]);
    setAssets(a); setMeta(m); setLoading(false);
  }, [search, fType, fCategory, fCountry, fLanguage]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    fd.append('category', uploadCategory);
    fd.append('country', uploadCountry);
    fd.append('language', uploadLanguage);
    await fetch('/api/assets/upload', { method: 'POST', body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    load();
  };

  const delSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} assets?`)) return;
    await fetch('/api/assets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selected) }) });
    setSelected(new Set()); load();
  };

  const toggle = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };

  const stats = { total: assets.length, images: assets.filter(a => a.type === 'image').length, videos: assets.filter(a => a.type === 'video').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Assets</h2>
          <p className="text-gray-500 text-sm">{stats.total} files · {stats.images} images · {stats.videos} videos</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && <button onClick={delSelected} className="btn-secondary text-sm flex items-center gap-1 text-red-500"><Trash2 size={14} /> Delete ({selected.size})</button>}
          <label className="btn-primary text-sm flex items-center gap-2 cursor-pointer">
            <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload'}
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Upload config */}
      <div className="card mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Category</label>
            <select className="input text-sm" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Country</label>
            <select className="input text-sm" value={uploadCountry} onChange={e => setUploadCountry(e.target.value)}>
              <option value="">None</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Language</label>
            <select className="input text-sm" value={uploadLanguage} onChange={e => setUploadLanguage(e.target.value)}>
              <option value="">None</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-6 gap-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Search</label>
            <div className="relative"><Search size={14} className="absolute left-2 top-2.5 text-gray-400" /><input className="input text-sm pl-7" placeholder="Name..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Type</label><select className="input text-sm" value={fType} onChange={e => setFType(e.target.value)}><option value="">All</option>{meta.types.map((t: string) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Category</label><select className="input text-sm" value={fCategory} onChange={e => setFCategory(e.target.value)}><option value="">All</option>{meta.categories.map((c: string) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Country</label><select className="input text-sm" value={fCountry} onChange={e => setFCountry(e.target.value)}><option value="">All</option>{meta.countries.map((c: string) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Language</label><select className="input text-sm" value={fLanguage} onChange={e => setFLanguage(e.target.value)}><option value="">All</option>{meta.languages.map((l: string) => <option key={l} value={l}>{l}</option>)}</select></div>
          <div className="flex items-end"><button onClick={() => { setSearch(''); setFType(''); setFCategory(''); setFCountry(''); setFLanguage(''); }} className="text-xs text-gray-400 flex items-center gap-1"><X size={12} />Clear</button></div>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setPreview(null)}>
          <div className="relative max-w-2xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute -top-8 right-0 text-white"><X size={20} /></button>
            {previewType === 'video' ? <video src={preview} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl" /> : <img src={preview} alt="" className="max-w-full max-h-[85vh] rounded-xl" />}
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? <p className="text-center py-12 text-gray-400">Loading...</p> : assets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Image size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No assets yet</p>
          <label className="btn-primary inline-flex items-center gap-2 mt-4 cursor-pointer"><Upload size={14} /> Upload Assets<input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} /></label>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {assets.map(a => (
            <div key={a.id} className={`card p-0 overflow-hidden group ${selected.has(a.id) ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="aspect-square bg-gray-100 relative cursor-pointer flex items-center justify-center"
                onClick={() => { setPreview(a.fileUrl); setPreviewType(a.type); }}>
                {a.type === 'video' ? (
                  <div className="flex flex-col items-center gap-1">
                    <Film size={24} className="text-gray-400" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center"><Play size={24} className="text-white opacity-0 group-hover:opacity-100" /></div>
                  </div>
                ) : (
                  <img src={a.fileUrl} alt={a.name} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-1 left-1"><span className={`text-[10px] px-1 py-0.5 rounded ${a.category === 'product' ? 'bg-blue-100 text-blue-700' : a.category === 'competitor' ? 'bg-red-100 text-red-700' : a.category === 'ugc' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{a.category}</span></div>
                <div className="absolute top-1 right-1" onClick={e => { e.stopPropagation(); toggle(a.id); }}>
                  {selected.has(a.id) ? <CheckSquare size={14} className="text-brand-500" /> : <Square size={14} className="text-white/40" />}
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{a.name}</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  {a.type === 'video' ? <Film size={10} /> : <Image size={10} />}
                  {fmt(a.size)} · {a.country ? `${a.country} ` : ''}{a.language ? a.language : ''}
                </p>
                <div className="flex items-center gap-1 mt-1 pt-1 border-t">
                  <a href={a.fileUrl} download className="p-1 hover:bg-gray-100 rounded"><Download size={12} className="text-gray-400" /></a>
                  <button onClick={() => del(a.id)} className="p-1 hover:bg-red-50 rounded ml-auto"><Trash2 size={12} className="text-gray-400 hover:text-red-500" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
