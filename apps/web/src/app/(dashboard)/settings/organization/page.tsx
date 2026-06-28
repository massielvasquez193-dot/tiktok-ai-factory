'use client';
import { useState } from 'react';
import { Building2, Users, Shield, Globe, Activity, CreditCard, BarChart3, Search, Download } from 'lucide-react';

export default function OrganizationPage() {
  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-1"><Building2 size={24}/> Organization</h2>
      <p className="text-sm text-gray-500 mb-6">Enterprise organization management</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {label:'Workspaces',value:'—',icon:Building2,color:'bg-blue-50 text-blue-700'},
          {label:'Members',value:'—',icon:Users,color:'bg-green-50 text-green-700'},
          {label:'Credits Pool',value:'—',icon:CreditCard,color:'bg-purple-50 text-purple-700'},
        ].map(s=>(
          <div key={s.label} className="card"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}><s.icon size={20}/></div><div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p></div></div></div>
        ))}
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Shield size={16}/> Organization Settings</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Organization Name</label><input className="input" placeholder="Acme Corp" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Tax ID / VAT</label><input className="input" placeholder="EU372008461" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Billing Email</label><input className="input" placeholder="billing@acmecorp.com" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Default Currency</label><select className="input"><option>USD</option><option>EUR</option><option>CNY</option><option>MYR</option></select></div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity size={16}/> Audit Logs</h3>
        <div className="relative mb-4"><Search size={14} className="absolute left-3 top-2.5 text-gray-400"/><input className="input text-sm pl-9" placeholder="Search audit logs..."/></div>
        <div className="space-y-2 text-sm">
          {[
            {action:'workspace.created', user:'Admin', time:'2 hours ago', ip:'192.168.1.1'},
            {action:'subscription.upgraded', user:'Owner', time:'1 day ago', ip:'10.0.0.1'},
            {action:'member.invited', user:'Admin', time:'2 days ago', ip:'172.16.0.1'},
          ].map((l,i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="flex items-center gap-3"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{l.action}</code><span className="text-gray-500">{l.user}</span></div>
              <div className="flex items-center gap-4 text-xs text-gray-400"><span>{l.ip}</span><span>{l.time}</span></div>
            </div>
          ))}
        </div>
        <button className="mt-3 text-sm text-brand-500 hover:underline flex items-center gap-1"><Download size={12}/>Export Audit Logs</button>
      </div>

      <div className="card text-center py-8">
        <Building2 size={40} className="mx-auto text-gray-300 mb-3"/>
        <h3 className="font-semibold text-gray-700">Enterprise Features — Available on Business Plan</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Organization management, SSO, audit logs, and advanced team features are available on Business and Enterprise plans.</p>
      </div>
    </div>
  );
}
