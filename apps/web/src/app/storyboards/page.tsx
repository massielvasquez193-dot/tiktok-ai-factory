'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ago } from '@/lib/utils';
import { Layout, Sparkles, Edit3, Save, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/i18n';

const CAMERAS = ['POV handheld', 'Overhead flat-lay', 'Macro close-up', 'Static tripod', 'Dolly slide', 'Slow push-in', 'Wide angle'];
const SHOT_TYPES = ['hook', 'reveal', 'demo', 'lifestyle', 'closeUp', 'transition', 'cta'];
const ACTORS = ['Female 25-35', 'Male 25-35', 'Hands only', 'Product only', 'Couple', 'Voiceover'];

export default function StoryboardsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [storyboards, setStoryboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scriptId, setScriptId] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = useCallback(async () => {
    const [sc, sb] = await Promise.all([
      api.getScripts().catch(() => []),
      fetch('/api/storyboards').then(r => r.json()).catch(() => []),
    ]);
    setScripts(sc); setStoryboards(sb); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!scriptId) return alert('Select a script');
    setGenerating(true);
    try {
      const res = await fetch('/api/storyboards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId }),
      });
      const data = await res.json();
      alert(`Generated ${data.count} shots!`);
      load();
    } catch (e) { alert('Failed'); }
    setGenerating(false);
  };

  const regenerateShot = async (id: string) => {
    await fetch(`/api/storyboards/${id}/regenerate`, { method: 'POST' });
    load();
  };

  const delShot = async (id: string) => {
    if (!confirm('Delete this shot?')) return;
    await fetch(`/api/storyboards/${id}`, { method: 'DELETE' });
    load();
  };

  const startEdit = (sb: any) => {
    setEditing(sb.id);
    setEditForm({ ...sb });
  };
  const saveEdit = async () => {
    if (!editing) return;
    await fetch(`/api/storyboards/${editing}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    load();
  };
  const cancelEdit = () => setEditing(null);

  const toggleExpand = (scriptId: string) => {
    const next = new Set(expanded);
    next.has(scriptId) ? next.delete(scriptId) : next.add(scriptId);
    setExpanded(next);
  };

  // Group storyboards by scriptId
  const grouped: Record<string, any[]> = {};
  for (const sb of storyboards) {
    const key = sb.scriptId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(sb);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Storyboard Generator</h2>
        <p className="text-gray-500 text-sm">Auto-generate shot-by-shot video storyboards from scripts</p>
      </div>

      {/* Generator */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles size={18} /> Generate Storyboard</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Script</label>
            <select className="input" value={scriptId} onChange={e => setScriptId(e.target.value)}>
              <option value="">-- Select a script --</option>
              {scripts.map((s: any) => (
                <option key={s.id} value={s.id}>
                  [{s.language}] {s.scriptType} — {s.product?.product_name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={generate} disabled={generating || !scriptId} className="btn-primary flex items-center gap-2">
            <Layout size={16} /> {generating ? 'Generating...' : 'Generate Storyboard'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-12 text-gray-400">Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <Layout size={32} className="mx-auto mb-2 opacity-30" />
            <p>No storyboards yet. Select a script above and generate!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([sid, shots]) => {
            const script = scripts.find(s => s.id === sid);
            const isExpanded = expanded.has(sid);
            return (
              <div key={sid} className="card">
                {/* Header */}
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(sid)}>
                  <div className="flex items-center gap-3">
                    <Layout size={18} className="text-brand-500" />
                    <div>
                      <p className="font-medium text-sm">
                        {script?.product?.product_name || 'Unknown'} — {script?.scriptType} ({script?.language})
                      </p>
                      <p className="text-xs text-gray-500">{shots.length} shots · {shots.reduce((a, s) => a + s.duration, 0)}s total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); setScriptId(sid); generate(); }}
                      className="text-xs text-brand-500 hover:underline flex items-center gap-1">
                      <RefreshCw size={12} /> Regenerate All
                    </button>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Shot List */}
                {isExpanded && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2 pb-2 border-b">
                      <div className="col-span-1">#</div>
                      <div className="col-span-2">Camera</div>
                      <div className="col-span-1">Type</div>
                      <div className="col-span-1">Actor</div>
                      <div className="col-span-1">Dur</div>
                      <div className="col-span-4">Subtitle</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    {shots.sort((a, b) => a.sceneNumber - b.sceneNumber).map((shot: any) => (
                      editing === shot.id ? (
                        /* Edit Mode */
                        <div key={shot.id} className="grid grid-cols-12 gap-2 p-3 bg-blue-50 rounded-lg text-xs">
                          <div className="col-span-1 font-bold">{shot.sceneNumber}</div>
                          <select className="col-span-2 border rounded px-1 py-0.5" value={editForm.camera} onChange={e => setEditForm({ ...editForm, camera: e.target.value })}>
                            {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select className="col-span-1 border rounded px-1 py-0.5" value={editForm.shotType} onChange={e => setEditForm({ ...editForm, shotType: e.target.value })}>
                            {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <select className="col-span-1 border rounded px-1 py-0.5" value={editForm.actor} onChange={e => setEditForm({ ...editForm, actor: e.target.value })}>
                            {ACTORS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                          <input className="col-span-1 border rounded px-1 py-0.5 text-center" type="number" value={editForm.duration} onChange={e => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 1 })} />
                          <input className="col-span-3 border rounded px-1 py-0.5" value={editForm.subtitle} onChange={e => setEditForm({ ...editForm, subtitle: e.target.value })} />
                          <div className="col-span-3 flex gap-1 justify-end">
                            <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 px-2 py-0.5 rounded"><Save size={12} /></button>
                            <button onClick={cancelEdit} className="text-gray-400 hover:bg-gray-100 px-2 py-0.5 rounded">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div key={shot.id} className="grid grid-cols-12 gap-2 p-2 hover:bg-gray-50 rounded-lg text-xs items-center">
                          <div className="col-span-1 font-bold text-gray-700">{shot.sceneNumber}</div>
                          <div className="col-span-2 text-gray-600 truncate">{shot.camera}</div>
                          <div className="col-span-1"><span className="badge-blue">{shot.shotType}</span></div>
                          <div className="col-span-1 text-gray-500">{shot.actor}</div>
                          <div className="col-span-1 text-center font-mono">{shot.duration}s</div>
                          <div className="col-span-4 text-gray-600 truncate">{shot.subtitle}</div>
                          <div className="col-span-2 flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(shot)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500"><Edit3 size={12} /></button>
                            <button onClick={() => regenerateShot(shot.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-green-500"><RefreshCw size={12} /></button>
                            <button onClick={() => delShot(shot.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                          </div>
                          {/* Visual Prompt tooltip */}
                          <div className="col-span-12 mt-1 text-xs text-gray-400 italic truncate pl-1">
                            AI Prompt: {shot.visualPrompt}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
