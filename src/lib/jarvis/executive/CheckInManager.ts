/**
 * CheckInManager - Manages midday and evening check-in flows
 *
 * Per CONTEXT.md:
 * - Midday check-in: Progress review, reprioritization, new captures
 * - Evening check-in: Day completion, loose end capture, tomorrow preview,
 *   goal/project review (based on cadence), reprioritization
 *
 * Check-ins are easily skippable (voice, tap, or 10s timeout).
 */

import type { CheckInType, BriefingData, CheckInProgress, TaskSummary } from './types';
import { buildCheckInData } from './BriefingClient';
import type { VoicePipeline } from '../voice/VoicePipeline';
import { useJarvisStore } from '../stores/jarvisStore';
import { executeNotionTool } from '../notion/toolExecutor';

// =============================================================================
// Configuration
// =============================================================================

interface CheckInConfig {
  /** Auto-dismiss timeout in ms (default: 10s) */
  autoDismissTimeout: number;
  /** Whether to speak the check-in prompt */
  speakPrompt: boolean;
}

const DEFAULT_CONFIG: CheckInConfig = {
  autoDismissTimeout: 10 * 1000, // 10 seconds
  speakPrompt: true,
};

// =============================================================================
// Check-in State
// =============================================================================

type CheckInPhase =
  | 'intro'
  | 'progress'
  | 'reprioritize'
  | 'capture'
  | 'tomorrow'
  | 'review'
  | 'complete';

interface CheckInState {
  type: CheckInType;
  phase: CheckInPhase;
  data: BriefingData | null;
  progress: CheckInProgress | null;
  tomorrow?: { tasks: TaskSummary[] };
  isActive: boolean;
  isWaitingForResponse: boolean;
  capturedItems: string[];
}

// =============================================================================
// CheckInManager Class
// =============================================================================

export class CheckInManager {
  private config: CheckInConfig;
  private state: CheckInState;
  private speakFn: ((text: string) => Promise<void>) | null = null;
  private autoDismissTimer: ReturnType<typeof setTimeout> | null = null;
  private onComplete: (() => void) | null = null;

  constructor(config: Partial<CheckInConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.getInitialState('midday');
  }

  /**
   * Get initial state for a check-in type
   */
  private getInitialState(type: CheckInType): CheckInState {
    return {
      type,
      phase: 'intro',
      data: null,
      progress: null,
      tomorrow: undefined,
      isActive: false,
      isWaitingForResponse: false,
      capturedItems: [],
    };
  }

  // ===========================================================================
  // Midday Check-in
  // ===========================================================================

  /**
   * Start midday check-in
   *
   * Covers:
   * - Progress review: "You've completed X of Y tasks"
   * - Reprioritization: "What's the priority for the afternoon?"
   * - New captures: "Anything come up to add?"
   */
  async startMiddayCheckIn(
    voicePipeline: VoicePipeline,
    onComplete?: () => void
  ): Promise<void> {
    console.log('[CheckInManager] Starting midday check-in');

    this.state = this.getInitialState('midday');
    this.speakFn = (text) => voicePipeline.speak(text);
    this.onComplete = onComplete || null;

    try {
      // Fetch current data
      const { briefing, progress } = await buildCheckInData('midday');
      this.state.data = briefing;
      this.state.progress = progress;
      this.state.isActive = true;

      // Update store
      useJarvisStore.getState().setIsBriefingActive(true);
      useJarvisStore.getState().setCurrentBriefingSection('tasks');

      // Speak intro with progress
      const script = this.buildMiddayIntroScript(progress);
      await this.speak(script);

      // Set up auto-dismiss
      this.startAutoDismissTimer();
      this.state.isWaitingForResponse = true;
    } catch (error) {
      console.error('[CheckInManager] Error starting midday check-in:', error);
      await this.speak("I'm having trouble loading your data. Let's try again later.");
      this.complete();
    }
  }

