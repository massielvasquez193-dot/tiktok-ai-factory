'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Users, UserPlus, MessageSquare, Activity, Lock, Globe } from 'lucide-react';

export default function CollaborationPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-1"><Users size={24}/> Team Collaboration</h2>
      <p className="text-sm text-gray-500 mb-6">Share projects, prompts, and templates with your team</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { title:'Shared Projects', desc:'Create and share AI projects with team members', icon:FolderOpen2, count:'3 shared', color:'bg-blue-50 text-blue-700' },
          { title:'Prompt Library', desc:'Team-wide prompt library with favorites', icon:Share2, count:'12 prompts', color:'bg-purple-50 text-purple-700' },
          { title:'Activity Feed', desc:'Real-time team activity tracking', icon:Activity, count:'24 events today', color:'bg-green-50 text-green-700' },
          { title:'Comments', desc:'Comment on scripts, videos, and projects', icon:MessageSquare, count:'8 new', color:'bg-yellow-50 text-yellow-700' },
        ].map(c => (
          <div key={c.title} className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-2"><div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center`}><c.icon size={20}/></div><div><p className="font-medium text-gray-900 text-sm">{c.title}</p><p className="text-xs text-gray-500">{c.desc}</p></div></div>
            <p className="text-xs text-gray-400 mt-2">{c.count}</p>
          </div>
        ))}
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe size={16}/> Sharing Settings</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2"><div><p className="font-medium">Default visibility</p><p className="text-xs text-gray-500">Who can see new projects by default</p></div><select className="input w-40 text-xs"><option>Workspace only</option><option>Team members</option></select></div>
          <div className="flex items-center justify-between py-2"><div><p className="font-medium">Prompt sharing</p><p className="text-xs text-gray-500">Allow team members to share prompts</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer"/><div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 rounded-full peer peer-checked:bg-brand-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div></label></div>
        </div>
      </div>

      <div className="card text-center py-8">
        <Users size={40} className="mx-auto text-gray-300 mb-3"/>
        <h3 className="font-semibold text-gray-700">Real-time Collaboration — Coming in v2.0</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Live co-editing, threaded comments, and notifications will be available in the next major release.</p>
      </div>
    </div>
  );
}

function FolderOpen2(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function Share2(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>; }
