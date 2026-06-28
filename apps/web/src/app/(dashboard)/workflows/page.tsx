'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { GitBranch, Plus, Play, Pause, ArrowRight, GripVertical, Settings, Clock, Repeat, Zap } from 'lucide-react';

const PIPELINE_STEPS = [
  { key: 'research', label: 'Research', icon: '🔬', color: 'bg-blue-100 border-blue-300' },
  { key: 'knowledge', label: 'Knowledge', icon: '🧠', color: 'bg-green-100 border-green-300' },
  { key: 'script', label: 'Script', icon: '✍️', color: 'bg-purple-100 border-purple-300' },
  { key: 'storyboard', label: 'Storyboard', icon: '🎞️', color: 'bg-yellow-100 border-yellow-300' },
  { key: 'prompt', label: 'Prompt', icon: '✨', color: 'bg-pink-100 border-pink-300' },
  { key: 'video', label: 'Video', icon: '🎬', color: 'bg-orange-100 border-orange-300' },
  { key: 'compose', label: 'Compose', icon: '🎙️', color: 'bg-cyan-100 border-cyan-300' },
  { key: 'publish', label: 'Publish', icon: '📤', color: 'bg-red-100 border-red-300' },
];

const MOCK_TEMPLATES = [
  { id:'1', name:'Full Pipeline', desc:'Research → Script → Video → Publish', steps: ['research','script','storyboard','prompt','video','compose','publish'], uses: 342 },
  { id:'2', name:'Quick Script + Video', desc:'Script → Storyboard → Video', steps: ['script','storyboard','prompt','video'], uses: 189 },
  { id:'3', name:'Research Only', desc:'Research → Knowledge', steps: ['research','knowledge'], uses: 87 },
  { id:'4', name:'Content Repurpose', desc:'Video → Script → Publish', steps: ['video','script','publish'], uses: 56 },
];

export default function WorkflowsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'builder' | 'templates'>('builder');
  const [selectedSteps, setSelectedSteps] = useState<string[]>(['research','script','storyboard','prompt','video']);

  function toggleStep(step: string) {
    setSelectedSteps(prev => prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><GitBranch size={24}/> Workflow Builder</h2><p className="text-sm text-gray-500">Visual pipeline builder for AI video workflows</p></div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16}/> New Workflow</button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['builder','templates'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab===t?'bg-white shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{t === 'builder' ? 'Pipeline Builder' : 'Templates'}</button>)}
      </div>

      {tab === 'builder' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><GitBranch size={16}/> Pipeline Canvas</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedSteps.map((step, i) => {
                const stepInfo = PIPELINE_STEPS.find(s => s.key === step)!;
                return (
                  <div key={step} className="flex items-center">
                    <div className={`px-3 py-2 rounded-lg border-2 ${stepInfo.color} text-sm font-medium flex items-center gap-2`}>
                      <span>{stepInfo.icon}</span><span>{stepInfo.label}</span><GripVertical size={12} className="text-gray-400 cursor-grab"/>
                    </div>
                    {i < selectedSteps.length - 1 && <ArrowRight size={16} className="text-gray-300 mx-1"/>}
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Available Steps</h4>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_STEPS.map(s => (
                  <button key={s.key} onClick={() => toggleStep(s.key)} className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${selectedSteps.includes(s.key) ? s.color + ' font-medium' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>{s.icon} {s.label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-primary flex items-center gap-2"><Play size={14}/>Run Pipeline</button>
              <button className="btn-secondary flex items-center gap-2"><Clock size={14}/>Schedule</button>
              <button className="btn-secondary flex items-center gap-2"><Settings size={14}/>Configure</button>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4">Pipeline Settings</h3>
            <div className="space-y-3 text-sm">
              <div><label className="block text-xs font-medium mb-1">Name</label><input className="input text-sm" placeholder="My Pipeline" /></div>
              <div><label className="block text-xs font-medium mb-1">Trigger</label><select className="input text-sm"><option>Manual</option><option>Schedule</option><option>Webhook</option></select></div>
              <div><label className="block text-xs font-medium mb-1">Product</label><select className="input text-sm"><option>Select product...</option></select></div>
              <div><label className="block text-xs font-medium mb-1">Language</label><select className="input text-sm"><option>English</option><option>Malay</option><option>Thai</option></select></div>
              <div><label className="block text-xs font-medium mb-1">Retry on Failure</label><select className="input text-sm"><option>Yes (max 3)</option><option>No</option></select></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_TEMPLATES.map(t => (
            <div key={t.id} className="card hover:shadow-md transition-shadow">
              <h3 className="font-semibold mb-1">{t.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{t.desc}</p>
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {t.steps.map((s, i) => (
                  <div key={s} className="flex items-center">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium">{PIPELINE_STEPS.find(p => p.key === s)?.icon} {PIPELINE_STEPS.find(p => p.key === s)?.label}</span>
                    {i < t.steps.length - 1 && <ArrowRight size={10} className="text-gray-300 mx-0.5"/>}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between"><span className="text-xs text-gray-400">{t.uses} uses</span><button className="text-xs px-3 py-1 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100">Use Template</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
