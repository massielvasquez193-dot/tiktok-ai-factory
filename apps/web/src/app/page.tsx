import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TikTok AI Factory — AI Video Generation for Cross-Border E-Commerce',
  description: 'Generate AI-powered TikTok videos in minutes. Research viral content, create scripts in 6 languages, generate videos with AI, and publish automatically. Built for cross-border sellers.',
  keywords: 'AI video generation, TikTok AI, e-commerce video, cross-border seller, AI video maker, TikTok shop, AI script generator, video automation',
  openGraph: {
    title: 'TikTok AI Factory — AI Video Generation Platform',
    description: 'Generate AI-powered TikTok videos in minutes. Built for cross-border e-commerce sellers.',
    url: 'https://ttvideoai.com',
    siteName: 'TikTok AI Factory',
    images: [{ url: 'https://ttvideoai.com/og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TikTok AI Factory',
    description: 'AI-powered video generation for cross-border e-commerce',
  },
  robots: 'index, follow',
  alternates: { canonical: 'https://ttvideoai.com' },
};

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'TikTok AI Factory',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'AI-powered video generation platform for cross-border e-commerce sellers. Research viral content, create scripts, generate videos, and publish automatically.',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: '0',
          highPrice: '299',
          offerCount: '5',
        },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '127' },
      })}} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-brand-900 to-purple-900 text-white">
        <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <a href="/" className="text-xl font-bold"><span className="text-brand-400">TikTok</span> AI Factory</a>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="/pricing" className="text-gray-300 hover:text-white">Pricing</a>
            <a href="/templates" className="text-gray-300 hover:text-white">Templates</a>
            <a href="/faq" className="text-gray-300 hover:text-white">FAQ</a>
            <a href="/developers" className="text-gray-300 hover:text-white">Developers</a>
            <a href="/login" className="text-gray-300 hover:text-white">Sign In</a>
            <a href="/register" className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-400">Get Started Free</a>
          </nav>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-20 lg:py-28 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">AI-Powered Video Factory<br/><span className="text-brand-400">for Cross-Border Sellers</span></h1>
          <p className="text-lg lg:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">Research viral videos. Generate scripts in 6 languages. Create AI videos. Publish to TikTok, YouTube & Instagram — all from one platform.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/register" className="px-8 py-3.5 bg-brand-500 text-white rounded-xl text-lg font-semibold hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/25">Start Free — No Credit Card</a>
            <a href="/pricing" className="px-8 py-3.5 border border-gray-500 text-white rounded-xl text-lg font-semibold hover:bg-white/10 transition-colors">View Pricing</a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-400">
            <span>✓ 50 free credits</span><span>✓ 5 video generations</span><span>✓ No credit card</span>
          </div>
        </div>
      </div>

      {/* Trust */}
      <div className="bg-white border-b border-gray-100"><div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-sm text-gray-500">
        {[{num:'6',label:'Languages'},{num:'10+',label:'AI Providers'},{num:'50+',label:'Credits Free'},{num:'24h',label:'Support'}].map(s=>(
          <div key={s.label}><p className="text-2xl font-bold text-gray-900 mb-1">{s.num}</p><p>{s.label}</p></div>
        ))}
      </div></div>

      {/* How It Works */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2><p className="text-gray-500 text-center mb-12">Four steps from product to published video</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[{step:'1',title:'Upload Product',desc:'Add product images and details',icon:'📦'},{step:'2',title:'Generate Script',desc:'AI writes scripts in 6 languages',icon:'✍️'},{step:'3',title:'Create Video',desc:'AI generates professional video',icon:'🎬'},{step:'4',title:'Publish',desc:'Auto-post to TikTok & more',icon:'📤'}].map(s=>(
            <div key={s.step} className="text-center"><div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4 text-3xl">{s.icon}</div><h3 className="font-semibold mb-2">{s.title}</h3><p className="text-sm text-gray-500">{s.desc}</p></div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-gray-50 py-20"><div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {title:'AI Script Generator',desc:'UGC, Review, POV, Before/After scripts in English, Malay, Thai, Filipino, Spanish, Chinese.'},
            {title:'Multi-Provider Video',desc:'Seedance, Kling, Veo, Runway — choose your AI video engine. Configure your own API keys.'},
            {title:'Voice Synthesis',desc:'ElevenLabs, OpenAI TTS, Azure TTS — generate voice-overs in any language.'},
            {title:'Multi-Platform Publishing',desc:'Publish directly to TikTok, YouTube Shorts, and Instagram Reels with scheduling.'},
            {title:'Team Workspace',desc:'Invite team members, assign roles, share projects and prompt libraries.'},
            {title:'Analytics Dashboard',desc:'Track views, engagement, CTR, revenue, and AI costs in real-time.'},
          ].map(f=>(
            <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"><h3 className="font-semibold mb-2">{f.title}</h3><p className="text-sm text-gray-500">{f.desc}</p></div>
          ))}
        </div>
      </div></div>

      {/* Pricing CTA */}
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Start Free, Scale as You Grow</h2>
        <p className="text-gray-500 mb-8 max-w-xl mx-auto">50 free credits every month. Upgrade when you need more power.</p>
        <div className="flex gap-4 justify-center flex-wrap"><a href="/pricing" className="px-8 py-3.5 bg-brand-500 text-white rounded-xl text-lg font-semibold hover:bg-brand-400 shadow-lg">See Plans & Pricing</a><a href="/register" className="px-8 py-3.5 border border-gray-300 rounded-xl text-lg font-semibold hover:bg-gray-50">Create Free Account</a></div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12"><div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div><h3 className="text-white font-bold mb-3"><span className="text-brand-400">TikTok</span> AI Factory</h3><p className="text-xs">AI video for cross-border e-commerce</p></div>
        <div><h4 className="text-white font-semibold text-sm mb-3">Product</h4><div className="space-y-2 text-sm"><a href="/pricing" className="block hover:text-white">Pricing</a><a href="/templates" className="block hover:text-white">Templates</a><a href="/developers" className="block hover:text-white">API</a></div></div>
        <div><h4 className="text-white font-semibold text-sm mb-3">Support</h4><div className="space-y-2 text-sm"><a href="/faq" className="block hover:text-white">FAQ</a><a href="/support" className="block hover:text-white">Help Center</a><a href="/contact" className="block hover:text-white">Contact</a></div></div>
        <div><h4 className="text-white font-semibold text-sm mb-3">Company</h4><div className="space-y-2 text-sm"><a href="/terms" className="block hover:text-white">Terms</a><a href="/privacy" className="block hover:text-white">Privacy</a><a href="/cookies" className="block hover:text-white">Cookies</a></div></div>
        <div><h4 className="text-white font-semibold text-sm mb-3">Get Started</h4><div className="space-y-2 text-sm"><a href="/register" className="block hover:text-white">Sign Up Free</a><a href="/login" className="block hover:text-white">Sign In</a></div></div>
      </div><div className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-xs text-center">&copy; 2026 TikTok AI Factory. All rights reserved.</div></footer>
    </>
  );
}
