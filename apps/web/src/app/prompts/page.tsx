'use client';
import { useEffect, useState, useCallback } from 'react';
import { ago } from '@/lib/utils';
import { Sparkles, Copy, Check, Download, RefreshCw, Trash2, FileJson, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/i18n';

type ExportMode = 'json' | 'txt';

export default function PromptsPage() {
  const [storyboards, setStoryboards] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    const [sb, p] = await Promise.all([
      fetch('/api/storyboards').then(r => r.json()).catch(() => []),
      fetch('/api/prompts').then(r => r.json()).catch(() => []),
    ]);
    setStoryboards(sb); setPrompts(p); setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generateSingle = async (storyboardId: string) => {
    setGenerating(true);
    await fetch('/api/prompts/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyboardId, models: ['seedance', 'kling', 'veo'] }),
    });
    setGenerating(false);
    loadData();
  };

  const generateBulk = async (scriptId: string) => {
    if (!confirm('Generate 3 prompts (Seedance + Kling + Veo) for every shot?')) return;
    setGenerating(true);
    const res = await fetch('/api/prompts/generate-bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptId, models: ['seedance', 'kling', 'veo'] }),
    });
    const data = await res.json();
    setGenerating(false);
    loadData();
    alert(`Generated ${data.count} prompts!`);
  };

  const grouped: Record<string, { sbs: any[]; script: any }> = {};
  for (const sb of storyboards) {
    const key = sb.script?.id || 'unknown';
    if (!grouped[key]) grouped[key] = { sbs: [], script: sb.script };
    grouped[key].sbs.push(sb);
  }

  // Group prompts by storyboardId
  const promptsByShot: Record<string, any[]> = {};
  for (const p of prompts) {
    const key = p.storyboardId;
    if (!promptsByShot[key]) promptsByShot[key] = [];
    promptsByShot[key].push(p);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Prompt Generator</h2>
          <p className="text-gray-500 text-sm">Per-scene prompts optimized for Seedance, Kling, and Veo</p>
        </div>
        <div className="flex gap-2">
          <ExportBtn mode="json" prompts={prompts} />
          <ExportBtn mode="txt" prompts={prompts} />
        </div>
      </div>

      {/* Generator */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles size={18} /> Generate</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium mb-2">Shot-by-Shot</p>
            <select className="input text-sm" onChange={e => { if (e.target.value) generateSingle(e.target.value); e.target.value = ''; }}>
              <option value="">Pick a shot...</option>
              {storyboards.slice(0, 30).map((s: any) => (
                <option key={s.id} value={s.id}>Shot #{s.sceneNumber} — {s.script?.product?.product_name?.slice(0, 25)} ({s.shotType})</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Bulk Generate (All Shots × 3 Models)</p>
            <select className="input text-sm" onChange={e => { if (e.target.value) generateBulk(e.target.value); e.target.value = ''; }}>
              <option value="">Pick a script...</option>
              {Object.entries(grouped).map(([sid, { sbs, script }]) => (
                <option key={sid} value={sid}>{script?.product_name} — {sbs.length} shots</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Results ({prompts.length})</h3>
        <div className="flex gap-1">
          {['seedance', 'kling', 'veo'].map(m => {
            const count = prompts.filter((p: any) => p.model === m).length;
            return <span key={m} className={`text-xs px-2 py-1 rounded font-medium ${m === 'seedance' ? 'bg-purple-100 text-purple-700' : m === 'kling' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{m}: {count}</span>;
          })}
        </div>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400">Loading...</p>
      ) : prompts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
          <p>No prompts yet. Generate storyboards first, then generate prompts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(promptsByShot).map(([sid, pList]) => {
            const sb = storyboards.find(s => s.id === sid);
            return (
              <div key={sid} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="badge-blue text-xs">Shot #{sb?.sceneNumber}</span>
                    <span className="text-sm font-medium">{sb?.script?.product?.product_name}</span>
                    <span className="text-xs text-gray-400">{sb?.shotType} · {sb?.camera}</span>
                  </div>
                  <button onClick={() => generateSingle(sid)} className="text-xs text-gray-400 hover:text-brand-500 flex items-center gap-1">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['seedance', 'kling', 'veo'].map(model => {
                    const p = pList.find((x: any) => x.model === model);
                    if (!p) return <div key={model} className="border rounded-lg p-3 text-xs text-gray-300 text-center py-8">No {model} prompt</div>;
                    return <PromptCard key={p.id} prompt={p} onReload={loadData} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {generating && (
        <div className="fixed bottom-4 right-4 bg-brand-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">Generating...</div>
      )}
    </div>
  );
}

// ── Components ─────────────────────────────────────────────────────────

function PromptCard({ prompt: p, onReload }: { prompt: any; onReload: () => void }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(p.prompt);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    await fetch(`/api/prompts/${p.id}/regenerate`, { method: 'POST' });
    onReload();
  };

  const colors: Record<string, string> = {
    seedance: 'border-purple-200 bg-purple-50/30',
    kling: 'border-blue-200 bg-blue-50/30',
    veo: 'border-green-200 bg-green-50/30',
  };

  const labels: Record<string, string> = {
    seedance: 'Seedance 2.0', kling: 'Kling AI', veo: 'Veo 2',
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${colors[p.model] || ''}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-white/50 border-b">
        <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
          p.model === 'seedance' ? 'bg-purple-100 text-purple-700' : p.model === 'kling' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>{labels[p.model] || p.model}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={copy} className="p-1 hover:bg-white rounded text-xs text-gray-400">{copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}</button>
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-white rounded text-gray-400">{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
          <button onClick={regenerate} className="p-1 hover:bg-white rounded text-gray-400"><RefreshCw size={12} /></button>
        </div>
      </div>
      <div className="p-3">
        <p className={`text-xs leading-relaxed text-gray-700 font-mono ${expanded ? '' : 'line-clamp-4'}`}>{p.prompt}</p>
        {expanded && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Negative Prompt:</p>
            <p className="text-xs text-red-500 font-mono">{p.negativePrompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportBtn({ mode, prompts }: { mode: ExportMode; prompts: any[] }) {
  const label = mode === 'json' ? 'JSON' : 'TXT';
  const Icon = mode === 'json' ? FileJson : FileText;

  const handleExport = () => {
    if (mode === 'json') {
      const data = prompts.map((p: any) => ({
        sceneNumber: p.sceneNumber, model: p.model,
        product: p.storyboard?.script?.product?.product_name,
        prompt: p.prompt, negativePrompt: p.negativePrompt,
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'ai_video_prompts.json'; a.click();
      URL.revokeObjectURL(url);
    } else {
      let text = 'AI Video Prompts\n' + '='.repeat(60) + '\n\n';
      const grouped: Record<string, any[]> = {};
      for (const p of prompts) {
        const key = `${p.storyboardId}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      }
      for (const [, group] of Object.entries(grouped)) {
        const info = group[0];
        text += `Shot #${info.sceneNumber} — ${info.storyboard?.script?.product?.product_name || 'Unknown'}\n`;
        text += '-'.repeat(40) + '\n';
        for (const g of group) {
          text += `\n[${g.model.toUpperCase()}]\n${g.prompt}\nNegative: ${g.negativePrompt}\n`;
        }
        text += '\n';
      }
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'ai_video_prompts.txt'; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button onClick={handleExport} disabled={prompts.length === 0}
      className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3 disabled:opacity-50">
      <Icon size={12} /> Export {label}
    </button>
  );
}
