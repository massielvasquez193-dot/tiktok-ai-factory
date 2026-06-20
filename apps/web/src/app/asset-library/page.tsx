'use client';
import { useEffect, useState, useRef } from 'react';
import { Upload, Trash2, Filter, X, Search, Image, Film, Play, Download, CheckSquare, Square, Grid3X3 } from 'lucide-react';
import { useTranslation } from '@/i18n';

const TYPE_ICONS: Record<string, any> = { product_image: Image, product_video: Film, ugc_talking: Play, broll: Film, brand_logo: Image, competitor_video: Film };

export default function AssetLibraryPage() {
  const [data, setData] = useState<any>({ items: [], products: [], types: [] });
  const [loading, setL] = useState(true);
  const [ftype, setFtype] = useState('');
  const [fprod, setFprod] = useState('');
  const [fcountry, setFcountry] = useState('');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [previewT, setPreviewT] = useState('image');

  // Upload form
  const [utype, setUtype] = useState('product_image');
  const [uprod, setUprod] = useState('');
  const [ucountry, setUcountry] = useState('');
  const [utags, setUtags] = useState('');
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const load = () => {
    const p = new URLSearchParams();
    if (ftype) p.set('type', ftype); if (fprod) p.set('productId', fprod); if (fcountry) p.set('country', fcountry); if (search) p.set('search', search);
    fetch('/api/asset-library?' + p).then(r => r.json()).then(setData).catch(() => {}).finally(() => setL(false));
  };
  useEffect(() => { load(); }, [ftype, fprod, fcountry, search]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return; setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    fd.append('type', utype); fd.append('productId', uprod); fd.append('country', ucountry); fd.append('tags', utags);
    await fetch('/api/asset-library/upload', { method: 'POST', body: fd }); setUploading(false); if (ref.current) ref.current.value = ''; load();
  };

  const del = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/asset-library/' + id, { method: 'DELETE' }); load(); };
  const delSel = async () => { if (!sel.size) return; if (!confirm(`Delete ${sel.size}?`)) return; await fetch('/api/asset-library/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(sel) }) }); setSel(new Set()); load(); };
  const toggle = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold">Asset Library</h2><p className="text-gray-500 text-sm">{data.items?.length || 0} assets · {data.types?.length || 6} types</p></div>
        <div className="flex gap-2">
          {sel.size > 0 && <button onClick={delSel} className="btn-secondary text-sm flex items-center gap-1 text-red-500"><Trash2 size={14} /> Delete ({sel.size})</button>}
          <label className="btn-primary text-sm flex items-center gap-2 cursor-pointer"><Upload size={14} /> {uploading ? 'Uploading...' : 'Upload'}<input ref={ref} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} /></label>
        </div>
      </div>

      {/* Upload Config */}
      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-3">
          <div><label className="text-xs mb-1 block">Type</label><select className="input text-xs py-1.5" value={utype} onChange={e => setUtype(e.target.value)}>{data.types?.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label className="text-xs mb-1 block">Product</label><select className="input text-xs py-1.5" value={uprod} onChange={e => setUprod(e.target.value)}><option value="">None</option>{data.products?.map((p: any) => <option key={p.id} value={p.id}>{p.product_name}</option>)}</select></div>
          <div><label className="text-xs mb-1 block">Country</label><select className="input text-xs py-1.5" value={ucountry} onChange={e => setUcountry(e.target.value)}><option value="">All</option>{'US,UK,MY,TH,PH,VN,ID,SG,CA,AU'.split(',').map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="text-xs mb-1 block">Tags</label><input className="input text-xs py-1.5" value={utags} onChange={e => setUtags(e.target.value)} placeholder="comma, separated" /></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative"><Search size={14} className="absolute left-2 top-2.5 text-gray-400" /><input className="input text-xs py-1.5 pl-7 w-48" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="input text-xs py-1.5 w-36" value={ftype} onChange={e => setFtype(e.target.value)}><option value="">All Types</option>{data.types?.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        <select className="input text-xs py-1.5 w-36" value={fprod} onChange={e => setFprod(e.target.value)}><option value="">All Products</option>{data.products?.map((p: any) => <option key={p.id} value={p.id}>{p.product_name}</option>)}</select>
        <select className="input text-xs py-1.5 w-28" value={fcountry} onChange={e => setFcountry(e.target.value)}><option value="">All</option>{'US,UK,MY,TH,PH,VN,ID,SG,CA,AU'.split(',').map(c => <option key={c} value={c}>{c}</option>)}</select>
        <button onClick={() => { setFtype(''); setFprod(''); setFcountry(''); setSearch(''); }} className="text-xs text-gray-400 flex items-center gap-1"><X size={12} /> Clear</button>
        <span className="text-xs text-gray-400 ml-auto">{data.items?.length} results</span>
      </div>

      {/* Preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setPreview(null)}>
          <div className="relative max-w-2xl" onClick={e => e.stopPropagation()}><button onClick={() => setPreview(null)} className="absolute -top-8 right-0 text-white"><X size={20} /></button>
            {previewT === 'video' ? <video src={preview} controls autoPlay className="max-h-[85vh] rounded-xl" /> : <img src={preview} className="max-h-[85vh] rounded-xl" />}
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? <p className="text-center py-12 text-gray-400">Loading...</p> : data.items?.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Image size={40} className="mx-auto mb-3 opacity-30" /><p>Upload your first asset</p></div>
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {data.items.map((a: any) => {
            const Icon = TYPE_ICONS[a.type] || Image;
            return (
              <div key={a.id} className={`card p-0 overflow-hidden group ${sel.has(a.id) ? 'ring-2 ring-brand-500' : ''}`}>
                <div className="aspect-square bg-gray-100 relative cursor-pointer flex items-center justify-center" onClick={() => { setPreview(a.fileUrl); setPreviewT(a.type.includes('video') ? 'video' : 'image'); }}>
                  {a.type.includes('video') ? <div className="flex flex-col items-center gap-1"><Film size={24} className="text-gray-400" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center"><Play size={24} className="text-white opacity-0 group-hover:opacity-100" /></div></div> : <img src={a.fileUrl} className="w-full h-full object-cover" />}
                  <span className="absolute top-1 left-1 text-[10px] px-1 py-0.5 rounded bg-white/80 text-gray-600">{a.type.replace(/_/g, ' ')}</span>
                  <div className="absolute top-1 right-1" onClick={e => { e.stopPropagation(); toggle(a.id); }}>{sel.has(a.id) ? <CheckSquare size={14} className="text-brand-500" /> : <Square size={14} className="text-white/40" />}</div>
                </div>
                <div className="p-2">
                  <p className="text-xs truncate">{a.name}</p>
                  <p className="text-[10px] text-gray-400">{a.country || 'All'} · {(a.size / 1024 / 1024).toFixed(1)}MB</p>
                  <button onClick={() => del(a.id)} className="mt-1 text-[10px] text-red-400 hover:text-red-600">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
