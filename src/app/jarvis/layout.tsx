import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Jarvis',
  description: 'Your omnipresent guide voice',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function JarvisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-black">
      {children}
    </div>
  );
}
