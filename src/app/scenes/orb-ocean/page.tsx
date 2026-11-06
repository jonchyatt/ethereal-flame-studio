import type { Metadata } from 'next';
import LivingScene from '@/components/scenes/LivingScene';

export const metadata: Metadata = {
  title: 'Orb Ocean · What Am I Appreciating Now',
  robots: { index: false, follow: false },
};

export default function OrbOceanPage() {
  return <LivingScene kind="orb-ocean" title="Orb Ocean" publicControls />;
}
