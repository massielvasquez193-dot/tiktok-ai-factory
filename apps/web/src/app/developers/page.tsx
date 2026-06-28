'use client';
import { useState } from 'react';
import { Code, BookOpen, Terminal, Key, Webhook, Copy, Check, ExternalLink } from 'lucide-react';

const ENDPOINTS = [
  { method:'POST', path:'/api/auth/register', desc:'Create a new user account' },
  { method:'POST', path:'/api/auth/login', desc:'Authenticate and get token' },
  { method:'GET', path:'/api/workspaces', desc:'List user workspaces' },
  { method:'POST', path:'/api/workspaces/:id/videos', desc:'Submit video generation' },
  { method:'GET', path:'/api/workspaces/:id/videos', desc:'List generated videos' },
  { method:'POST', path:'/api/workspaces/:id/publishing/jobs', desc:'Create publish job' },
  { method:'GET', path:'/api/plans', desc:'List subscription plans (public)' },
  { method:'GET', path:'/api/templates', desc:'List marketplace templates (public)' },
];

const SDK_SNIPPET = `// TikTok AI Factory — JavaScript SDK
import { TikTokAIFactory } from '@tiktok-vf/sdk';

const client = new TikTokAIFactory({
  apiKey: 'tf_sk_xxxxxxxxxxxxxxxx',
});

// Generate a video
const video = await client.videos.generate({
  productName: 'My Skincare Product',
  scriptType: 'ugc',
  language: 'en',
  provider: 'seedance',
});

// Check status
const status = await client.videos.getStatus(video.id);

// Download
if (status === 'completed') {
  await client.videos.download(video.id, './output.mp4');
}`;

export default function DevelopersPage() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3"><Code size={32}/> Developer Platform</h1>
          <p className="text-lg text-gray-400 max-w-xl">Build, integrate, and automate with the TikTok AI Factory API and SDKs.</p>
          <div className="flex gap-3 mt-6">
            <button className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 flex items-center gap-2"><BookOpen size={16}/>API Reference</button>
            <button className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 flex items-center gap-2"><Terminal size={16}/>API Playground</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {[
            { icon:Key, title:'API Keys', desc:'Generate API keys in your workspace settings. Pro plan required.', link:'/settings/api-keys' },
            { icon:Webhook, title:'Webhooks', desc:'Real-time event notifications for video completion, publishing, and more.', link:'/settings/webhooks' },
            { icon:Code, title:'TypeScript SDK', desc:'First-class TypeScript support with full type definitions. Coming soon.' },
          ].map(c => (
            <div key={c.title} className="card">
              <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center mb-3"><c.icon size={20} className="text-brand-600"/></div>
              <h3 className="font-semibold mb-1">{c.title}</h3>
              <p className="text-xs text-gray-500 mb-3">{c.desc}</p>
              {c.link && <a href={c.link} className="text-sm text-brand-500 hover:underline font-medium flex items-center gap-1">Configure <ExternalLink size={12}/></a>}
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><BookOpen size={20}/> REST API Reference</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase w-16">Method</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Endpoint</th><th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th></tr></thead>
              <tbody>
                {ENDPOINTS.map((e, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3"><span className={`text-xs font-mono px-2 py-0.5 rounded ${e.method==='GET'?'bg-green-100 text-green-700':e.method==='POST'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{e.method}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.path}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Code size={20}/> TypeScript SDK (Preview)</h2>
        <div className="bg-gray-900 rounded-xl p-6 mb-4 relative">
          <button onClick={() => { navigator.clipboard.writeText(SDK_SNIPPET); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-4 right-4 p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white"><Copy size={14}/> {copied && <span className="text-xs text-green-400 ml-1">Copied!</span>}</button>
          <pre className="text-sm text-gray-300 overflow-x-auto"><code>{SDK_SNIPPET}</code></pre>
        </div>

        <div className="card text-center py-8"><BookOpen size={40} className="mx-auto text-gray-300 mb-3"/><h3 className="font-semibold text-gray-700">SDK Clients Coming Soon</h3><p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">Official SDK packages for JavaScript/TypeScript, Python, PHP, and Go are in development.</p></div>
      </div>
    </div>
  );
}
