'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Users, Building2, CreditCard, Database, Activity, Shield, BarChart3 } from 'lucide-react';

const ADMIN_SECTIONS = [
  { key:'overview', label:'Overview', icon:BarChart3, desc:'System metrics at a glance' },
  { key:'users', label:'Users', icon:Users, desc:'User management & impersonation' },
  { key:'workspaces', label:'Workspaces', icon:Building2, desc:'Workspace management' },
  { key:'subscriptions', label:'Subscriptions', icon:CreditCard, desc:'Plan & billing management' },
  { key:'credits', label:'Credits', icon:Database, desc:'Credit pools & adjustments' },
  { key:'providers', label:'Providers', icon:Activity, desc:'Provider health & config' },
  { key:'logs', label:'Audit Logs', icon:Shield, desc:'Security & activity logs' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [section, setSection] = useState('overview');

  if (!user) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><Shield size={24}/> Admin Console</h2>
      <p className="text-sm text-gray-500 mb-6">System administration</p>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {ADMIN_SECTIONS.map(s => (
          <button key={s.key} onClick={()=>setSection(s.key)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${section===s.key?'bg-white shadow-sm text-gray-900':'text-gray-500 hover:text-gray-700'}`}><s.icon size={14}/>{s.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {label:'Total Workspaces',value:'—',icon:Building2,color:'bg-blue-50 text-blue-700'},
          {label:'Active Users',value:'—',icon:Users,color:'bg-green-50 text-green-700'},
          {label:'MRR',value:'$0',icon:BarChart3,color:'bg-purple-50 text-purple-700'},
        ].map(s=>(
          <div key={s.label} className="card">
            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}><s.icon size={20}/></div><div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p></div></div>
          </div>
        ))}
      </div>

      <div className="card text-center py-12">
        <Shield size={48} className="mx-auto text-gray-300 mb-3"/>
        <h3 className="text-lg font-semibold text-gray-700">Admin Console — Coming in Sprint 4</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Full admin features with real-time metrics, user management, and system configuration will be available in the next sprint.</p>
      </div>
    </div>
  );
}
