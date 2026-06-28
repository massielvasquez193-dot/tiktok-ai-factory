'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); router.push('/'); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><div className="relative"><Mail size={16} className="absolute left-3 top-3 text-gray-400"/><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" required/></div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><div className="relative"><Lock size={16} className="absolute left-3 top-3 text-gray-400"/><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input pl-10" placeholder="••••••••" required minLength={6}/></div></div>
        <div className="flex items-center justify-between text-sm"><Link href="/forgot-password" className="text-brand-500 hover:underline">Forgot password?</Link></div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">{loading ? 'Signing in...' : <><LogIn size={16}/> Sign in</>}</button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">Don&apos;t have an account? <Link href="/register" className="text-brand-500 font-medium hover:underline">Create one</Link></p>
    </div>
  );
}
