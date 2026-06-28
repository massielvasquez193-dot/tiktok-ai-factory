'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Video, MessageSquare, FileText, Search, ChevronRight, ExternalLink } from 'lucide-react';

const CATEGORIES = [
  { title:'Getting Started', icon:BookOpen, articles:['Create your account','Set up your first workspace','Connect AI providers','Generate your first video'] },
  { title:'Billing & Plans', icon:FileText, articles:['Plan comparison','How credits work','Upgrade or downgrade','View invoices'] },
  { title:'AI Video Generation', icon:Video, articles:['Choose the right script type','Write effective prompts','Provider comparison','Troubleshooting failed generations'] },
  { title:'Publishing', icon:ExternalLink, articles:['Connect TikTok account','Schedule a post','Multi-platform publishing','Publishing analytics'] },
  { title:'Workspace & Team', icon:MessageSquare, articles:['Invite team members','Role permissions','Shared projects','Team collaboration'] },
];

export default function SupportPage() {
  const [search, setSearch] = useState('');
  return (
    <div className="min-h-screen bg-gray-50 py-12"><div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-10"><h1 className="text-3xl font-bold mb-3">Support Center</h1><p className="text-gray-500 mb-6">Find answers and get help</p>
        <div className="relative max-w-md mx-auto"><Search size={18} className="absolute left-4 top-3.5 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for help..." className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-500"/></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {CATEGORIES.map(c=>(
          <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center"><c.icon size={20} className="text-brand-600"/></div><h3 className="font-semibold">{c.title}</h3></div>
            <ul className="space-y-2">{c.articles.map(a=><li key={a}><Link href="#" className="flex items-center justify-between text-sm text-gray-600 hover:text-brand-500 py-1"><span>{a}</span><ChevronRight size={14}/></Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="bg-brand-500 text-white rounded-xl p-8 text-center"><h2 className="text-xl font-bold mb-2">Still need help?</h2><p className="text-brand-100 mb-4">Our support team is ready to assist you.</p><div className="flex gap-3 justify-center"><Link href="/contact" className="px-5 py-2.5 bg-white text-brand-600 rounded-lg font-medium text-sm hover:bg-gray-50">Contact Support</Link><a href="mailto:support@ttvideoai.com" className="px-5 py-2.5 border border-brand-400 rounded-lg font-medium text-sm hover:bg-brand-600">Email Us</a></div></div>
    </div></div>
  );
}
