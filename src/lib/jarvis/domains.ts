export interface Domain {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  color: string; // Tailwind color prefix (e.g., 'cyan', 'violet')
  route: string;
}

export const DOMAINS: Domain[] = [
  { id: 'home', name: 'Home', icon: 'Home', color: 'cyan', route: '/jarvis/app' },
  { id: 'personal', name: 'Personal', icon: 'User', color: 'violet', route: '/jarvis/app/personal' },
  { id: 'ethereal-flame', name: 'Ethereal Flame', icon: 'Flame', color: 'orange', route: '/jarvis/app/ethereal-flame' },
  { id: 'reset-biology', name: 'Reset Biology', icon: 'Dna', color: 'emerald', route: '/jarvis/app/reset-biology' },
  { id: 'critfailvlogs', name: 'CritFailVlogs', icon: 'Dice6', color: 'rose', route: '/jarvis/app/critfailvlogs' },
  { id: 'visopscreen', name: 'Visopscreen', icon: 'TrendingUp', color: 'sky', route: '/jarvis/app/visopscreen' },
  { id: 'satori-living', name: 'Satori Living', icon: 'Landmark', color: 'amber', route: '/jarvis/app/satori-living' },
  { id: 'entity-building', name: 'Entity Building', icon: 'Building2', color: 'indigo', route: '/jarvis/app/entity-building' },
];

const DOMAIN_MAP = new Map(DOMAINS.map((d) => [d.id, d]));

export function getDomainById(id: string): Domain | undefined {
  return DOMAIN_MAP.get(id);
}

/**
 * Maps domain color names to Tailwind class fragments for dynamic usage.
 * Use these when you need to construct classes from domain.color at runtime.
 */
export const DOMAIN_COLORS: Record<string, { text: string; bg: string; bgSubtle: string }> = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500', bgSubtle: 'bg-cyan-500/15' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-500', bgSubtle: 'bg-violet-500/15' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500', bgSubtle: 'bg-orange-500/15' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500', bgSubtle: 'bg-emerald-500/15' },
  rose: { text: 'text-rose-400', bg: 'bg-rose-500', bgSubtle: 'bg-rose-500/15' },
  sky: { text: 'text-sky-400', bg: 'bg-sky-500', bgSubtle: 'bg-sky-500/15' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500', bgSubtle: 'bg-amber-500/15' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500', bgSubtle: 'bg-indigo-500/15' },
};
