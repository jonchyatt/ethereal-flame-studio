/**
 * Client-Side Scheduler for Time-Based Events
 *
 * Schedules and triggers briefings, check-ins, and nudges.
 * Handles browser tab visibility changes to catch up when tab regains focus.
 *
 * Pattern: Singleton factory to ensure one scheduler per app instance.
 */

import { format, parseISO, differenceInMinutes, isWithinInterval, subHours } from 'date-fns';
import type { ScheduledEvent } from './types';

// Storage key for localStorage persistence
const STORAGE_KEY = 'jarvis_schedule';

// How far back to check for missed events (in minutes)
const MISSED_EVENT_WINDOW_MINUTES = 60;

/**
 * Scheduler class for managing time-based events
 */
export class Scheduler {
  private events: ScheduledEvent[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTrigger: (event: ScheduledEvent) => void;
  private onMissedEvent?: (event: ScheduledEvent) => void;

  constructor(
    onTrigger: (event: ScheduledEvent) => void,
    onMissedEvent?: (event: ScheduledEvent) => void
  ) {
    this.onTrigger = onTrigger;
    this.onMissedEvent = onMissedEvent;
    this.loadSchedule();

    // Handle visibility changes for background tab recovery
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Start the scheduler (check every minute)
   */
  start(): void {
    if (this.intervalId) return; // Already running

    // Check every minute
    this.intervalId = setInterval(() => this.check(), 60000);

    // Initial check
    this.check();

    console.log('[Scheduler] Started, checking every minute');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Scheduler] Stopped');
    }

    // Remove visibility listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Check if any scheduled events should trigger
   */
  private check(): void {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const today = now.toDateString();

    for (const event of this.events) {
      if (!event.enabled) continue;

      // Check if time matches
      if (event.time === currentTime) {
        // Check if already triggered today
        const lastTriggeredDate = event.lastTriggered
          ? new Date(event.lastTriggered).toDateString()
          : null;

        if (lastTriggeredDate !== today) {
          console.log(`[Scheduler] Triggering event: ${event.type} at ${event.time}`);
          event.lastTriggered = Date.now();
          this.saveSchedule();
          this.onTrigger(event);
        }
      }
    }
  }

  /**
   * Handle tab visibility changes to catch up on missed events
   */
  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;

    if (document.visibilityState === 'visible') {
      console.log('[Scheduler] Tab visible, checking for missed events');
      this.checkMissedEvents();
    }
  };

  /**
   * Check if any events were missed while tab was hidden
   */
  private checkMissedEvents(): void {
    if (!this.onMissedEvent) return;

    const now = new Date();
    const today = now.toDateString();
    const oneHourAgo = subHours(now, 1);

    for (const event of this.events) {
      if (!event.enabled) continue;

      // Parse the scheduled time for today
      const [hours, minutes] = event.time.split(':').map(Number);
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // Check if already triggered today
      const lastTriggeredDate = event.lastTriggered
        ? new Date(event.lastTriggered).toDateString()
        : null;

      // Was this event scheduled within the last hour but not triggered today?
      if (
        lastTriggeredDate !== today &&
        isWithinInterval(scheduledTime, { start: oneHourAgo, end: now })
      ) {
        console.log(`[Scheduler] Missed event detected: ${event.type}`);
        this.onMissedEvent(event);
      }
    }
  }

  /**
   * Load schedule from localStorage or use defaults
   */
  private loadSchedule(): void {
    if (typeof localStorage === 'undefined') {
      this.events = this.getDefaultSchedule();
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.events = JSON.parse(stored);
        console.log('[Scheduler] Loaded schedule from storage:', this.events);
      } else {
        this.events = this.getDefaultSchedule();
        this.saveSchedule();
        console.log('[Scheduler] Created default schedule');
      }
    } catch (error) {
      console.error('[Scheduler] Error loading schedule:', error);
      this.events = this.getDefaultSchedule();
    }
  }

  /**
   * Save schedule to localStorage
   */
  private saveSchedule(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch (error) {
      console.error('[Scheduler] Error saving schedule:', error);
    }
  }

  /**
   * Get default schedule
   */
  private getDefaultSchedule(): ScheduledEvent[] {
    return [
      {
        id: 'morning',
        type: 'morning_briefing',
        time: '08:00',
        enabled: true,
      },
      {
        id: 'midday',
        type: 'midday_checkin',
        time: '12:00',
        enabled: true,
      },
      {
        id: 'evening',
        type: 'evening_checkin',
        time: '17:00',
        enabled: true,
      },
    ];
  }

  /**
   * Update the schedule
   */
  updateSchedule(events: ScheduledEvent[]): void {
    this.events = events;
    this.saveSchedule();
    console.log('[Scheduler] Schedule updated:', events);
  }

  /**
   * Update a single event's time
   */
  updateEventTime(eventId: string, time: string): void {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.time = time;
      this.saveSchedule();
      console.log(`[Scheduler] Updated ${eventId} time to ${time}`);
    }
  }

  /**
   * Enable or disable an event
   */
  setEventEnabled(eventId: string, enabled: boolean): void {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.enabled = enabled;
      this.saveSchedule();
      console.log(`[Scheduler] ${eventId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get current schedule
   */
  getSchedule(): ScheduledEvent[] {
    return [...this.events];
  }

  /**
   * Force trigger an event (for manual "Start Briefing" button)
   */
  forceTrigger(eventType: ScheduledEvent['type']): void {
    const event = this.events.find((e) => e.type === eventType);
    if (event) {
      console.log(`[Scheduler] Force triggering: ${eventType}`);
      event.lastTriggered = Date.now();
      this.saveSchedule();
      this.onTrigger(event);
    } else {
      // Create a temporary event for manual triggers
      const tempEvent: ScheduledEvent = {
        id: `manual_${Date.now()}`,
        type: eventType,
        time: format(new Date(), 'HH:mm'),
        enabled: true,
        lastTriggered: Date.now(),
      };
      this.onTrigger(tempEvent);
    }
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let instance: Scheduler | null = null;

/**
 * Get the scheduler instance (creates one if doesn't exist)
 */
export function getScheduler(
  onTrigger: (event: ScheduledEvent) => void,
  onMissedEvent?: (event: ScheduledEvent) => void
): Scheduler {
  if (!instance) {
    instance = new Scheduler(onTrigger, onMissedEvent);
  }
  return instance;
}

/**
 * Destroy the scheduler instance (for cleanup)
 */
export function destroyScheduler(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