  /**
   * Build midday intro script
   */
  private buildMiddayIntroScript(progress: CheckInProgress): string {
    const parts: string[] = [];

    // Progress summary
    parts.push("It's midday.");

    if (progress.totalTasksToday > 0) {
      parts.push(
        `You've completed ${progress.tasksCompletedToday} of ${progress.totalTasksToday} tasks so far.`
      );
    } else {
      parts.push("No tasks scheduled for today.");
    }

    if (progress.overdueCount > 0) {
      parts.push(`${progress.overdueCount} overdue.`);
    }

    parts.push("What's the priority for the afternoon? Or say skip.");

    return parts.join(' ');
  }

  // ===========================================================================
  // Evening Check-in
  // ===========================================================================

  /**
   * Start evening check-in
   *
   * Covers:
   * - Day completion: What got done, what didn't
   * - Loose end capture: "Anything floating in your head?"
   * - Tomorrow preview: "Here's what's on deck"
   * - Goal/project review (based on cadence)
   * - Reprioritization
   */
  async startEveningCheckIn(
    voicePipeline: VoicePipeline,
    onComplete?: () => void
  ): Promise<void> {
    console.log('[CheckInManager] Starting evening check-in');

    this.state = this.getInitialState('evening');
    this.speakFn = (text) => voicePipeline.speak(text);
    this.onComplete = onComplete || null;

    try {
      // Fetch current data (includes tomorrow tasks for evening check-ins)
      const { briefing, progress, tomorrow } = await buildCheckInData('evening');
      this.state.data = briefing;
      this.state.progress = progress;
      this.state.tomorrow = tomorrow;
      this.state.isActive = true;

      // Update store
      useJarvisStore.getState().setIsBriefingActive(true);
      useJarvisStore.getState().setCurrentBriefingSection('tasks');

      // Speak intro with day summary
      const script = this.buildEveningIntroScript(progress, briefing);
      await this.speak(script);

      // Set up auto-dismiss
      this.startAutoDismissTimer();
      this.state.isWaitingForResponse = true;
    } catch (error) {
      console.error('[CheckInManager] Error starting evening check-in:', error);
      await this.speak("I'm having trouble loading your data. Let's try again later.");
      this.complete();
    }
  }

  /**
   * Build evening intro script
   */
  private buildEveningIntroScript(
    progress: CheckInProgress,
    briefing: BriefingData
  ): string {
    const parts: string[] = [];

    // Day summary
    parts.push('End of day wrap-up.');

    if (progress.totalTasksToday > 0) {
      parts.push(
        `You completed ${progress.tasksCompletedToday} of ${progress.totalTasksToday} tasks today.`
      );

      const pending = progress.totalTasksToday - progress.tasksCompletedToday;
      if (pending > 0) {
        parts.push(`${pending} still pending.`);
      }
    }

    if (progress.overdueCount > 0) {
      parts.push(`${progress.overdueCount} overdue.`);
    }

    // Prompt for loose ends
    parts.push("Anything floating in your head to capture? Or say skip.");

    return parts.join(' ');
  }

  // ===========================================================================
  // Response Handling
  // ===========================================================================

  /**
   * Handle user response during check-in
   */
  async handleCheckInResponse(response: string): Promise<void> {
    if (!this.state.isActive) return;

    this.clearAutoDismissTimer();
    const lower = response.toLowerCase().trim();

    // Skip commands
    if (this.isSkipCommand(lower)) {
      await this.advancePhase();
      return;
    }

    // Based on current phase, handle response
    switch (this.state.phase) {
      case 'intro':
      case 'progress':
        // User responding about priorities
        if (lower.length > 2 && !this.isAcknowledgement(lower)) {
          // Could route to Claude for intelligent response
          await this.speak("Got it. I'll note that priority.");
        }
        await this.advancePhase();
        break;

      case 'capture':
        // User is adding items
        if (lower.length > 2 && !this.isAcknowledgement(lower)) {
          this.state.capturedItems.push(response);
          await this.speak(`Added: ${response}. Anything else?`);
          this.startAutoDismissTimer();
          return;
        }
        await this.advancePhase();
        break;

      case 'reprioritize':
        // User reprioritizing
        if (lower.length > 2 && !this.isAcknowledgement(lower)) {
          await this.speak("I'll update the priorities.");
        }
        await this.advancePhase();
        break;

      case 'tomorrow':
      case 'review':
        await this.advancePhase();
        break;

      default:
        await this.advancePhase();
    }
  }

