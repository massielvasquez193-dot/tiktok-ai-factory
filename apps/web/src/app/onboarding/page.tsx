'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Building2, Cpu, Sparkles, Video, Share2, ChevronRight } from 'lucide-react';

const STEPS = [
  { key:'workspace', title:'Create Workspace', desc:'Set up your team workspace for AI video production', icon:Building2 },
  { key:'provider', title:'Connect AI Provider', desc:'Configure your AI providers (LLM, Video, TTS)', icon:Cpu },
  { key:'product', title:'Add First Product', desc:'Upload product images and details', icon:Sparkles },
  { key:'video', title:'Generate First Video', desc:'Run your first AI pipeline to create a video', icon:Video },
  { key:'publish', title:'Publish & Share', desc:'Schedule your video to TikTok or other platforms', icon:Share2 },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  function complete(key: string) { setCompleted(prev => new Set([...prev, key])); if (step < STEPS.length - 1) setStep(step + 1); }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
        <h2 className="font-bold text-lg mb-6"><span className="text-brand-500">TikTok</span> AI Factory</h2>
        <div className="space-y-1 flex-1">
          {STEPS.map((s, i) => (
            <button key={s.key} onClick={()=>setStep(i)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${step===i?'bg-brand-50 text-brand-700 font-medium':completed.has(s.key)?'text-green-600':'text-gray-500 hover:bg-gray-50'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step===i?'bg-brand-500 text-white':completed.has(s.key)?'bg-green-500 text-white':'bg-gray-200 text-gray-500'}`}>{completed.has(s.key)?<Check size={14}/>:i+1}</span>
              {s.title}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-12 flex items-center justify-center">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-6">{(()=>{ const I = STEPS[step].icon; return <I size={36} className="text-brand-600"/>; })()}</div>
          <h1 className="text-2xl font-bold mb-2">{STEPS[step].title}</h1>
          <p className="text-gray-500 mb-8">{STEPS[step].desc}</p>
          <div className="space-y-4">
            {step === 0 && <div className="card text-left"><input className="input" placeholder="My Brand Co." /><p className="text-xs text-gray-400 mt-2">You can change this later</p><button onClick={()=>complete('workspace')} className="btn-primary w-full mt-4">Create Workspace <ArrowRight size={14} className="inline"/></button></div>}
            {step === 1 && <div className="card text-left space-y-3"><p className="text-sm text-gray-600">Select which AI provider to connect first:</p>{['DeepSeek (LLM)','Seedance (Video)','ElevenLabs (TTS)'].map(p=><label key={p} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><input type="checkbox" /><span className="text-sm">{p}</span></label>)}<button onClick={()=>complete('provider')} className="btn-primary w-full mt-4">Continue <ArrowRight size={14} className="inline"/></button></div>}
            {step === 2 && <div className="card text-left"><p className="text-sm text-gray-600 mb-3">Add your first product to get started:</p><input className="input mb-2" placeholder="Product name" /><textarea className="input mb-2" rows={2} placeholder="Description" /><input className="input mb-4" type="file" /><button onClick={()=>complete('product')} className="btn-primary w-full">Save Product <ArrowRight size={14} className="inline"/></button></div>}
            {step === 3 && <div className="card text-center"><div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4"><Video size={28} className="text-purple-600"/></div><p className="text-gray-600 mb-4 text-sm">Your AI pipeline is ready. Generate your first video now.</p><button onClick={()=>complete('video')} className="btn-primary w-full">Generate First Video <Sparkles size={14} className="inline"/></button></div>}
            {step === 4 && <div className="card text-center"><div className="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4"><Check size={28} className="text-green-600"/></div><h3 className="text-lg font-bold text-gray-900 mb-2">You&apos;re all set! 🎉</h3><p className="text-gray-500 mb-4 text-sm">Your TikTok AI Factory is ready to produce videos. Publish your first video or explore the dashboard.</p><Link href="/" className="btn-primary inline-flex items-center gap-2">Go to Dashboard <ChevronRight size={14}/></Link></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
