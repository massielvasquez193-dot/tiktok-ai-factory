import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { AppShell } from '@/components/AppShell';
import { I18nProvider } from '@/i18n';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <I18nProvider>
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
