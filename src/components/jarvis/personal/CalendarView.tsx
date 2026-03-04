'use client';

import { useMemo } from 'react';
import { Card } from '@/components/jarvis/primitives';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';

function formatTime(time: string): string {
  if (!time) return '';
  if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(time)) return time;
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getWeekDays(): { label: string; date: number; isToday: boolean; dayKey: string }[] {
  const today = new Date();
  const days = [];
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      label: i === 0 ? 'Today' : DAY_NAMES[d.getDay()],
      date: d.getDate(),
      isToday: i === 0,
      dayKey: d.toDateString(),
    });
  }
  return days;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function EventRow({ title, startTime, endTime, isLast }: {
  title: string;
  startTime: string;
  endTime: string;
  isLast: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-2.5 px-1 ${!isLast ? 'border-b border-white/5' : ''}`}>
      <span className="text-xs text-white/40 w-24 flex-shrink-0">
        {formatTime(startTime)} – {formatTime(endTime)}
      </span>
      <p className="text-sm text-white/90 truncate">{title}</p>
    </div>
  );
}

export function CalendarView() {
  const events = usePersonalStore((s) => s.events);
  const weekDays = useMemo(() => getWeekDays(), []);

  const { todayEvents, upcomingEvents } = useMemo(() => {
    const today = events.filter((e) => e.isToday);
    const upcoming = events.filter((e) => !e.isToday);
    return { todayEvents: today, upcomingEvents: upcoming };
  }, [events]);

  const hasAnyEvents = todayEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cal-enter { animation: fadeInUp 400ms ease-out both; }
      `}</style>

      {/* Week strip */}
      <div className="cal-enter mb-4">
        <div className="flex gap-1.5">
          {weekDays.map((day) => (
            <div
              key={day.dayKey}
              className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border text-center ${
                day.isToday
                  ? 'bg-violet-500/15 border-violet-400/30'
                  : 'bg-white/3 border-white/8'
              }`}
            >
              <span className={`text-[10px] uppercase tracking-wider mb-1 ${day.isToday ? 'text-violet-400' : 'text-white/30'}`}>
                {day.label}
              </span>
              <span className={`text-sm font-medium ${day.isToday ? 'text-violet-300' : 'text-white/50'}`}>
                {day.date}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary badge */}
      <div className="cal-enter mb-4" style={{ animationDelay: '60ms' }}><Card variant="glass" padding="md">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
            {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''} today
          </span>
          {upcomingEvents.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
              {upcomingEvents.length} upcoming
            </span>
          )}
        </div>
      </Card></div>

      {/* Today Section */}
      {todayEvents.length > 0 && (
        <div className="cal-enter mb-3" style={{ animationDelay: '120ms' }}>
          <div className="rounded-xl bg-violet-400/5 border border-violet-400/10 p-3">
            <p className="text-xs uppercase tracking-wider text-violet-400/70 mb-2">TODAY</p>
            {todayEvents.map((event, i) => (
              <EventRow
                key={event.id}
                title={event.title}
                startTime={event.startTime}
                endTime={event.endTime}
                isLast={i === todayEvents.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingEvents.length > 0 && (
        <div className="cal-enter" style={{ animationDelay: '180ms' }}>
          <Card variant="glass" padding="sm">
            <p className="text-xs uppercase tracking-wider text-white/30 mb-2 px-1">UPCOMING</p>
            {upcomingEvents.map((event, i) => (
              <div
                key={event.id}
                className={`flex items-center gap-3 py-2.5 px-1 ${i < upcomingEvents.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <span className="text-xs text-white/30 w-24 flex-shrink-0">
                  {formatDate(event.startTime)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate">{event.title}</p>
                  <p className="text-xs text-white/30">
                    {formatTime(event.startTime)} – {formatTime(event.endTime)}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Empty state — only shown when Google Calendar has no events synced */}
      {!hasAnyEvents && (
        <div className="cal-enter text-center py-8" style={{ animationDelay: '180ms' }}>
          <p className="text-white/30 text-sm">Your calendar is clear</p>
          <p className="text-white/20 text-xs mt-1">Ask Jarvis "what's on my calendar?" to check</p>
        </div>
      )}
    </>
  );
}
