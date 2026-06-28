'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await register(email, password, name); router.push('/'); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">Start generating AI videos in minutes</p>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><div className="relative"><User size={16} className="absolute left-3 top-3 text-gray-400"/><input type="text" value={name} onChange={e => setName(e.target.value)} className="input pl-10" placeholder="John Wang" required/></div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><div className="relative"><Mail size={16} className="absolute left-3 top-3 text-gray-400"/><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" required/></div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><div className="relative"><Lock size={16} className="absolute left-3 top-3 text-gray-400"/><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input pl-10" placeholder="At least 6 characters" required minLength={6}/></div></div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">{loading ? 'Creating account...' : <><UserPlus size={16}/> Create account</>}</button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link href="/login" className="text-brand-500 font-medium hover:underline">Sign in</Link></p>
    </div>
  );
}
