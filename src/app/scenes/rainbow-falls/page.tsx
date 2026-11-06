import type { Metadata } from 'next';
import LivingScene from '@/components/scenes/LivingScene';

export const metadata: Metadata = {
  title: 'Rainbow Falls · What Am I Appreciating Now',
  robots: { index: false, follow: false },
};

export default function RainbowFallsPage() {
  return <LivingScene kind="rainbow-falls" title="Rainbow Falls" publicControls />;
}
