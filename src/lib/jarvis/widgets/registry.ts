import type { WidgetDefinition, PinnedWidget } from './types';

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'habit-streak',
    name: 'Habit Streak',
    domain: 'personal',
    dataSource: 'notion-habits',
    tapRoute: '/jarvis/app/personal/habits',
    quickActionLabel: 'Mark done',
    defaultSize: 'small',
  },
  {
    id: 'bill-due',
    name: 'Bill Due',
    domain: 'personal',
    dataSource: 'notion-subscriptions',
    tapRoute: '/jarvis/app/personal/bills',
    quickActionLabel: 'Mark paid',
    defaultSize: 'small',
  },
  {
    id: 'next-dose',
    name: 'Next Dose',
    domain: 'reset-biology',
    dataSource: 'peptide-protocols',
    tapRoute: '/jarvis/app/reset-biology/peptides',
    quickActionLabel: 'Log dose',
    defaultSize: 'small',
  },
  {
    id: 'regime-badge',
    name: 'Regime Badge',
    domain: 'visopscreen',
    dataSource: 'regime-status',
    tapRoute: '/jarvis/app/visopscreen/regime',
    quickActionLabel: null,
    defaultSize: 'small',
  },
  {
    id: 'pipeline',
    name: 'Pipeline Status',
    domain: 'ethereal-flame',
    dataSource: 'bullmq-queue',
    tapRoute: '/jarvis/app/ethereal-flame/pipeline',
    quickActionLabel: null,
    defaultSize: 'small',
  },
  {
    id: 'compliance',
    name: 'Compliance Alert',
    domain: 'satori-living',
    dataSource: 'compliance-calendar',
    tapRoute: '/jarvis/app/satori-living/compliance',
    quickActionLabel: null,
    defaultSize: 'small',
  },
  {
    id: 'daily-compliance',
    name: 'Daily Compliance',
    domain: 'reset-biology',
    dataSource: 'daily-compliance',
    tapRoute: '/jarvis/app/reset-biology',
    quickActionLabel: null,
    defaultSize: 'wide',
  },
  {
    id: 'portfolio-pnl',
    name: 'Portfolio P&L',
    domain: 'visopscreen',
    dataSource: 'portfolio-store',
    tapRoute: '/jarvis/app/visopscreen/portfolio',
    quickActionLabel: null,
    defaultSize: 'wide',
  },
];

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}

export function getWidgetsForDomain(domainId: string): WidgetDefinition[] {
  return WIDGET_REGISTRY.filter((w) => w.domain === domainId);
}

/** Default pinned widgets for first launch (Personal domain active) */
export const DEFAULT_PINNED_WIDGETS: PinnedWidget[] = [
  { widgetId: 'habit-streak', position: 0 },
  { widgetId: 'bill-due', position: 1 },
];
