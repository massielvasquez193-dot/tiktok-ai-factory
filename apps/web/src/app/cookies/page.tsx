'use client';
export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12"><div className="max-w-3xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1><p className="text-sm text-gray-500 mb-8">Last updated: June 28, 2026</p>
      <div className="prose prose-sm max-w-none space-y-6">
        <section><h2 className="text-xl font-semibold mb-3">Essential Cookies</h2><p className="text-gray-600">We use essential cookies for: authentication (JWT token storage in localStorage), session management, workspace context (active workspace ID), and language preference. These cookies are required for the Service to function and cannot be disabled.</p></section>
        <section><h2 className="text-xl font-semibold mb-3">No Third-Party Tracking</h2><p className="text-gray-600">We do not use third-party tracking cookies, advertising cookies, or analytics cookies. We do not integrate with Google Analytics, Facebook Pixel, or similar tracking services. Your usage data stays within the TikTok AI Factory platform.</p></section>
        <section><h2 className="text-xl font-semibold mb-3">Local Storage</h2><p className="text-gray-600">The Service uses browser localStorage (not cookies) to store: <code>auth_token</code> (JWT), <code>active_workspace_id</code>, <code>locale</code> (language preference), and <code>favorite_videos</code>. This data never leaves your browser.</p></section>
        <section><h2 className="text-xl font-semibold mb-3">Contact</h2><p className="text-gray-600"><a href="mailto:privacy@ttvideoai.com" className="text-brand-500 hover:underline">privacy@ttvideoai.com</a></p></section>
      </div>
    </div></div>
  );
}
