/**
 * NudgeManager - Manages nudge triggers and delivery
 *
 * Handles time awareness nudges for:
 * - Calendar transitions (upcoming meetings/events)
 * - Task deadlines approaching
 * - Bill due dates
 * - Business deadlines
 *
 * NOT triggered by: fixed intervals or break suggestions
 *
 * Delivery: Gentle sound + visual indicator; voice only if user engages
 */

import { useJarvisStore } from '../stores/jarvisStore';
import type { BriefingData, NudgeState, NudgeEvent } from './types';
import type { VoicePipeline } from '../voice/VoicePipeline';
import { addMinutes, isWithinInterval, parseISO, isToday } from 'date-fns';

// =============================================================================
// Configuration
// =============================================================================

interface NudgeConfig {
  /** Lead time in minutes for calendar events (default: 15) */
  calendarLeadTime: number;
  /** Lead time in minutes for task deadlines (default: 60) */
  taskLeadTime: number;
  /** Lead time in hours for bills (nudge morning of due date) */
  billLeadHours: number;
  /** How often to check for nudges in ms (default: 5 min) */
  checkInterval: number;
}

const DEFAULT_CONFIG: NudgeConfig = {
  calendarLeadTime: 15, // 15 minutes before calendar events
  taskLeadTime: 60, // 1 hour before task deadlines
  billLeadHours: 8, // Morning of due date
  checkInterval: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// NudgeManager Class
// =============================================================================

export class NudgeManager {
  private config: NudgeConfig;
  private audioContext: AudioContext | null = null;
  private notificationBuffer: AudioBuffer | null = null;
  private pendingNudges: Map<string, NudgeEvent> = new Map();
  private acknowledgedNudges: Set<string> = new Set();
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<NudgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Sound Delivery
  // ===========================================================================

  /**
   * Play a gentle chime notification sound
   */
  async playNudgeSound(): Promise<void> {
    try {
      // Initialize audio context if needed (requires user gesture)
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Try to load MP3 file first, fall back to generated tone
      if (!this.notificationBuffer) {
        try {
          const response = await fetch('/sounds/gentle-chime.mp3');
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            this.notificationBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          } else {
            // Generate a gentle chime programmatically
            this.notificationBuffer = this.generateChimeBuffer();
          }
        } catch {
          // Fall back to generated chime
          this.notificationBuffer = this.generateChimeBuffer();
        }
      }

      // Play the sound
      const source = this.audioContext.createBufferSource();
      source.buffer = this.notificationBuffer;

      // Add gentle envelope for smooth sound
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.8);

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);

      console.log('[NudgeManager] Played nudge sound');
    } catch (error) {
      console.error('[NudgeManager] Error playing sound:', error);
    }
  }

  /**
   * Generate a gentle chime using Web Audio API
   * Creates a pleasant two-tone bell sound
   */
  private generateChimeBuffer(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const duration = 0.8; // 800ms
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Two harmonious tones (C5 and E5 - major third)
    const freq1 = 523.25; // C5
    const freq2 = 659.25; // E5

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;

      // Exponential decay envelope
      const envelope = Math.exp(-4 * t);

      // Combine two sine waves with slight delay on second
      const tone1 = Math.sin(2 * Math.PI * freq1 * t) * envelope;
      const tone2 = t > 0.05
        ? Math.sin(2 * Math.PI * freq2 * (t - 0.05)) * Math.exp(-4 * (t - 0.05))
        : 0;

      // Add subtle overtones for bell-like quality
      const overtone = Math.sin(2 * Math.PI * freq1 * 2 * t) * envelope * 0.2;

      data[i] = (tone1 + tone2 + overtone) * 0.4;
    }

    return buffer;
  }

  // ===========================================================================
  // Visual Delivery
  // ===========================================================================

  /**
   * Show visual nudge indicator (updates store)
   */
  showVisualNudge(nudge: NudgeState): void {
    console.log('[NudgeManager] Showing visual nudge:', nudge.message);
    useJarvisStore.getState().setActiveNudge(nudge);
  }

  /**
   * Hide the visual nudge indicator
   */
  hideVisualNudge(): void {
    useJarvisStore.getState().acknowledgeNudge();
  }

  // ===========================================================================
  // Voice Delivery
  // ===========================================================================

  /**
   * Speak the nudge message (only when user engages)
   */
  async speakNudge(message: string, voicePipeline: VoicePipeline): Promise<void> {
    console.log('[NudgeManager] Speaking nudge:', message);
    await voicePipeline.speak(message);
  }

  // ===========================================================================
  // Nudge Detection
  // ===========================================================================

  /**
   * Check for pending nudges based on current briefing data
   * Called periodically (every 5 minutes by default)
   */
  checkForNudges(briefingData: BriefingData): NudgeEvent[] {
    const now = new Date();
    const triggeredNudges: NudgeEvent[] = [];

    console.log('[NudgeManager] Checking for nudges...');

    // Check calendar events (meetings/events starting soon)
    for (const event of briefingData.calendar.today) {
      const nudgeId = `cal-${event.id}`;

      // Skip if already acknowledged
      if (this.acknowledgedNudges.has(nudgeId)) continue;

      // Check if event is upcoming (within lead time)
      if (event.isUpcoming) {
        const nudge = this.createNudge({
          id: nudgeId,
          source: 'calendar',
          sourceId: event.id,
          message: `Upcoming: ${event.title} at ${event.time}`,
          leadTimeMinutes: this.config.calendarLeadTime,
        });

        if (!this.pendingNudges.has(nudgeId)) {
          this.pendingNudges.set(nudgeId, nudge);
          triggeredNudges.push(nudge);
        }
      }
    }

    // Check tasks with due times (deadlines approaching)
    const allTasks = [...briefingData.tasks.today, ...briefingData.tasks.overdue];
    for (const task of allTasks) {
      if (!task.dueTime || !task.dueDate) continue;

      const nudgeId = `task-${task.id}`;
      if (this.acknowledgedNudges.has(nudgeId)) continue;

      // Check if task is due within lead time
      const taskDue = parseISO(`${task.dueDate}T${task.dueTime}`);
      const leadTimeStart = addMinutes(now, -this.config.taskLeadTime);
      const leadTimeEnd = addMinutes(now, this.config.taskLeadTime);

      if (isWithinInterval(taskDue, { start: leadTimeStart, end: leadTimeEnd })) {
        const nudge = this.createNudge({
          id: nudgeId,
          source: 'task',
          sourceId: task.id,
          message: `Deadline approaching: ${task.title}`,
          leadTimeMinutes: this.config.taskLeadTime,
        });

        if (!this.pendingNudges.has(nudgeId)) {
          this.pendingNudges.set(nudgeId, nudge);
          triggeredNudges.push(nudge);
        }
      }
    }

    // Check bills due today
    for (const bill of briefingData.bills.thisWeek) {
      if (!bill.dueDate) continue;

      const nudgeId = `bill-${bill.id}`;
      if (this.acknowledgedNudges.has(nudgeId)) continue;

      // Nudge if bill is due today
      const billDue = parseISO(bill.dueDate);
      if (isToday(billDue)) {
        const nudge = this.createNudge({
          id: nudgeId,
          source: 'bill',
          sourceId: bill.id,
          message: `Bill due today: ${bill.title} ($${bill.amount})`,
          leadTimeMinutes: this.config.billLeadHours * 60,
        });

        if (!this.pendingNudges.has(nudgeId)) {
          this.pendingNudges.set(nudgeId, nudge);
          triggeredNudges.push(nudge);
        }
      }
    }

    // Trigger the first unacknowledged nudge (one at a time)
    if (triggeredNudges.length > 0) {
      const firstNudge = triggeredNudges[0];
      this.triggerNudge(firstNudge);
    }

    console.log(`[NudgeManager] Found ${triggeredNudges.length} new nudges`);
    return triggeredNudges;
  }

  /**
   * Create a nudge event
   */
  private createNudge(params: {
    id: string;
    source: 'calendar' | 'task' | 'bill' | 'habit';
    sourceId: string;
    message: string;
    leadTimeMinutes: number;
  }): NudgeEvent {
    return {
      id: params.id,
      source: params.source,
      sourceId: params.sourceId,
      message: params.message,
      scheduledFor: Date.now(),
      leadTimeMinutes: params.leadTimeMinutes,
      acknowledged: false,
    };
  }

  /**
   * Trigger a nudge (sound + visual)
   */
  private async triggerNudge(nudge: NudgeEvent): Promise<void> {
    console.log('[NudgeManager] Triggering nudge:', nudge.message);

    // Play sound first
    await this.playNudgeSound();

    // Show visual indicator
    const nudgeState: NudgeState = {
      id: nudge.id,
      message: nudge.message,
      type: this.mapSourceToType(nudge.source),
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.showVisualNudge(nudgeState);
  }

  /**
   * Map nudge source to NudgeState type
   */
  private mapSourceToType(source: NudgeEvent['source']): NudgeState['type'] {
    switch (source) {
      case 'calendar':
        return 'calendar';
      case 'task':
        return 'deadline';
      case 'bill':
        return 'bill';
      case 'habit':
        return 'business'; // Habits use business type
      default:
        return 'deadline';
    }
  }

  // ===========================================================================
  // Acknowledgment
  // ===========================================================================

  /**
   * Acknowledge a nudge (prevents re-triggering)
   */
  acknowledgeNudge(nudgeId: string): void {
    console.log('[NudgeManager] Acknowledging nudge:', nudgeId);

    this.acknowledgedNudges.add(nudgeId);

    const nudge = this.pendingNudges.get(nudgeId);
    if (nudge) {
      nudge.acknowledged = true;
      nudge.acknowledgedAt = Date.now();
    }

    // Hide visual if this is the active nudge
    const activeNudge = useJarvisStore.getState().activeNudge;
    if (activeNudge?.id === nudgeId) {
      this.hideVisualNudge();
    }
  }

  /**
   * Acknowledge the currently active nudge
   */
  acknowledgeActiveNudge(): void {
    const activeNudge = useJarvisStore.getState().activeNudge;
    if (activeNudge) {
      this.acknowledgeNudge(activeNudge.id);
    }
  }

  // ===========================================================================
  // Periodic Checking
  // ===========================================================================

  /**
   * Start periodic nudge checking
   */
  startPeriodicCheck(getBriefingData: () => Promise<BriefingData>): void {
    if (this.checkIntervalId) {
      console.warn('[NudgeManager] Already running periodic check');
      return;
    }

    console.log('[NudgeManager] Starting periodic nudge check');

    this.checkIntervalId = setInterval(async () => {
      try {
        const briefingData = await getBriefingData();
        this.checkForNudges(briefingData);
      } catch (error) {
        console.error('[NudgeManager] Error during periodic check:', error);
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic nudge checking
   */
  stopPeriodicCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log('[NudgeManager] Stopped periodic nudge check');
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopPeriodicCheck();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.pendingNudges.clear();
    this.acknowledgedNudges.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: NudgeManager | null = null;

export function getNudgeManager(): NudgeManager {
  if (!instance) {
    instance = new NudgeManager();
  }
  return instance;
}

export function destroyNudgeManager(): void {
  if (instance) {
    instance.cleanup();
    instance = null;
  }
}
