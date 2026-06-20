'use client';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { I18nProvider, useTranslation } from '@/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

function LangSwitcher() {
  const { locale, setLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <div className="fixed top-3 right-4 z-50 flex items-center gap-1 bg-white rounded-lg shadow border px-2 py-1">
      <Globe size={12} className="text-gray-400" />
      <button onClick={() => setLocale('zh-CN')} className={`text-xs px-1.5 py-0.5 rounded ${locale === 'zh-CN' ? 'bg-brand-100 text-brand-700 font-bold' : 'text-gray-400 hover:text-gray-600'}`}>🇨🇳 中文</button>
      <button onClick={() => setLocale('en-US')} className={`text-xs px-1.5 py-0.5 rounded ${locale === 'en-US' ? 'bg-brand-100 text-brand-700 font-bold' : 'text-gray-400 hover:text-gray-600'}`}>🇺🇸 EN</button>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <I18nProvider>
            <LangSwitcher />
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-8">{children}</main>
            </div>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
