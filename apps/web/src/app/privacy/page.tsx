'use client';
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12"><div className="max-w-3xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1><p className="text-sm text-gray-500 mb-8">Last updated: June 28, 2026</p>
      <div className="prose prose-sm max-w-none space-y-6">
        <section><h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2><p className="text-gray-600">We collect: (a) Account information (name, email, password hash); (b) Usage data (API calls, credits consumed, features used); (c) Content you upload (product images, scripts, videos); (d) Payment information (processed by Stripe — we do not store credit card numbers).</p></section>
        <section><h2 className="text-xl font-semibold mb-3">2. How We Use Information</h2><p className="text-gray-600">We use your information to: provide the Service, process payments, send account notifications, improve the Service, and comply with legal obligations. We do not sell your personal data.</p></section>
        <section><h2 className="text-xl font-semibold mb-3">3. AI Data Processing</h2><p className="text-gray-600">Content you submit to AI providers (DeepSeek, Seedance, OpenAI, etc.) is processed according to each provider&apos;s data policies. We recommend reviewing the privacy policies of integrated AI providers.</p></section>
        <section><h2 className="text-xl font-semibold mb-3">4. Data Storage & Security</h2><p className="text-gray-600">Your data is stored on encrypted servers. We use industry-standard security practices including TLS encryption, password hashing (bcrypt), and access controls. Payment data is handled by Stripe (PCI DSS Level 1).</p></section>
        <section><h2 className="text-xl font-semibold mb-3">5. Your Rights</h2><p className="text-gray-600">You may: access your data, request correction, request deletion, export your data, and withdraw consent. To exercise these rights, contact <a href="mailto:privacy@ttvideoai.com" className="text-brand-500 hover:underline">privacy@ttvideoai.com</a>.</p></section>
        <section><h2 className="text-xl font-semibold mb-3">6. Cookies</h2><p className="text-gray-600">We use essential cookies for authentication and session management. See our <a href="/cookies" className="text-brand-500 hover:underline">Cookie Policy</a> for details.</p></section>
        <section><h2 className="text-xl font-semibold mb-3">7. Contact</h2><p className="text-gray-600"><a href="mailto:privacy@ttvideoai.com" className="text-brand-500 hover:underline">privacy@ttvideoai.com</a></p></section>
      </div>
    </div></div>
  );
}
