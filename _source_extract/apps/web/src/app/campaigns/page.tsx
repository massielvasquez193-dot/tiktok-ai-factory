'use client';
import { useEffect, useState, useRef } from 'react';
import { ago } from '@/lib/utils';
import { Plus, Play, Upload, Trash2, Loader2, CheckCircle, AlertTriangle, Clock, RefreshCw, Zap, ArrowRight, Rocket } from 'lucide-react';
import { useTranslation } from '@/i18n';

const COUNTRIES = ['US', 'MY', 'SG', 'TH', 'PH'];
const LANGUAGES = ['en', 'ms', 'th', 'fil', 'es'];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', competitorUrl: '', country: 'US', language: 'en', scriptCount: 10,
  });
  const [prodImage, setProdImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');

  const load = () => {
    fetch('/api/campaigns').then(r => r.json()).then(setCampaigns).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Poll running campaigns
  useEffect(() => {
    const running = campaigns.some(c => c.status === 'running');
    if (!running) return;
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [campaigns]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProdImage(f);
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert('Name required');
    setSubmitting(true);
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('competitorUrl', form.competitorUrl);
    fd.append('country', form.country);
    fd.append('language', form.language);
    fd.append('scriptCount', String(form.scriptCount));
    if (prodImage) fd.append('productImage', prodImage);

    const res = await fetch('/api/campaigns', { method: 'POST', body: fd });
    const c = await res.json();
    setSubmitting(false); setShowForm(false); load();
    setForm({ name: '', competitorUrl: '', country: 'US', language: 'en', scriptCount: 10 });
    setProdImage(null); setPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const run = async (id: string) => {
    await fetch(`/api/campaigns/${id}/run`, { method: 'POST' });
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    load();
  };

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle size={14} className="text-green-500" />;
    if (s === 'running') return <Loader2 size={14} className="text-blue-500 animate-spin" />;
    if (s === 'failed') return <AlertTriangle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-gray-400" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold">Campaigns</h2><p className="text-gray-500 text-sm">{campaigns.length} campaigns</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Campaign</button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Rocket size={18} /> One Click Campaign: Upload → Research → Scripts → Storyboard → Prompt → Seedance → Video</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Campaign Name *</label>
                <input className="input text-sm" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Summer Product Launch" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Competitor URL</label>
                <input className="input text-sm" value={form.competitorUrl} onChange={e => setForm({ ...form, competitorUrl: e.target.value })} placeholder="TikTok/YouTube video URL" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Country</label>
                <select className="input text-sm" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Language</label>
                <select className="input text-sm" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Script Count</label>
                <select className="input text-sm" value={form.scriptCount} onChange={e => setForm({ ...form, scriptCount: Number(e.target.value) })}>
                  {[1, 3, 5, 10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Product Image</label>
                <label className="input text-sm cursor-pointer flex items-center gap-2 text-gray-400">
                  <Upload size={14} /> {prodImage ? prodImage.name : 'Upload image'}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </label>
              </div>
            </div>
            {preview && <img src={preview} alt="" className="w-32 h-32 object-cover rounded-lg border" />}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Creating...' : 'Create Campaign'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Campaign List */}
      <div className="space-y-3">
        {loading ? <p className="text-center py-12 text-gray-400">Loading...</p> : campaigns.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No campaigns yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 mt-4"><Plus size={14} /> Create Campaign</button>
          </div>
        ) : campaigns.map(c => (
          <div key={c.id} className={`card ${c.status === 'running' ? 'border-blue-200 bg-blue-50/30' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {statusIcon(c.status)}
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">
                    {c.country} · {c.language} · {c.scriptCount} scripts
                    {c.competitorUrl ? ' · competitor: yes' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {c.status === 'running' && (
                  <div className="w-32">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${c.progress}%` }} />
                    </div>
                  </div>
                )}
                <span className={`text-xs ${c.status === 'completed' ? 'badge-green' : c.status === 'running' ? 'badge-blue' : c.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>{c.status}</span>
                <span className="text-xs text-gray-400">{ago(c.createdAt)}</span>
                {c.status === 'completed' && (
                  <button onClick={() => run(c.id)} className="btn-secondary text-xs flex items-center gap-1 py-1 px-2"><RefreshCw size={12} /> Re-run</button>
                )}
                {c.status === 'draft' && (
                  <button onClick={() => run(c.id)} className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3"><Play size={12} /> Run</button>
                )}
                {c.status === 'failed' && (
                  <button onClick={() => run(c.id)} className="btn-secondary text-xs flex items-center gap-1 py-1 px-2 text-orange-500"><RefreshCw size={12} /> Retry</button>
                )}
                <button onClick={() => del(c.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button>
              </div>
            </div>
            {c.status === 'running' && (
              <div className="mt-3 flex items-center gap-6 text-xs text-gray-500">
                <span>{c.progress < 10 ? '1/7 Researching...' : c.progress < 20 ? '2/7 Analyzing product...' : c.progress < 40 ? '3/7 Generating scripts...' : c.progress < 55 ? '4/7 Storyboarding...' : c.progress < 65 ? '5/7 Building prompts...' : c.progress < 90 ? '6/7 Calling Seedance API...' : '7/7 Finalizing...'}</span>
                <ArrowRight size={12} className="text-gray-300" />
                <span>{c.progress}%</span>
              </div>
            )}
            {c.result && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2 font-mono">
                {c.result}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
