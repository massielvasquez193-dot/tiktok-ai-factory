'use client';
import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { User, Mail, Globe, Clock, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user, updateProfile } = useAuth();
  const [tab, setTab] = useState<'profile'|'password'>('profile');
  const [name, setName] = useState(user?.name || '');
  const [locale, setLocale] = useState(user?.locale || 'en');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleProfile(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try { await updateProfile({ name, locale, timezone }); setSuccess('Profile updated'); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
    try { await updateProfile({ currentPassword, newPassword }); setSuccess('Password changed'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1">Profile Settings</h2>
      <p className="text-sm text-gray-500 mb-6">Manage your account</p>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['profile','password'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab===t?'bg-white shadow-sm text-gray-900':'text-gray-500 hover:text-gray-700'}`}>
            {t==='profile'?<><User size={14} className="inline mr-1"/>Profile</>:<><Lock size={14} className="inline mr-1"/>Password</>}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700"><CheckCircle size={16}/>{success}</div>}

      {tab === 'profile' && (
        <form onSubmit={handleProfile} className="space-y-4 card">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-brand-500 text-white flex items-center justify-center text-xl font-bold">{user.name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)}</div>
            <div><p className="font-medium text-gray-900">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><div className="relative"><User size={16} className="absolute left-3 top-3 text-gray-400"/><input type="text" value={name} onChange={e=>setName(e.target.value)} className="input pl-10"/></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><div className="relative"><Mail size={16} className="absolute left-3 top-3 text-gray-400"/><input type="email" value={user.email} className="input pl-10 bg-gray-50" disabled/><p className="text-xs text-gray-400 mt-1">Email cannot be changed</p></div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Language</label><div className="relative"><Globe size={16} className="absolute left-3 top-3 text-gray-400"/><select value={locale} onChange={e=>setLocale(e.target.value)} className="input pl-10 appearance-none"><option value="en">English</option><option value="zh-CN">中文</option><option value="th">ไทย</option><option value="ms">Bahasa Melayu</option><option value="es">Español</option></select></div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label><div className="relative"><Clock size={16} className="absolute left-3 top-3 text-gray-400"/><select value={timezone} onChange={e=>setTimezone(e.target.value)} className="input pl-10 appearance-none"><option value="UTC">UTC</option><option value="America/New_York">Eastern (US)</option><option value="America/Los_Angeles">Pacific (US)</option><option value="Asia/Kuala_Lumpur">Kuala Lumpur</option><option value="Asia/Bangkok">Bangkok</option><option value="Asia/Shanghai">Shanghai</option></select></div></div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':'Save changes'}</button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4 card">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100"><Shield size={18} className="text-gray-400"/><span className="text-sm font-medium text-gray-700">Change Password</span></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><div className="relative"><Lock size={16} className="absolute left-3 top-3 text-gray-400"/><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="input pl-10" required/></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><div className="relative"><Lock size={16} className="absolute left-3 top-3 text-gray-400"/><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="input pl-10" required minLength={6}/></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label><div className="relative"><Lock size={16} className="absolute left-3 top-3 text-gray-400"/><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="input pl-10" required minLength={6}/></div></div>
          <button type="submit" disabled={loading} className="btn-primary">{loading?'Changing...':'Change password'}</button>
        </form>
      )}
    </div>
  );
}
