'use client';

import { useState, useMemo } from 'react';
import { Card, EmptyState, Button } from '@/components/jarvis/primitives';
import {
  Sunrise,
  Sun,
  Moon,
  Home,
  MapPin,
  Package,
  ShoppingCart,
  Warehouse,
  BookOpen,
  ChevronDown,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { usePersonalStore, type PersonalMeal } from '@/lib/jarvis/stores/personalStore';
import { useChatStore } from '@/lib/jarvis/stores/chatStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TIME_ORDER: Record<string, number> = {
  Breakfast: 0,
  Lunch: 1,
  Dinner: 2,
};

const TIME_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Breakfast: Sunrise,
  Lunch: Sun,
  Dinner: Moon,
};

const SETTING_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Home: Home,
  'Dine-Out': MapPin,
  Takeout: Package,
};

const TABS = ['Weekly', 'Shopping', 'Pantry', 'Recipes'] as const;
type TabId = (typeof TABS)[number];

// ── Tab Navigation ────────────────────────────────────────────────────────────

function TabNav({
  active,
  onChange,
  shoppingCount,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
  shoppingCount: number;
}) {
  return (
    <div
      className="bg-black/40 backdrop-blur-sm rounded-2xl p-1 flex gap-1 mb-4"
      role="tablist"
    >
      {TABS.map((tab) => {
        const isActive = tab === active;
        const badge = tab === 'Shopping' && shoppingCount > 0 ? shoppingCount : null;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={isActive}
            data-tutorial-id={tab === 'Weekly' ? 'meals-weekly-tab' : undefined}
            className={`
              px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-1 text-center
              ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5 border border-transparent'
              }
            `}
            onClick={() => onChange(tab)}
          >
            {tab}
            {badge && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] leading-none">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Meal Row ──────────────────────────────────────────────────────────────────

function MealRow({ meal, isLast }: { meal: PersonalMeal; isLast: boolean }) {
  const TimeIcon = meal.timeOfDay ? TIME_ICONS[meal.timeOfDay] : null;
  const SettingIcon = meal.setting ? SETTING_ICONS[meal.setting] : null;

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-1 ${!isLast ? 'border-b border-white/5' : ''}`}
    >
      {TimeIcon && <TimeIcon size={14} className="text-amber-400/70 flex-shrink-0" />}
      <span className="text-xs text-amber-400/70 w-16 flex-shrink-0">
        {meal.timeOfDay || '—'}
      </span>
      <p className="text-sm text-white/90 flex-1 min-w-0 truncate">{meal.name}</p>
      {SettingIcon && meal.setting && (
        <span className="flex items-center gap-1 text-xs text-white/40 flex-shrink-0">
          <SettingIcon size={12} />
          {meal.setting}
        </span>
      )}
      {meal.servings != null && (
        <span className="flex items-center gap-1 text-xs text-white/40 flex-shrink-0">
          <Users size={12} />
          {meal.servings}
        </span>
      )}
    </div>
  );
}

// ── Day Section ───────────────────────────────────────────────────────────────

function DaySection({
  day,
  meals,
  isToday,
  defaultExpanded,
  animDelay,
  isFirst,
  onChat,
}: {
  day: string;
  meals: PersonalMeal[];
  isToday: boolean;
  defaultExpanded: boolean;
  animDelay: number;
  isFirst: boolean;
  onChat: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const sorted = useMemo(
    () =>
      [...meals].sort(
        (a, b) => (TIME_ORDER[a.timeOfDay] ?? 99) - (TIME_ORDER[b.timeOfDay] ?? 99),
      ),
    [meals],
  );

  const headerClass = isToday
    ? 'text-xs uppercase tracking-wider text-amber-400/70'
    : 'text-xs uppercase tracking-wider text-white/30';

  const headerText = isToday ? `Today · ${day}` : day;

  const content = (
    <div className={`${expanded ? '' : 'hidden md:block'}`}>
      {sorted.length > 0 ? (
        sorted.map((meal, i) => (
          <MealRow key={meal.id} meal={meal} isLast={i === sorted.length - 1} />
        ))
      ) : (
        <button
          className="flex items-center gap-2 text-xs text-white/30 hover:text-amber-400/70 py-2 px-1 transition-colors group w-full"
          onClick={() => onChat(`Help me plan a meal for ${day}`)}
        >
          <span>No meals planned</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400/50">
            — plan with Jarvis
          </span>
        </button>
      )}
    </div>
  );

  const inner = (
    <>
      <button
        className="flex items-center justify-between w-full mb-2"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <p className={headerClass}>{headerText}</p>
        <ChevronDown
          className={`w-4 h-4 text-white/30 md:hidden transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {content}
    </>
  );

  return (
    <div
      className="meal-section-enter"
      style={{ animationDelay: `${animDelay}ms` }}
      data-tutorial-id={isFirst ? 'meals-first-day' : undefined}
    >
      {isToday ? (
        <div className="rounded-xl bg-amber-400/5 border border-amber-400/10 p-3">{inner}</div>
      ) : (
        <Card variant="glass" padding="sm">
          {inner}
        </Card>
      )}
    </div>
  );
}

// ── Weekly Planner Content ────────────────────────────────────────────────────

function WeeklyPlannerContent({
  meals,
  onChat,
}: {
  meals: PersonalMeal[];
  onChat: (msg: string) => void;
}) {
  const todayDayName = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    [],
  );

  const orderedDays = useMemo(() => {
    const todayIndex = DAYS_ORDER.indexOf(todayDayName);
    if (todayIndex === -1) return DAYS_ORDER;
    return [...DAYS_ORDER.slice(todayIndex), ...DAYS_ORDER.slice(0, todayIndex)];
  }, [todayDayName]);

  const mealsByDay = useMemo(() => {
    const grouped = new Map<string, PersonalMeal[]>();
    for (const day of DAYS_ORDER) {
      grouped.set(day, []);
    }
    for (const meal of meals) {
      const existing = grouped.get(meal.dayOfWeek);
      if (existing) {
        existing.push(meal);
      }
    }
    return grouped;
  }, [meals]);

  const todayMealCount = mealsByDay.get(todayDayName)?.length ?? 0;

  if (meals.length === 0) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="w-12 h-12" />}
        title="No meals planned yet"
        description="Tell Jarvis what you'd like to eat this week and watch your plan come together"
        actionLabel="Plan my week"
        onAction={() => onChat('Help me plan meals for this week')}
      />
    );
  }

  return (
    <>
      {/* Summary Hero */}
      <Card variant="glass" padding="md" className="meal-section-enter mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
            {todayMealCount} {todayMealCount === 1 ? 'meal' : 'meals'} today
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
            {meals.length} this week
          </span>
        </div>
      </Card>

      {/* Day Sections */}
      <div className="space-y-3">
        {orderedDays.map((day, index) => (
          <DaySection
            key={day}
            day={day}
            meals={mealsByDay.get(day) ?? []}
            isToday={day === todayDayName}
            defaultExpanded={day === todayDayName}
            animDelay={(index + 1) * 80}
            isFirst={index === 0}
            onChat={onChat}
          />
        ))}
      </div>
    </>
  );
}

