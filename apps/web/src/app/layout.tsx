import type { ReactNode } from 'react';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { I18nProvider } from '@/i18n';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <div className="min-h-screen flex bg-gray-50">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-x-auto">
              {children}
            </main>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
