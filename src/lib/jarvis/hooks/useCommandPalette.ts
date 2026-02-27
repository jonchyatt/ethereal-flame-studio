'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS } from '@/lib/jarvis/domains';
import { useSettingsStore } from '@/lib/jarvis/stores/settingsStore';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import { TIER_1_LESSONS } from '@/lib/jarvis/curriculum/tutorialLessons';

// ── Types ──────────────────────────────────────────────────────────────────

export type PaletteItem = {
  id: string;
  type: 'domain' | 'page' | 'action' | 'item' | 'lesson';
  label: string;
  route?: string;
  onSelect?: () => void;
  icon?: string;
  domainColor?: string;
  shortcut?: string;
};

export type ScoredItem = PaletteItem & {
  score: number;
  matchIndices: number[];
};

export type PaletteSection = {
  type: string;
  label: string;
  items: ScoredItem[];
};

// ── Fuzzy Match ────────────────────────────────────────────────────────────

function fuzzyMatchSingle(
  token: string,
  target: string,
): { match: boolean; score: number; indices: number[] } {
  const tLower = token.toLowerCase();
  const sLower = target.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let ti = 0;

  for (let si = 0; si < sLower.length && ti < tLower.length; si++) {
    if (sLower[si] === tLower[ti]) {
      indices.push(si);
      score += 10;

      // Consecutive bonus
      if (indices.length > 1 && indices[indices.length - 2] === si - 1) {
        score += 5;
      }

      // Word-start bonus (index 0, or after space/hyphen)
      if (si === 0 || sLower[si - 1] === ' ' || sLower[si - 1] === '-') {
        score += 10;
      }

      // Target-start bonus
      if (si === 0) {
        score += 3;
      }

      ti++;
    }
  }

  return { match: ti === tLower.length, score, indices };
}

export function fuzzyMatch(
  query: string,
  target: string,
): { match: boolean; score: number; indices: number[] } {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { match: false, score: 0, indices: [] };

  let totalScore = 0;
  const allIndices: number[] = [];

  for (const token of tokens) {
    const result = fuzzyMatchSingle(token, target);
    if (!result.match) return { match: false, score: 0, indices: [] };
    totalScore += result.score;
    allIndices.push(...result.indices);
  }

  // Deduplicate and sort indices
  const uniqueIndices = [...new Set(allIndices)].sort((a, b) => a - b);
  return { match: true, score: totalScore, indices: uniqueIndices };
}

// ── Recents Persistence ────────────────────────────────────────────────────

const RECENTS_KEY = 'jarvis-command-palette-recents';
const MAX_RECENTS = 5;

function loadRecents(): PaletteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as PaletteItem[]) : [];
  } catch {
    return [];
  }
}

