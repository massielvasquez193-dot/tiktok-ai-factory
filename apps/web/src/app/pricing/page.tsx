'use client';
import { useState, useEffect } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const PLANS = [
  { name:'free', display:'Free', price:0, period:'/mo', credits:50, videos:5, members:1, storage:'100MB', api:false, team:false, priority:false, brand:false, analytics:'Basic', support:'Community', popular:false },
  { name:'starter', display:'Starter', price:29, period:'/mo', credits:500, videos:50, members:3, storage:'1GB', api:false, team:false, priority:false, brand:false, analytics:'Basic', support:'Email', popular:false },
  { name:'pro', display:'Pro', price:99, period:'/mo', credits:2500, videos:250, members:10, storage:'10GB', api:true, team:true, priority:true, brand:false, analytics:'Advanced', support:'Priority', popular:true },
  { name:'business', display:'Business', price:299, period:'/mo', credits:10000, videos:1000, members:30, storage:'50GB', api:true, team:true, priority:true, brand:true, analytics:'Advanced', support:'Dedicated', popular:false },
  { name:'enterprise', display:'Enterprise', price:null, period:'', credits:-1, videos:-1, members:-1, storage:'500GB', api:true, team:true, priority:true, brand:true, analytics:'Custom', support:'SLA', popular:false },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-500">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {PLANS.map(p => (
            <div key={p.name} className={`relative bg-white rounded-xl border-2 p-6 ${p.popular?'border-brand-500 shadow-lg':'border-gray-200'}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs px-3 py-1 rounded-full font-medium">Popular</span>}
              <h3 className="text-lg font-bold mb-1">{p.display}</h3>
              <div className="mb-4">{p.price !== null ? <><span className="text-3xl font-bold">${p.price}</span><span className="text-gray-500 text-sm">{p.period}</span></> : <span className="text-2xl font-bold">Custom</span>}</div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/><span>{p.credits>0?`${p.credits} credits`:'Unlimited credits'}</span></li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/><span>{p.videos>0?`${p.videos} videos/mo`:'Unlimited videos'}</span></li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/><span>{p.members>0?`${p.members} members`:'Unlimited members'}</span></li>
                <li className="flex items-center gap-2">{p.api?<Check size={14} className="text-green-500"/>:<X size={14} className="text-gray-300"/>}<span className={p.api?'':'text-gray-400'}>API access</span></li>
                <li className="flex items-center gap-2">{p.priority?<Check size={14} className="text-green-500"/>:<X size={14} className="text-gray-300"/>}<span className={p.priority?'':'text-gray-400'}>Priority queue</span></li>
              </ul>
              <button className={`w-full py-2.5 rounded-lg text-sm font-medium ${p.popular?'bg-brand-500 text-white hover:bg-brand-600':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {p.name==='free'?'Get Started':p.name==='enterprise'?'Contact Sales':'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
