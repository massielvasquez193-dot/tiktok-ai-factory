'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSent(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Reset your password</h2>
      <p className="text-sm text-gray-500 mb-6">Enter your email to receive a reset link</p>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
      {sent ? (
        <div>
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700"><CheckCircle size={16}/>Reset link sent! Check your email.</div>
          <Link href="/login" className="btn-secondary w-full flex items-center justify-center gap-2"><ArrowLeft size={16}/>Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><div className="relative"><Mail size={16} className="absolute left-3 top-3 text-gray-400"/><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" required/></div></div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending...' : 'Send reset link'}</button>
        </form>
      )}
      <p className="text-center text-sm text-gray-500 mt-6"><Link href="/login" className="text-brand-500 font-medium hover:underline"><ArrowLeft size={12} className="inline"/> Back to login</Link></p>
    </div>
  );
}
