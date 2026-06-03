import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'react-hot-toast';
import { PWARegister } from '@/components/PWARegister';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'FitPro — Tu Coach Personal',
  description: 'Tracker de gym, nutrición y coach IA personal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitPro',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6c63ff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#6c63ff" />
      </head>
      <body className={`${syne.variable} ${dmSans.variable} font-body bg-bg-base text-text-primary antialiased`}>
        <AuthProvider>
          {children}
          <PWARegister />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#16161f',
                color: '#f0f0ff',
                border: '1px solid #2a2a3e',
                borderRadius: '12px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
