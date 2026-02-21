import type { Metadata, Viewport } from 'next';
import './globals.css';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { GlobalSettings } from '@/components/settings/GlobalSettings';

export const metadata: Metadata = {
  title: 'International Draughts',
  description: 'Play international draughts (10×10) against AI opponents',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Draughts',
  },
};

export const viewport: Viewport = {
  themeColor: '#4a90d9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-surface text-slate-900 dark:text-slate-100 antialiased">
        <OfflineBanner />
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <main id="main-content" role="main">
          {children}
        </main>
        <InstallPrompt />
        <GlobalSettings />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('SW registered:', reg.scope))
                .catch((err) => console.warn('SW registration failed:', err));
            });
          }
        `,
      }}
    />
  );
}
