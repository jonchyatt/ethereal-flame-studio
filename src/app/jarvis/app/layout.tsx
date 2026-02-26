import { JarvisShell } from '@/components/jarvis/layout';

export default function JarvisAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <JarvisShell>{children}</JarvisShell>;
}
