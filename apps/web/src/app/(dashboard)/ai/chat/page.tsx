'use client';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { MessageSquare, Send, Cpu, User, Bot, Trash2 } from 'lucide-react';

export default function AIChatPage() {
  const { token, user } = useAuth();
  const [ws, setWs] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('deepseek');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success && d.data[0]) { setWs(d.data[0]); loadMessages(d.data[0].id); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  async function loadMessages(wsId: string) {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/ai/chat`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) setMessages(d.data);
    } catch {}
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/workspaces/${ws.id}/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: input, model }) });
      const d = await res.json();
      if (d.success) { setMessages(prev => [...prev, d.data.userMessage, d.data.assistantMessage]); setInput(''); }
    } catch {}
    setSending(false);
    setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  if (loading) return <div className="text-gray-400 py-8">Loading AI Chat...</div>;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><MessageSquare size={24}/> AI Chat</h2><p className="text-sm text-gray-500">{messages.length} messages</p></div>
        <select value={model} onChange={e => setModel(e.target.value)} className="input text-sm w-40"><option value="deepseek">DeepSeek</option><option value="openai">OpenAI</option><option value="claude">Claude</option></select>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
        {messages.length === 0 ? (
          <div className="text-center py-16"><Bot size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-lg font-medium text-gray-600">AI Chat Workspace</p><p className="text-sm text-gray-400 mt-1">Start a conversation with your AI assistant. Ask about scripts, prompts, or video strategies.</p></div>
        ) : messages.map(m => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role !== 'user' && <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0"><Bot size={16} className="text-purple-600"/></div>}
            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${m.role === 'user' ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200'}`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              <p className={`text-xs mt-1 ${m.role === 'user' ? 'text-brand-100' : 'text-gray-400'}`}>{new Date(m.createdAt).toLocaleTimeString()} · {m.model}</p>
            </div>
            {m.role === 'user' && <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0"><User size={16} className="text-brand-600"/></div>}
          </div>
        ))}
        <div ref={chatEnd} />
      </div>

      <form onSubmit={handleSend} className="flex gap-3">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="input flex-1" disabled={sending} />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary flex items-center gap-2"><Send size={16}/>{sending ? '...' : 'Send'}</button>
      </form>
    </div>
  );
}
