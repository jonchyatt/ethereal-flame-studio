'use client';

import {
  Home,
  User,
  Flame,
  Dna,
  Dice6,
  TrendingUp,
  Landmark,
  Building2,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Home,
  User,
  Flame,
  Dna,
  Dice6,
  TrendingUp,
  Landmark,
  Building2,
};

interface DomainIconProps extends LucideProps {
  name: string;
}

export function DomainIcon({ name, ...props }: DomainIconProps) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
