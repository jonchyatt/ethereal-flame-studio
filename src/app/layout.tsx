import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/components/site/site.css';
import { PublicShell } from '@/components/site/PublicShell';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.whatamiappreciatingnow.com'),
  title: 'What Am I Appreciating Now',
  description: 'Original moments of appreciation in Jonathan Hyatt’s voice, readings and clearly attributed 360° work.',
  icons: { icon: '/brand/carving/icon.png', apple: '/brand/carving/apple-touch-icon.png' },
  openGraph: { siteName: 'What Am I Appreciating Now', images: [{ url: '/brand/share/home.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/brand/share/home.png'] },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0, width: '100%', height: '100%' }} suppressHydrationWarning>
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
