import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ethereal Flame Studio',
  description: 'Phone to published video - 360° VR visual meditation creator',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body style={{ margin: 0, padding: 0, width: '100%', height: '100%' }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
