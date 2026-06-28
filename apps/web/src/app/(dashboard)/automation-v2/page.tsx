'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Zap, Clock, Repeat, Play, Pause, Settings, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

const MOCK_WORKFLOWS = [
  { id:'1', name:'Daily Product Videos', trigger:'schedule', schedule:'Every day at 9:00 AM', status:'active', steps:5, lastRun:'2 hours ago', nextRun:'Tomorrow 9:00 AM' },
  { id:'2', name:'Weekend Campaign Boost', trigger:'schedule', schedule:'Sat & Sun at 14:00', status:'paused', steps:3, lastRun:'2 days ago', nextRun:'Saturday 14:00' },
  { id:'3', name:'Trend Response', trigger:'webhook', schedule:'On webhook event', status:'active', steps:4, lastRun:'5 hours ago', nextRun:'On trigger' },
];

export default function AutomationV2Page() {
  const { user } = useAuth();
  const [workflows] = useState(MOCK_WORKFLOWS);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Zap size={24}/> Automation</h2><p className="text-sm text-gray-500">Workflow automation & scheduled tasks</p></div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16}/> New Workflow</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          {label:'Active Workflows',value:workflows.filter(w=>w.status==='active').length,icon:Play,color:'bg-green-50 text-green-700'},
          {label:'Paused',value:workflows.filter(w=>w.status==='paused').length,icon:Pause,color:'bg-yellow-50 text-yellow-700'},
          {label:'Total Runs Today',value:'12',icon:Repeat,color:'bg-blue-50 text-blue-700'},
        ].map(s=>(
          <div key={s.label} className="card"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}><s.icon size={20}/></div><div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p></div></div></div>
        ))}
      </div>

      <div className="space-y-3">
        {workflows.map(w => (
          <div key={w.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${w.status==='active'?'bg-green-100 text-green-600':'bg-yellow-100 text-yellow-600'}`}>{w.status==='active'?<Play size={18}/>:<Pause size={18}/>}</div>
                <div>
                  <p className="font-medium text-gray-900">{w.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5"><span className="flex items-center gap-1"><Clock size={10}/>{w.schedule}</span><span>{w.steps} steps</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs text-gray-500"><p>Last: {w.lastRun}</p><p>Next: {w.nextRun}</p></div>
                <button className="p-2 text-gray-400 hover:text-gray-600"><Settings size={16}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-6 text-center py-8">
        <Zap size={40} className="mx-auto text-gray-300 mb-3"/>
        <h3 className="font-semibold text-gray-700">Workflow Automation — Coming in Sprint 5</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Create automated pipelines that generate, compose, and publish videos on schedule or via webhook triggers.</p>
      </div>
    </div>
  );
}
