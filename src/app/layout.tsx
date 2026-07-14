import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ethereal Flame Studio',
  description: 'Phone to published video - 360° VR visual meditation creator',
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
        {children}
      </body>
    </html>
  );
}
