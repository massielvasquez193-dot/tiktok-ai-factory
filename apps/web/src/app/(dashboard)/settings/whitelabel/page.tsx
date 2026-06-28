'use client';
import { useState } from 'react';
import { Palette, Globe, Image, Type, Shield, Check } from 'lucide-react';

export default function WhiteLabelPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-1"><Palette size={24}/> White Label</h2>
      <p className="text-sm text-gray-500 mb-6">Customize your brand appearance</p>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Image size={16}/> Branding</h3>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label><input className="input" placeholder="Your Brand Name" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Logo</label><div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 cursor-pointer"><Image size={24} className="mx-auto text-gray-400 mb-2"/><p className="text-sm text-gray-500">Upload logo (256x256 PNG/SVG)</p></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Favicon</label><input type="file" className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label><input type="color" defaultValue="#4F46E5" className="w-full h-10 rounded-lg border cursor-pointer" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label><input type="color" defaultValue="#7C3AED" className="w-full h-10 rounded-lg border cursor-pointer" /></div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe size={16}/> Custom Domain</h3>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Domain</label><input className="input" placeholder="videos.yourbrand.com" /><p className="text-xs text-gray-400 mt-1">Add a CNAME record pointing to: <code className="bg-gray-100 px-1 rounded">custom.ttvideoai.com</code></p></div>
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700"><Shield size={16}/> SSL certificate will be automatically provisioned after DNS verification.</div>
          <div className="flex items-center gap-2 text-sm text-green-600"><Check size={14}/>Domain not configured yet</div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Type size={16}/> Email Templates</h3>
        <div className="space-y-2">{['Welcome Email','Password Reset','Invoice','Video Complete','Subscription Renewal'].map(e => <div key={e} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"><span className="text-sm">{e}</span><button className="text-xs text-brand-500 hover:underline">Customize</button></div>)}</div>
      </div>

      <div className="card text-center py-8 border-purple-200 bg-purple-50">
        <Palette size={40} className="mx-auto text-purple-300 mb-3"/>
        <h3 className="font-semibold text-purple-800">White Label — Available on Business Plan</h3>
        <p className="text-sm text-purple-600 mt-1 max-w-md mx-auto">Custom branding, custom domain, and email templates are available on Business and Enterprise plans.</p>
      </div>
    </div>
  );
}
