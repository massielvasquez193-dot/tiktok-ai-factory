'use client';
import { useEffect, useState } from 'react';
import { Settings, Sparkles, Download, CheckCircle, Clock, Loader2, Film, Volume2, Type, Tag, Percent, Image } from 'lucide-react';
import { useTranslation } from '@/i18n';

const LANG_MAP: Record<string, string> = { US: 'en', UK: 'en', MY: 'ms', TH: 'th', PH: 'fil', VN: 'vi', ID: 'id', SG: 'en', CA: 'en', AU: 'en' };
const CTA: Record<string, Record<string, string>> = {
  en: { buy: 'Buy Now', shop: 'Shop Now', limited: 'Limited Time', get: 'Get Yours Today' },
  ms: { buy: 'Beli Sekarang', shop: 'Beli Sekarang', limited: 'Masa Terhad', get: 'Dapatkan Hari Ini' },
  th: { buy: 'ซื้อเลย', shop: 'ซื้อเลย', limited: 'เวลาจำากัด', get: 'รับของคุณวันนี้' },
  fil: { buy: 'Bili Na', shop: 'Bili Na', limited: 'Limitadong Oras', get: 'Kunin Ngayon' },
  vi: { buy: 'Mua Ngay', shop: 'Mua Ngay', limited: 'Thoi Gian Co Han', get: 'Nhan Ngay Hom Nay' },
  id: { buy: 'Beli Sekarang', shop: 'Beli Sekarang', limited: 'Waktu Terbatas', get: 'Dapatkan Hari Ini' },
};

export default function PostProductionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ bgms: [] });
  const [loading, setL] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [videoId, setVid] = useState(''); const [country, setC] = useState('US');
  const [ctaType, setCta] = useState('buy'); const [priceTag, setP] = useState('$29.99');
  const [discountTag, setD] = useState(''); const [logoPos, setLp] = useState('top-right');
  const [bgm, setB] = useState('tiktok_trending');

  const load = () => {
    Promise.all([
      fetch('/api/post-production').then(r => r.json()).catch(() => []),
      fetch('/api/videos').then(r => r.json()).then(d => d.items || []).catch(() => []),
      fetch('/api/post-production/config').then(r => r.json()).catch(() => ({ bgms: [] })),
    ]).then(([p, v, c]) => { setItems(p); setVideos(v); setConfig(c); setL(false); });
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!videoId) return alert('Select video'); setSubmitting(true);
    const lang = LANG_MAP[country] || 'en';
    await fetch('/api/post-production/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, country, language: lang, ctaType, priceTag, discountTag, logoPosition: logoPos, bgm }) });
    setSubmitting(false); load();
  };

  const render = async (id: string) => { await fetch('/api/post-production/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); load(); };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await fetch('/api/post-production/' + id, { method: 'DELETE' }); load(); };

  const lang = LANG_MAP[country] || 'en';
  const ctaLabel = CTA[lang]?.[ctaType] || 'Buy Now';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Film size={24} /> Post Production</h2><p className="text-gray-500 text-sm">Subtitle · CTA · Price · Discount · Logo · BGM · Thumbnail</p></div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4"><Settings size={18} className="inline mr-2" />Produce Video</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div><label className="text-xs mb-1 block">Video</label><select className="input text-xs py-1.5" value={videoId} onChange={e => setVid(e.target.value)}><option value="">Select...</option>{videos.map(v => <option key={v.id} value={v.id}>{v.title?.slice(0,35) || v.id?.slice(0,12)}</option>)}</select></div>
          <div><label className="text-xs mb-1 block">Country</label><select className="input text-xs py-1.5" value={country} onChange={e => setC(e.target.value)}>{Object.keys(LANG_MAP).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="text-xs mb-1 block"><Type size={12} className="inline" /> CTA</label><select className="input text-xs py-1.5" value={ctaType} onChange={e => setCta(e.target.value)}>{Object.entries(CTA[lang] || CTA.en).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div><label className="text-xs mb-1 block"><Tag size={12} className="inline" /> Price</label><input className="input text-xs py-1.5" value={priceTag} onChange={e => setP(e.target.value)} /></div>
          <div><label className="text-xs mb-1 block"><Percent size={12} className="inline" /> Discount</label><select className="input text-xs py-1.5" value={discountTag} onChange={e => setD(e.target.value)}><option value="">None</option><option>20% OFF</option><option>30% OFF</option><option>50% OFF</option><option>Buy 1 Get 1</option></select></div>
          <div><label className="text-xs mb-1 block"><Image size={12} className="inline" /> Logo</label><select className="input text-xs py-1.5" value={logoPos} onChange={e => setLp(e.target.value)}>{['top-left','top-right','bottom-left','bottom-right'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div><label className="text-xs mb-1 block"><Volume2 size={12} className="inline" /> BGM</label><select className="input text-xs py-1.5" value={bgm} onChange={e => setB(e.target.value)}>{config.bgms?.map((b: string) => <option key={b} value={b}>{b}</option>)}</select></div>
        </div>
        <button onClick={create} disabled={submitting || !videoId} className="btn-primary text-sm">{submitting ? 'Creating...' : `Create — CTA: ${ctaLabel}`}</button>
      </div>

      <h3 className="font-semibold mb-3">Productions ({items.length})</h3>
      <div className="space-y-3">
        {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : items.length === 0 ? <div className="card text-center py-12 text-gray-400"><Film size={32} className="mx-auto mb-2 opacity-30" /><p>Select a video and create an edit</p></div> : items.map(p => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {p.status === 'edited' ? <CheckCircle size={18} className="text-green-500" /> : p.status === 'rendering' ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : <Clock size={18} className="text-gray-400" />}
                <div>
                  <p className="font-medium text-sm">{p.country} — {p.language}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span className="bg-green-50 px-1.5 py-0.5 rounded">CTA: {p.cta}</span>
                    {p.priceTag && <span className="bg-blue-50 px-1.5 py-0.5 rounded">{p.priceTag}</span>}
                    {p.discountTag && <span className="bg-red-50 px-1.5 py-0.5 rounded">{p.discountTag}</span>}
                    <span className="bg-purple-50 px-1.5 py-0.5 rounded">{p.bgm}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${p.status === 'edited' ? 'badge-green' : p.status === 'rendering' ? 'badge-blue' : 'badge-yellow'}`}>{p.status}</span>
                {p.status === 'raw' && <button onClick={() => render(p.id)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1"><Sparkles size={12} /> Render</button>}
                {p.outputPath && <a href={p.outputPath} download className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Download size={12} /></a>}
                <button onClick={() => del(p.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
