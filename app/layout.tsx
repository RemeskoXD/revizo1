import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Providers } from './providers';
import { setupDatabaseUrl } from '@/lib/setup-db';
import { GlobalBanner } from '@/components/GlobalBanner';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'Revizone',
  description: 'Komplexní systém pro správu revizí',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Revizone',
  },
};

export const viewport: Viewport = {
  themeColor: '#f5c518',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="cs">
      <body suppressHydrationWarning>
        <Providers>
          <GlobalBanner />
          {children}
        </Providers>
        <PWARegister />
      </body>
    </html>
  );
}
