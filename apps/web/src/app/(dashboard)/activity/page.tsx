'use client';
import { useState } from 'react';
import { Clock, FileText, Video, Users, Settings, CreditCard, Search, Filter } from 'lucide-react';

const AUDIT_EVENTS = [
  { id:'1', user:'John Wang', action:'Generated script', resource:'UGC Review - SkinCare', time:'2 min ago', icon:FileText, color:'bg-blue-100 text-blue-600' },
  { id:'2', user:'Sarah Chen', action:'Uploaded video', resource:'Before After - Serum', time:'15 min ago', icon:Video, color:'bg-purple-100 text-purple-600' },
  { id:'3', user:'You', action:'Changed workspace settings', resource:'Workspace: My Brand Co.', time:'1 hour ago', icon:Settings, color:'bg-gray-100 text-gray-600' },
  { id:'4', user:'You', action:'Invited member', resource:'sarah@example.com as Editor', time:'3 hours ago', icon:Users, color:'bg-green-100 text-green-600' },
  { id:'5', user:'System', action:'Auto-learning completed', resource:'Analyzed 100 top videos', time:'5 hours ago', icon:Clock, color:'bg-yellow-100 text-yellow-600' },
  { id:'6', user:'John Wang', action:'Created product', resource:'Medicube PDRN Pink Collagen Balm', time:'1 day ago', icon:FileText, color:'bg-blue-100 text-blue-600' },
];

export default function ActivityPage() {
  const [events] = useState(AUDIT_EVENTS);
  const [search, setSearch] = useState('');

  const filtered = search ? events.filter(e =>
    e.user.toLowerCase().includes(search.toLowerCase()) ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    e.resource.toLowerCase().includes(search.toLowerCase())
  ) : events;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Clock size={24}/> Activity Log</h2><p className="text-sm text-gray-500">{events.length} recent events</p></div>
      </div>

      <div className="relative mb-6"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search activity..." className="input pl-10"/></div>

      <div className="space-y-1">
        {filtered.map((e, i) => (
          <div key={e.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${e.color}`}><e.icon size={18}/></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900"><span className="font-medium">{e.user}</span> {e.action}</p>
              <p className="text-xs text-gray-500 truncate">{e.resource}</p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
