'use client';

import { PriorityIndicator } from '../PriorityIndicator';
import type { CalendarEvent } from '@/lib/jarvis/executive/types';

interface CalendarEventsProps {
  events?: CalendarEvent[];
  loading: boolean;
  expanded: boolean;
}

export function CalendarEvents({ events = [], loading, expanded }: CalendarEventsProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Calendar</h3>
        <div className="animate-pulse h-4 bg-white/10 rounded w-1/2" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Calendar</h3>
        <p className="text-white/40 text-sm">Clear calendar today</p>
      </div>
    );
  }

  const displayEvents = expanded ? events : events.slice(0, 2);

  return (
    <div className="space-y-2">
      <h3 className="text-white/60 text-xs uppercase tracking-wide">Calendar</h3>

      <ul className="space-y-1">
        {displayEvents.map((event) => (
          <li
            key={event.id}
            className="flex items-center gap-2 text-white/80 text-sm"
          >
            {event.isUpcoming && <PriorityIndicator type="deadline_near" pulsing={false} />}
            <span className="text-white/50">{event.time}</span>
            <span>{event.title}</span>
          </li>
        ))}
      </ul>

      {!expanded && events.length > 2 && (
        <p className="text-white/40 text-xs">+{events.length - 2} more</p>
      )}
    </div>
  );
}
