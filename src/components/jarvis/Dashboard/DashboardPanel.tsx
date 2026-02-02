'use client';

import { useState } from 'react';
import { useDashboardStore } from '@/lib/jarvis/stores/dashboardStore';
import { TasksList } from './TasksList';
import { CalendarEvents } from './CalendarEvents';
import { HabitProgress } from './HabitProgress';
import { BillsSummary } from './BillsSummary';
import type { BriefingData } from '@/lib/jarvis/executive/types';

interface DashboardPanelProps {
  data: BriefingData | null;
  loading: boolean;
}

export function DashboardPanel({ data, loading }: DashboardPanelProps) {
  const { sections, isVisible, setIsVisible } = useDashboardStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isVisible) return null;

  // Mobile drawer toggle button
  const MobileToggle = () => (
    <button
      onClick={() => setMobileOpen(!mobileOpen)}
      className="fixed bottom-4 right-4 z-40 md:hidden
                 bg-white/10 backdrop-blur-md rounded-full p-3
                 border border-white/20"
      aria-label={mobileOpen ? 'Close dashboard' : 'Open dashboard'}
    >
      <svg
        className="w-6 h-6 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {mobileOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <MobileToggle />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Dashboard panel */}
      <aside
        className={`
          fixed z-20 bg-black/60 backdrop-blur-md
          border-white/10 overflow-y-auto

          /* Desktop: right sidebar */
          md:right-4 md:top-4 md:bottom-4 md:w-80
          md:rounded-2xl md:border

          /* Mobile: full-height drawer from right */
          ${mobileOpen ? 'right-0' : '-right-full'}
          top-0 bottom-0 w-80
          border-l transition-all duration-300
          md:translate-x-0
        `}
      >
        <div className="p-4 space-y-6">
          {/* Header with close button */}
          <div className="flex items-center justify-between">
            <h2 className="text-white/80 text-sm font-medium">Today</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/40 hover:text-white/60 text-xs"
              aria-label="Hide dashboard"
            >
              Hide
            </button>
          </div>

          {/* Tasks Section */}
          {sections.tasks.visible && (
            <TasksList
              tasks={data?.tasks.today || []}
              overdue={data?.tasks.overdue || []}
              loading={loading}
              expanded={sections.tasks.expanded}
            />
          )}

          {/* Divider */}
          {sections.tasks.visible && sections.calendar.visible && (
            <hr className="border-white/10" />
          )}

          {/* Calendar Events */}
          {sections.calendar.visible && (
            <CalendarEvents
              events={data?.calendar.today || []}
              loading={loading}
              expanded={sections.calendar.expanded}
            />
          )}

          {/* Divider */}
          {sections.calendar.visible && sections.habits.visible && (
            <hr className="border-white/10" />
          )}

          {/* Habits */}
          {sections.habits.visible && (
            <HabitProgress
              habits={data?.habits.active || []}
              loading={loading}
              expanded={sections.habits.expanded}
            />
          )}

          {/* Divider */}
          {sections.habits.visible && sections.bills.visible && (
            <hr className="border-white/10" />
          )}

          {/* Bills */}
          {sections.bills.visible && (
            <BillsSummary
              bills={data?.bills.thisWeek || []}
              total={data?.bills.total || 0}
              loading={loading}
              expanded={sections.bills.expanded}
            />
          )}
        </div>
      </aside>
    </>
  );
}