function saveRecents(items: PaletteItem[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// ── Section Config ─────────────────────────────────────────────────────────

const SECTION_ORDER: { type: string; label: string }[] = [
  { type: 'action', label: 'Actions' },
  { type: 'domain', label: 'Domains' },
  { type: 'page', label: 'Pages' },
  { type: 'item', label: 'Items' },
  { type: 'lesson', label: 'Academy' },
];

const SECTION_CAP = 4;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCommandPalette() {
  const router = useRouter();
  const activeDomainIds = useSettingsStore((s) => s.activeDomainIds);
  const tasks = usePersonalStore((s) => s.tasks);
  const habits = usePersonalStore((s) => s.habits);
  const goals = usePersonalStore((s) => s.goals);
  const closeCommandPalette = useShellStore((s) => s.closeCommandPalette);
  const toggleChat = useShellStore((s) => s.toggleChat);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<PaletteItem[]>(loadRecents);

  // ── Build item registry ──────────────────────────────────────────────

  const registry = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // Domains (only active ones)
    for (const d of DOMAINS) {
      if (!activeDomainIds.includes(d.id)) continue;
      items.push({
        id: `domain:${d.id}`,
        type: 'domain',
        label: d.name,
        route: d.route,
        icon: d.icon,
        domainColor: d.color,
      });
    }

    // Pages (personal sub-views + top-level pages)
    const pages: { label: string; route: string; color: string }[] = [
      { label: 'Tasks', route: '/jarvis/app/personal/tasks', color: 'violet' },
      { label: 'Habits', route: '/jarvis/app/personal/habits', color: 'violet' },
      { label: 'Bills & Finance', route: '/jarvis/app/personal/bills', color: 'violet' },
      { label: 'Calendar', route: '/jarvis/app/personal/calendar', color: 'violet' },
      { label: 'Journal', route: '/jarvis/app/personal/journal', color: 'violet' },
      { label: 'Goals', route: '/jarvis/app/personal/goals', color: 'violet' },
      { label: 'Health', route: '/jarvis/app/personal/health', color: 'violet' },
      { label: 'Academy', route: '/jarvis/app/academy', color: 'cyan' },
      { label: 'Settings', route: '/jarvis/app/settings', color: 'cyan' },
    ];
    for (const p of pages) {
      items.push({
        id: `page:${p.route}`,
        type: 'page',
        label: p.label,
        route: p.route,
        icon: 'FileText',
        domainColor: p.color,
      });
    }

    // Actions
    items.push({
      id: 'action:add-task',
      type: 'action',
      label: 'Add task',
      route: '/jarvis/app/personal/tasks',
      icon: 'Plus',
    });
    items.push({
      id: 'action:journal-entry',
      type: 'action',
      label: 'Journal entry',
      route: '/jarvis/app/personal/journal',
      icon: 'BookOpen',
    });
    items.push({
      id: 'action:toggle-chat',
      type: 'action',
      label: 'Toggle chat',
      onSelect: toggleChat,
      icon: 'MessageCircle',
    });
    items.push({
      id: 'action:open-settings',
      type: 'action',
      label: 'Open settings',
      route: '/jarvis/app/settings',
      icon: 'Settings',
    });

    // Personal Items (tasks, habits, goals)
    for (const t of tasks) {
      items.push({
        id: `item:task-${t.id}`,
        type: 'item',
        label: t.title,
        route: '/jarvis/app/personal/tasks',
        domainColor: 'violet',
      });
    }
    for (const h of habits) {
      items.push({
        id: `item:habit-${h.id}`,
        type: 'item',
        label: h.name,
        route: '/jarvis/app/personal/habits',
        domainColor: 'violet',
      });
    }
    for (const g of goals) {
      items.push({
        id: `item:goal-${g.id}`,
        type: 'item',
        label: g.title,
        route: '/jarvis/app/personal/goals',
        domainColor: 'violet',
      });
    }

    // Lessons
    for (const l of TIER_1_LESSONS) {
      items.push({
        id: `lesson:${l.id}`,
        type: 'lesson',
        label: l.name,
        route: '/jarvis/app/academy',
        icon: 'GraduationCap',
        domainColor: 'cyan',
      });
    }

    return items;
  }, [activeDomainIds, tasks, habits, goals, toggleChat]);

  // ── Search + Section ─────────────────────────────────────────────────

  const sections = useMemo<PaletteSection[]>(() => {
    if (!query.trim()) return [];

    // Score every item
    const scored: ScoredItem[] = [];
    for (const item of registry) {
      const result = fuzzyMatch(query, item.label);
      if (result.match) {
        scored.push({ ...item, score: result.score, matchIndices: result.indices });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Group into sections in canonical order, cap each at SECTION_CAP
    const result: PaletteSection[] = [];
    for (const sec of SECTION_ORDER) {
      const sectionItems = scored.filter((s) => s.type === sec.type).slice(0, SECTION_CAP);
      if (sectionItems.length > 0) {
        result.push({ type: sec.type, label: sec.label, items: sectionItems });
      }
    }

    return result;
  }, [query, registry]);

  // ── Flat items for keyboard nav ──────────────────────────────────────

  const flatItems = useMemo<ScoredItem[]>(() => {
    return sections.flatMap((s) => s.items);
  }, [sections]);

  // ── Keyboard Navigation ──────────────────────────────────────────────

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // When there's a query, navigate through search results
      if (query.trim() && flatItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % flatItems.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const item = flatItems[activeIndex];
          if (item) selectItem(item);
        }
        return;
      }

      // When query is empty, navigate through default items (recents + actions + domains)
      const defaultItems = getDefaultFlatItems();
      if (defaultItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % defaultItems.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + defaultItems.length) % defaultItems.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const item = defaultItems[activeIndex];
          if (item) selectItem(item);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, flatItems, activeIndex],
  );

  // ── Default flat items (recents + actions + domains from registry) ──

  const getDefaultFlatItems = useCallback((): PaletteItem[] => {
    const actions = registry.filter((i) => i.type === 'action');
    const domains = registry.filter((i) => i.type === 'domain');
    return [...recents, ...actions, ...domains];
  }, [registry, recents]);

  // ── Query change resets active index ─────────────────────────────────

  const handleSetQuery = useCallback((q: string) => {
    setQuery(q);
    setActiveIndex(0);
  }, []);

  // ── Select ───────────────────────────────────────────────────────────

  const selectItem = useCallback(
    (item: PaletteItem) => {
      // Add to recents (skip actions)
      if (item.type !== 'action') {
        setRecents((prev) => {
          const filtered = prev.filter((r) => r.id !== item.id);
          // Strip onSelect/score/matchIndices for serialization
          const clean: PaletteItem = {
            id: item.id,
            type: item.type,
            label: item.label,
            route: item.route,
            icon: item.icon,
            domainColor: item.domainColor,
            shortcut: item.shortcut,
          };
          const next = [clean, ...filtered].slice(0, MAX_RECENTS);
          saveRecents(next);
          return next;
        });
      }

      // Execute
      if (item.onSelect) {
        item.onSelect();
      } else if (item.route) {
        router.push(item.route);
      }

      closeCommandPalette();
    },
    [router, closeCommandPalette],
  );

  return {
    query,
    setQuery: handleSetQuery,
    sections,
    activeIndex,
    onKeyDown,
    selectItem,
    recents,
    flatItems,
    registry,
    getDefaultFlatItems,
  };
}
