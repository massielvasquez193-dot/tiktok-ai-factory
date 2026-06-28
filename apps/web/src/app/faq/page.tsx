'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  { q:'What is TikTok AI Factory?', a:'TikTok AI Factory is an AI-powered video generation platform designed for cross-border e-commerce sellers. It helps you research viral videos, generate scripts in multiple languages, create AI videos, and publish them to TikTok, YouTube Shorts, and Instagram Reels.' },
  { q:'How does pricing work?', a:'We offer 5 plans: Free (50 credits/mo), Starter ($29/mo, 500 credits), Pro ($99/mo, 2,500 credits), Business ($299/mo, 10,000 credits), and Enterprise (custom). Credits are consumed per AI operation — generating a video costs ~50 credits. You can purchase additional credit packs if needed.' },
  { q:'Which AI providers do you support?', a:'We support DeepSeek, OpenAI, and Claude for LLM (script generation); Seedance, Kling, Veo, and Runway for video generation; and ElevenLabs, OpenAI TTS, and Azure TTS for voice synthesis. You can configure your own API keys per provider.' },
  { q:'Can I use my own API keys?', a:'Yes. In your workspace settings, you can configure API keys for any supported provider. This gives you full control over costs and usage. The platform also supports provider health monitoring and priority routing.' },
  { q:'What languages are supported?', a:'Scripts: English, Malay, Thai, Filipino, Spanish, Chinese. TTS voice-overs: English, Malay, Thai, Filipino, Spanish, Chinese, Japanese, Korean, and more via provider support.' },
  { q:'How do credits work?', a:'Credits are our unified currency for AI operations. Research costs 10 credits, script generation 5, video generation 50-100, TTS 10, and publishing 20. Monthly plan credits reset each billing period. Purchased credits never expire. Failed operations are automatically refunded.' },
  { q:'Can I cancel anytime?', a:'Yes. You can cancel your subscription at any time from your Billing settings. Your subscription remains active until the end of the current billing period. After cancellation, you retain access for the remainder of the paid period.' },
  { q:'Is my data secure?', a:'Yes. We use industry-standard encryption (TLS 1.3), bcrypt password hashing, JWT-based authentication with session invalidation, and role-based access control. Payment data is processed by Stripe (PCI DSS Level 1). We do not sell your data.' },
  { q:'Do you offer a free trial?', a:'Yes. The Free plan gives you 50 credits per month with no credit card required. You can generate 5 videos, run 2 research analyses, and test all basic features before upgrading.' },
  { q:'What platforms can I publish to?', a:'Currently: TikTok, YouTube Shorts, and Instagram Reels. We plan to add Facebook Reels and Snapchat Spotlight in future releases.' },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="min-h-screen bg-gray-50 py-12"><div className="max-w-2xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">Frequently Asked Questions</h1><p className="text-gray-500 text-center mb-10">Everything you need to know about TikTok AI Factory</p>
      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button onClick={()=>setOpen(open===i?null:i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
              <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
              {open===i?<ChevronUp size={18} className="text-gray-400 shrink-0"/>:<ChevronDown size={18} className="text-gray-400 shrink-0"/>}
            </button>
            {open===i&&<div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">{faq.a}</div>}
          </div>
        ))}
      </div>
    </div></div>
  );
}
