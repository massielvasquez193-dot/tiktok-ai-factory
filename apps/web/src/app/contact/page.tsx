'use client';
import { useState, FormEvent } from 'react';
import { Mail, MessageSquare, HelpCircle, Send, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) { e.preventDefault(); setLoading(true); await new Promise(r => setTimeout(r, 1000)); setSent(true); setLoading(false); }

  return (
    <div className="min-h-screen bg-gray-50 py-12"><div className="max-w-2xl mx-auto px-4">
      <div className="text-center mb-10"><h1 className="text-3xl font-bold mb-3">Contact Us</h1><p className="text-gray-500">We typically respond within 24 hours</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[{icon:Mail,title:'Email',desc:'support@ttvideoai.com'},{icon:MessageSquare,title:'Live Chat',desc:'Available on Pro+ plans'},{icon:HelpCircle,title:'Help Center',desc:'Browse documentation'}].map(c=>(
          <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-6 text-center"><div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mx-auto mb-3"><c.icon size={24} className="text-brand-600"/></div><h3 className="font-semibold mb-1">{c.title}</h3><p className="text-sm text-gray-500">{c.desc}</p></div>
        ))}
      </div>

      {sent ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-600"/></div><h2 className="text-xl font-bold mb-2">Message Sent!</h2><p className="text-gray-500">We&apos;ll get back to you within 24 hours.</p></div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Name</label><input value={name} onChange={e=>setName(e.target.value)} className="input" required/></div><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" required/></div></div>
          <div><label className="block text-sm font-medium mb-1">Topic</label><select value={topic} onChange={e=>setTopic(e.target.value)} className="input"><option value="general">General Inquiry</option><option value="billing">Billing & Subscription</option><option value="technical">Technical Support</option><option value="enterprise">Enterprise Sales</option><option value="partnership">Partnership</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Message</label><textarea value={message} onChange={e=>setMessage(e.target.value)} className="input" rows={5} required/></div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2"><Send size={16}/>{loading?'Sending...':'Send Message'}</button>
        </form>
      )}
    </div></div>
  );
}
