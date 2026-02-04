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
  const { sections, isVisible } = useDashboardStore();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  if (!isVisible) return null;

  const allTasks = [...(data?.tasks.overdue || []), ...(data?.tasks.today || [])];
  const taskCount = allTasks.length;
  const overdueCount = data?.tasks.overdue?.length || 0;

  return (
    <>
      {/* Mobile: Compact top bar - always visible */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 safe-area-top">
        <div
          className="bg-black/80 backdrop-blur-md border-b border-white/20 shadow-lg"
          onClick={() => setMobileExpanded(!mobileExpanded)}
        >
          {/* Collapsed view - tap to expand */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400/80 text-xs uppercase tracking-wide font-medium">Today</span>
              {loading ? (
                <span className="text-white/40 text-sm">Loading...</span>
              ) : (
                <span className="text-white/90 text-sm font-medium">
                  {taskCount} task{taskCount !== 1 ? 's' : ''}
                  {overdueCount > 0 && (
                    <span className="text-red-400 ml-1">({overdueCount} overdue)</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">{mobileExpanded ? 'tap to close' : 'tap to expand'}</span>
              <svg
                className={`w-4 h-4 text-white/60 transition-transform ${mobileExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Expanded view - shows interactive tasks */}
          {mobileExpanded && (
            <div
              className="px-4 pb-4 max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()} // Prevent collapse when interacting with tasks
            >
              {/* Tasks - using interactive TasksList component */}
              {sections.tasks.visible && (
                <div className="mb-3">
                  <TasksList
                    tasks={data?.tasks.today || []}
                    overdue={data?.tasks.overdue || []}
                    loading={loading}
                    expanded={true}
                  />
                </div>
              )}

              {/* Calendar preview */}
              {sections.calendar.visible && (data?.calendar.today?.length || 0) > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/60 text-xs mb-1">Upcoming</p>
                  {data?.calendar.today?.slice(0, 3).map((event) => (
                    <p key={event.id} className="text-white/70 text-sm">
                      {event.time} - {event.title}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Right sidebar - existing design */}
      <aside
        className="hidden md:block fixed z-20 bg-black/60 backdrop-blur-md
                   border-white/10 overflow-y-auto
                   right-4 top-4 bottom-4 w-80
                   rounded-2xl border"
      >
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-white/80 text-sm font-medium">Today</h2>
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
