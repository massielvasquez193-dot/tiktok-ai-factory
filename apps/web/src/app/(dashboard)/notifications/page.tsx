'use client';
import { useState } from 'react';
import { Bell, CheckCheck, Video, AlertTriangle, CreditCard, Users, Check, X } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'video', title: 'Video generation complete', body: 'UGC Review - SkinCare has been generated successfully', read: false, time: '2 min ago' },
  { id: '2', type: 'credit', title: 'Credits running low', body: 'You have 50 credits remaining. Purchase more to continue.', read: false, time: '1 hour ago' },
  { id: '3', type: 'member', title: 'New member joined', body: 'Sarah Chen joined your workspace as Editor', read: true, time: '3 hours ago' },
  { id: '4', type: 'system', title: 'System update', body: 'TikTok AI Factory v1.1 is now available', read: true, time: '1 day ago' },
];

const icons: Record<string, any> = { video: Video, credit: CreditCard, member: Users, system: Bell };

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);

  function markRead(id: string) { setNotifs(prev => prev.map(n => n.id===id ? {...n, read:true} : n)); }
  function dismiss(id: string) { setNotifs(prev => prev.filter(n => n.id!==id)); }
  function markAllRead() { setNotifs(prev => prev.map(n => ({...n, read:true}))); }

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><Bell size={24}/> Notifications</h2><p className="text-sm text-gray-500">{unread} unread · {notifs.length} total</p></div>
        {unread > 0 && <button onClick={markAllRead} className="btn-secondary flex items-center gap-2 text-sm"><CheckCheck size={14}/>Mark all read</button>}
      </div>

      <div className="space-y-2">
        {notifs.map(n => {
          const Icon = icons[n.type] || Bell;
          return (
            <div key={n.id} className={`card flex items-start gap-4 ${!n.read?'border-l-4 border-l-brand-500 bg-brand-50/50':''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type==='video'?'bg-purple-100 text-purple-600':n.type==='credit'?'bg-yellow-100 text-yellow-600':n.type==='member'?'bg-green-100 text-green-600':'bg-blue-100 text-blue-600'}`}><Icon size={20}/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-gray-900">{n.title}</p><span className="text-xs text-gray-400 shrink-0">{n.time}</span></div>
                <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
              </div>
              <button onClick={()=>dismiss(n.id)} className="p-1 text-gray-300 hover:text-gray-500 shrink-0"><X size={14}/></button>
            </div>
          );
        })}
        {notifs.length === 0 && <div className="card text-center py-12"><Bell size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500">All caught up!</p></div>}
      </div>
    </div>
  );
}