  /**
   * Check if response is a skip command
   */
  private isSkipCommand(response: string): boolean {
    const skipWords = [
      'skip',
      'not now',
      'later',
      'no',
      'nope',
      'pass',
      'done',
      "that's it",
      "that's all",
      'nothing',
      'next',
    ];
    return skipWords.some((word) => response.includes(word));
  }

  /**
   * Check if response is just an acknowledgement
   */
  private isAcknowledgement(response: string): boolean {
    const ackWords = ['yes', 'yeah', 'yep', 'okay', 'ok', 'sure', 'continue', 'go ahead'];
    return ackWords.includes(response);
  }

  /**
   * Advance to the next phase
   */
  private async advancePhase(): Promise<void> {
    const phases = this.getPhasesForType(this.state.type);
    const currentIndex = phases.indexOf(this.state.phase);

    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      this.state.phase = nextPhase;

      const script = this.getPhaseScript(nextPhase);
      if (script) {
        await this.speak(script);
        this.startAutoDismissTimer();
        this.state.isWaitingForResponse = true;
      } else {
        // Empty phase, skip to next
        await this.advancePhase();
      }
    } else {
      // All phases complete
      this.complete();
    }
  }

  /**
   * Get phases for check-in type
   */
  private getPhasesForType(type: CheckInType): CheckInPhase[] {
    if (type === 'midday') {
      return ['intro', 'reprioritize', 'capture', 'complete'];
    } else {
      return ['intro', 'capture', 'tomorrow', 'review', 'reprioritize', 'complete'];
    }
  }

  /**
   * Get script for a phase
   */
  private getPhaseScript(phase: CheckInPhase): string | null {
    if (!this.state.data) return null;

    switch (phase) {
      case 'reprioritize':
        return "What's the priority? Or say skip.";

      case 'capture':
        return "Anything to capture? Say done when finished.";

      case 'tomorrow':
        return this.buildTomorrowScript();

      case 'review':
        return this.buildReviewScript();

      case 'complete':
        return this.buildCompleteScript();

      default:
        return null;
    }
  }

  /**
   * Build tomorrow preview script using real tomorrow data
   */
  private buildTomorrowScript(): string {
    // Use real tomorrow data from evening check-in
    if (!this.state.tomorrow || this.state.tomorrow.tasks.length === 0) {
      return "Tomorrow's clear. No tasks scheduled. Anything to adjust?";
    }

    const tasks = this.state.tomorrow.tasks;
    const parts: string[] = [];

    // Task count and brief list (match EveningWrapFlow style)
    const titles = tasks.slice(0, 3).map(t => t.title).join(', ');
    parts.push(`Tomorrow you have ${tasks.length} task${tasks.length > 1 ? 's' : ''}: ${titles}.`);

    if (tasks.length > 3) {
      parts.push(`Plus ${tasks.length - 3} more.`);
    }

    // Check for high priority tasks
    const highPriority = tasks.filter(t => t.priority === 'High');
    if (highPriority.length > 0) {
      parts.push(`Note: ${highPriority[0].title} is high priority.`);
    }

    parts.push('Anything to adjust? Or say skip.');
    return parts.join(' ');
  }

  /**
   * Build review script (goals/projects due for review based on cadence)
   */
  private buildReviewScript(): string | null {
    if (!this.state.data || this.state.data.goals.active.length === 0) {
      return null; // Skip if no goals
    }

    const goals = this.state.data.goals.active.slice(0, 3);
    const goalNames = goals.map((g) => g.title).join(', ');

    return `Active goals: ${goalNames}. Any updates? Or say skip.`;
  }

  /**
   * Build completion script
   */
  private buildCompleteScript(): string {
    if (this.state.type === 'midday') {
      return "Great. Have a productive afternoon!";
    } else {
      if (this.state.capturedItems.length > 0) {
        return `Got it. I captured ${this.state.capturedItems.length} item${this.state.capturedItems.length > 1 ? 's' : ''}. Have a good evening!`;
      }
      return "All wrapped up. Have a good evening!";
    }
  }

  // ===========================================================================
  // Auto-Dismiss
  // ===========================================================================

  /**
   * Start auto-dismiss timer
   * Per CONTEXT.md: No response for 10 seconds -> auto-dismiss
   */
  private startAutoDismissTimer(): void {
    this.clearAutoDismissTimer();

    this.autoDismissTimer = setTimeout(() => {
      console.log('[CheckInManager] Auto-dismissing check-in (no response)');
      this.complete();
    }, this.config.autoDismissTimeout);
  }

  /**
   * Clear auto-dismiss timer
   */
  private clearAutoDismissTimer(): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
  }

  // ===========================================================================
  // Skip and Complete
  // ===========================================================================

  /**
   * Skip the current check-in entirely
   */
  async skip(): Promise<void> {
    if (!this.state.isActive) return;

    console.log('[CheckInManager] Skipping check-in');
    this.clearAutoDismissTimer();
    await this.speak("Okay, skipping check-in.");
    this.complete();
  }

  /**
   * Complete the check-in
   */
  private async complete(): Promise<void> {
    this.clearAutoDismissTimer();
    this.state.isActive = false;
    this.state.isWaitingForResponse = false;

    // Update store
    useJarvisStore.getState().setIsBriefingActive(false);
    useJarvisStore.getState().setCurrentBriefingSection(null);

    // Send captured items to Notion inbox
    if (this.state.capturedItems.length > 0) {
      console.log('[CheckInManager] Sending captured items to Notion:', this.state.capturedItems);

      // Create tasks in parallel for efficiency
      const createPromises = this.state.capturedItems.map(async (item) => {
        try {
          const result = await executeNotionTool('create_task', { title: item });
          console.log(`[CheckInManager] Created task: "${item}"`, result);
          return { success: true, item };
        } catch (error) {
          console.error(`[CheckInManager] Failed to create task: "${item}"`, error);
          return { success: false, item, error };
        }
      });

      // Wait for all creates (don't block on failures)
      const results = await Promise.allSettled(createPromises);
      const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length;
      console.log(`[CheckInManager] Created ${succeeded}/${this.state.capturedItems.length} tasks`);
    }

    // Call completion callback
    if (this.onComplete) {
      this.onComplete();
    }

    console.log('[CheckInManager] Check-in complete');
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  /**
   * Speak text via the voice pipeline
   */
  private async speak(text: string): Promise<void> {
    if (this.speakFn && this.config.speakPrompt) {
      console.log(`[CheckInManager] Speaking: ${text.substring(0, 50)}...`);
      await this.speakFn(text);
    }
  }

  /**
   * Check if check-in is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Check if waiting for response
   */
  isWaitingForResponse(): boolean {
    return this.state.isWaitingForResponse;
  }

  /**
   * Get current check-in type
   */
  getType(): CheckInType {
    return this.state.type;
  }

  /**
   * Get captured items
   */
  getCapturedItems(): string[] {
    return [...this.state.capturedItems];
  }

  /**
   * Cancel the check-in
   */
  cancel(): void {
    this.clearAutoDismissTimer();
    this.state.isActive = false;
    this.state.isWaitingForResponse = false;
    useJarvisStore.getState().setIsBriefingActive(false);
    useJarvisStore.getState().setCurrentBriefingSection(null);
    console.log('[CheckInManager] Check-in cancelled');
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: CheckInManager | null = null;

export function getCheckInManager(): CheckInManager {
  if (!instance) {
    instance = new CheckInManager();
  }
  return instance;
}

export function destroyCheckInManager(): void {
  if (instance) {
    instance.cancel();
    instance = null;
  }
}
