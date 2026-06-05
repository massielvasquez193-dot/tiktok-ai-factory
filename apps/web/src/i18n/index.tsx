'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zhCN from './messages/zh-CN.json';
import enUS from './messages/en-US.json';

type Locale = 'zh-CN' | 'en-US';
type Messages = typeof zhCN;

const messagesMap: Record<Locale, Messages> = { 'zh-CN': zhCN, 'en-US': enUS };

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('zh-CN');

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && messagesMap[saved]) {
      setLocale(saved);
    } else {
      const browserLang = navigator.language;
      if (browserLang.startsWith('zh')) setLocale('zh-CN');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string, fallback?: string): string => {
    const msg = messagesMap[locale] as any;
    return msg?.[key] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

export { messagesMap, zhCN, enUS };