// ── Shopping List Content ─────────────────────────────────────────────────────

function ShoppingListContent({
  count,
  onChat,
}: {
  count: number;
  onChat: (msg: string) => void;
}) {
  if (count > 0) {
    return (
      <div className="meal-section-enter">
        <Card variant="glass" padding="lg">
          <div className="flex flex-col items-center py-6">
            <p className="text-3xl font-bold text-amber-400">{count}</p>
            <p className="text-sm text-white/50 mt-1">
              {count === 1 ? 'item' : 'items'} on your shopping list
            </p>
            <div className="flex gap-2 mt-6">
              <Button
                variant="primary"
                size="md"
                onClick={() => onChat('Show me my shopping list')}
              >
                View full list
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() =>
                  onChat('Generate a shopping list from this week\'s meal plan')
                }
              >
                Regenerate
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <EmptyState
      icon={<ShoppingCart className="w-12 h-12" />}
      title="Shopping list is empty"
      description="Generate a smart shopping list from your meal plan — Jarvis checks your pantry and only adds what you need"
      actionLabel="Generate shopping list"
      onAction={() =>
        onChat('Generate a shopping list from this week\'s meal plan')
      }
    />
  );
}

// ── Pantry Content ────────────────────────────────────────────────────────────

function PantryContent({ onChat }: { onChat: (msg: string) => void }) {
  return (
    <EmptyState
      icon={<Warehouse className="w-12 h-12" />}
      title="Pantry tracking"
      description="Tell Jarvis what's in your kitchen so shopping lists subtract what you already have"
      actionLabel="What's in my pantry?"
      onAction={() => onChat("What's in my pantry?")}
    />
  );
}

// ── Recipes Content ───────────────────────────────────────────────────────────

function RecipesContent({ onChat }: { onChat: (msg: string) => void }) {
  return (
    <EmptyState
      icon={<BookOpen className="w-12 h-12" />}
      title="Recipe collection"
      description="Browse your saved recipes or ask Jarvis to find something new for dinner"
      actionLabel="Show my recipes"
      onAction={() => onChat('Show me all my saved recipes')}
    />
  );
}

// ── MealsView (exported) ─────────────────────────────────────────────────────

export function MealsView() {
  const [activeTab, setActiveTab] = useState<TabId>('Weekly');
  const meals = usePersonalStore((s) => s.meals);
  const shoppingListCount = usePersonalStore((s) => s.shoppingListCount);
  const openWithMessage = useChatStore((s) => s.openWithMessage);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .meal-section-enter { animation: fadeInUp 400ms ease-out both; }
      `}</style>

      <TabNav active={activeTab} onChange={setActiveTab} shoppingCount={shoppingListCount} />

      {activeTab === 'Weekly' && <WeeklyPlannerContent meals={meals} onChat={openWithMessage} />}
      {activeTab === 'Shopping' && (
        <ShoppingListContent count={shoppingListCount} onChat={openWithMessage} />
      )}
      {activeTab === 'Pantry' && <PantryContent onChat={openWithMessage} />}
      {activeTab === 'Recipes' && <RecipesContent onChat={openWithMessage} />}
    </>
  );
}
