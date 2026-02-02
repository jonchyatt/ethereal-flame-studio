/**
 * WeeklyReviewFlow - State machine for weekly review walkthrough
 *
 * Manages the voice-guided weekly review flow:
 * 1. Intro
 * 2. Retrospective (brief, factual - per CONTEXT.md)
 * 3. Checkpoint: "Anything to add about this week?"
 * 4. Upcoming week preview
 * 5. Checkpoint: "Anything to adjust?"
 * 6. Horizon scan (2-4 weeks out)
 * 7. Checkpoint: "Anything to add?"
 * 8. Life area balance
 * 9. Closing
 * 10. Complete
 *
 * Per CONTEXT.md:
 * - Retrospective is factual only (no scorecard, no judgment, no emotional prompts)
 * - Forward planning is the primary focus
 * - Checkpoints pause for user input with 15s auto-advance timeout
 */

import type { WeeklyReviewData, WeeklyReviewSection } from './types';
import { buildWeeklyReviewData } from './BriefingClient';
import { useJarvisStore } from '../stores/jarvisStore';

/**
 * State of the weekly review flow
 */
interface WeeklyReviewFlowState {
  currentSection: WeeklyReviewSection;
  data: WeeklyReviewData | null;
  skippedSections: Set<WeeklyReviewSection>;
  isActive: boolean;
  isWaitingForResponse: boolean;
}

/**
 * Callbacks for WeeklyReviewFlow events
 */
export interface WeeklyReviewFlowCallbacks {
  onSpeakComplete?: () => void;
  onReviewComplete?: () => void;
  onSectionChange?: (section: WeeklyReviewSection) => void;
}

/**
 * Checkpoint auto-advance timeout (15 seconds)
 */
const CHECKPOINT_TIMEOUT = 15000;

/**
 * WeeklyReviewFlow class - manages the weekly review walkthrough
 */
export class WeeklyReviewFlow {
  private state: WeeklyReviewFlowState;
  private speakFn: (text: string) => Promise<void>;
  private callbacks: WeeklyReviewFlowCallbacks;
  private checkpointTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Section order for walkthrough
   * Per CONTEXT.md: brief retrospective, then mostly forward planning
   */
  private static readonly SECTION_ORDER: WeeklyReviewSection[] = [
    'intro',
    'retrospective',
    'checkpoint1',
    'upcomingWeek',
    'checkpoint2',
    'horizonScan',
    'checkpoint3',
    'lifeAreas',
    'closing',
    'complete',
  ];

  constructor(
    speakFn: (text: string) => Promise<void>,
    callbacks: WeeklyReviewFlowCallbacks = {}
  ) {
    this.speakFn = speakFn;
    this.callbacks = callbacks;
    this.state = {
      currentSection: 'intro',
      data: null,
      skippedSections: new Set(),
      isActive: false,
      isWaitingForResponse: false,
    };
  }

  /**
   * Start the weekly review flow
   */
  async start(): Promise<void> {
    console.log('[WeeklyReviewFlow] Starting weekly review');
    this.state.isActive = true;

    // Update store state
    useJarvisStore.getState().setIsBriefingActive(true);
    useJarvisStore.getState().setCurrentBriefingSection('outline');

    try {
      // Fetch all weekly review data
      this.state.data = await buildWeeklyReviewData();

      // Present intro
      await this.speak("Let's do our weekly review. We'll look at what happened this week, then plan ahead. Ready?");
      this.state.isWaitingForResponse = true;
    } catch (error) {
      console.error('[WeeklyReviewFlow] Error starting review:', error);
      await this.speak("I'm having trouble loading your data. Let's try again later.");
      this.complete();
    }
  }

  /**
   * Advance to the next section
   */
  async advanceToNext(): Promise<void> {
    if (!this.state.isActive || !this.state.data) return;

    // Clear any pending checkpoint timer
    this.clearCheckpointTimer();
    this.state.isWaitingForResponse = false;

    const currentIndex = WeeklyReviewFlow.SECTION_ORDER.indexOf(this.state.currentSection);

    // Find next non-skipped, non-empty section
    for (let i = currentIndex + 1; i < WeeklyReviewFlow.SECTION_ORDER.length; i++) {
      const section = WeeklyReviewFlow.SECTION_ORDER[i];

      if (!this.state.skippedSections.has(section) && this.hasSectionData(section)) {
        this.state.currentSection = section;
        useJarvisStore.getState().setCurrentBriefingSection(section as any);
        this.callbacks.onSectionChange?.(section);

        await this.presentSection(section);
        return;
      }
    }

    // All done
    this.complete();
  }

  /**
   * Skip the current section
   */
  async skipCurrentSection(): Promise<void> {
    if (!this.state.isActive) return;

    console.log(`[WeeklyReviewFlow] Skipping section: ${this.state.currentSection}`);
    this.state.skippedSections.add(this.state.currentSection);

    await this.speak('Okay, skipping that.');
    await this.advanceToNext();
  }

  /**
   * Handle user response during review
   */
  async handleUserResponse(response: string): Promise<void> {
    if (!this.state.isActive) return;

    const lower = response.toLowerCase().trim();

    // Clear checkpoint timer on any response
    this.clearCheckpointTimer();

    // Skip/advance commands
    if (
      lower === 'skip' ||
      lower === 'next' ||
      lower === 'no' ||
      lower === 'nothing' ||
      lower.includes('move on')
    ) {
      await this.advanceToNext();
      return;
    }

    // Done with section commands
    if (
      lower === 'done' ||
      lower.includes("that's all") ||
      lower.includes("that's it")
    ) {
      await this.advanceToNext();
      return;
    }

    // Stop review commands
    if (
      lower.includes('stop') ||
      lower.includes('cancel') ||
      lower.includes('end review')
    ) {
      await this.speak('Okay, ending the review. Have a good week!');
      this.complete();
      return;
    }

    // Continue/proceed commands (from intro)
    if (
      lower.includes('continue') ||
      lower.includes('proceed') ||
      lower.includes('go ahead') ||
      lower.includes("let's go") ||
      lower.includes('ready') ||
      lower === 'yes' ||
      lower === 'okay' ||
      lower === 'ok'
    ) {
      await this.advanceToNext();
      return;
    }

    // Substantive response at checkpoint - acknowledge and stay for more
    if (this.isCheckpointSection(this.state.currentSection)) {
      await this.speak('Got it. Anything else?');
      this.state.isWaitingForResponse = true;
      this.startCheckpointTimer();
      return;
    }

    // Default: treat as continue
    await this.advanceToNext();
  }

  /**
   * Get current section
   */
  getCurrentSection(): WeeklyReviewSection {
    return this.state.currentSection;
  }

  /**
   * Check if review is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Check if waiting for user response
   */
  isWaitingForResponse(): boolean {
    return this.state.isWaitingForResponse;
  }

  /**
   * Cancel the review
   */
  cancel(): void {
    console.log('[WeeklyReviewFlow] Review cancelled');
    this.clearCheckpointTimer();
    this.complete();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Speak text and wait for completion
   */
  private async speak(text: string): Promise<void> {
    console.log(`[WeeklyReviewFlow] Speaking: ${text.substring(0, 50)}...`);
    await this.speakFn(text);
    this.callbacks.onSpeakComplete?.();
  }

  /**
   * Complete the review
   */
  private complete(): void {
    this.clearCheckpointTimer();
    this.state.isActive = false;
    this.state.isWaitingForResponse = false;
    useJarvisStore.getState().setIsBriefingActive(false);
    useJarvisStore.getState().setCurrentBriefingSection(null);
    this.callbacks.onReviewComplete?.();
    console.log('[WeeklyReviewFlow] Review complete');
  }

  /**
   * Check if a section is a checkpoint
   */
  private isCheckpointSection(section: WeeklyReviewSection): boolean {
    return section === 'checkpoint1' || section === 'checkpoint2' || section === 'checkpoint3';
  }

  /**
   * Start checkpoint timer for auto-advance
   */
  private startCheckpointTimer(): void {
    this.clearCheckpointTimer();
    this.checkpointTimer = setTimeout(async () => {
      console.log('[WeeklyReviewFlow] Checkpoint timeout, auto-advancing');
      await this.advanceToNext();
    }, CHECKPOINT_TIMEOUT);
  }

  /**
   * Clear checkpoint timer
   */
  private clearCheckpointTimer(): void {
    if (this.checkpointTimer) {
      clearTimeout(this.checkpointTimer);
      this.checkpointTimer = null;
    }
  }

  /**
   * Check if section has data to present
   */
  private hasSectionData(section: WeeklyReviewSection): boolean {
    if (!this.state.data) return false;

    switch (section) {
      case 'intro':
        return true;
      case 'retrospective':
        // Always show retrospective (even if empty, we say "quiet week")
        return true;
      case 'checkpoint1':
      case 'checkpoint2':
      case 'checkpoint3':
        // Always show checkpoints (they're for user input)
        return true;
      case 'upcomingWeek':
        // Always show upcoming week
        return true;
      case 'horizonScan':
        // Skip if horizon is empty
        return (
          this.state.data.horizon.deadlines.length > 0 ||
          this.state.data.horizon.upcomingBills.length > 0 ||
          this.state.data.horizon.projectMilestones.length > 0
        );
      case 'lifeAreas':
        // Skip if no neglected areas
        return this.state.data.lifeAreas.neglectedAreas.length > 0;
      case 'closing':
        return true;
      case 'complete':
        return true;
      default:
        return false;
    }
  }

  /**
   * Present a section
   */
  private async presentSection(section: WeeklyReviewSection): Promise<void> {
    if (!this.state.data) return;

    let script = '';

    switch (section) {
      case 'retrospective':
        script = this.buildRetrospectiveScript();
        break;
      case 'checkpoint1':
        script = 'Anything to add about this week?';
        break;
      case 'upcomingWeek':
        script = this.buildUpcomingWeekScript();
        break;
      case 'checkpoint2':
        script = 'Anything to adjust?';
        break;
      case 'horizonScan':
        script = this.buildHorizonScanScript();
        break;
      case 'checkpoint3':
        script = 'Anything to add?';
        break;
      case 'lifeAreas':
        script = this.buildLifeAreasScript();
        break;
      case 'closing':
        script = 'Weekly review complete. Anything else?';
        break;
      case 'complete':
        script = 'All set. Have a good week.';
        break;
    }

    await this.speak(script);

    // Handle checkpoint sections
    if (this.isCheckpointSection(section)) {
      this.state.isWaitingForResponse = true;
      this.startCheckpointTimer();
    } else if (section !== 'complete') {
      this.state.isWaitingForResponse = true;
    } else {
      this.complete();
    }
  }

  /**
   * Build retrospective section script
   * Per CONTEXT.md: factual only - no scorecard, no judgment, no emotional prompts
   */
  private buildRetrospectiveScript(): string {
    const data = this.state.data!;
    const parts: string[] = [];

    // Tasks completed
    parts.push(`This week: ${data.retrospective.tasksCompleted} task${data.retrospective.tasksCompleted !== 1 ? 's' : ''} completed`);

    // Bills paid
    if (data.retrospective.billsPaid > 0) {
      parts.push(`${data.retrospective.billsPaid} bill${data.retrospective.billsPaid !== 1 ? 's' : ''} paid`);
    }

    // Projects progressed
    if (data.retrospective.projectsProgressed.length > 0) {
      const projectList = data.retrospective.projectsProgressed.slice(0, 3).join(', ');
      parts.push(`You made progress on ${projectList}`);
    }

    // Empty week case
    if (data.retrospective.tasksCompleted === 0 && data.retrospective.billsPaid === 0 && data.retrospective.projectsProgressed.length === 0) {
      return 'This week was quiet. No recorded task completions.';
    }

    return parts.join('. ') + '.';
  }

  /**
   * Build upcoming week section script
   */
  private buildUpcomingWeekScript(): string {
    const data = this.state.data!;
    const parts: string[] = [];

    // Task count
    parts.push(`Next week: ${data.upcomingWeek.taskCount} task${data.upcomingWeek.taskCount !== 1 ? 's' : ''}`);

    // Busy/light days
    if (data.upcomingWeek.busyDays.length > 0) {
      parts.push(`${data.upcomingWeek.busyDays.join(' and ')} ${data.upcomingWeek.busyDays.length > 1 ? 'look' : 'looks'} busy`);
    }

    if (data.upcomingWeek.lightDays.length > 0 && data.upcomingWeek.lightDays.length <= 3) {
      parts.push(`${data.upcomingWeek.lightDays.join(' and ')} ${data.upcomingWeek.lightDays.length > 1 ? 'are' : 'is'} lighter`);
    }

    // Notable tasks (top 3)
    if (data.upcomingWeek.tasks.length > 0) {
      const topTasks = data.upcomingWeek.tasks.slice(0, 3).map((t) => t.title);
      parts.push(`Notable: ${topTasks.join(', ')}`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Build horizon scan section script
   */
  private buildHorizonScanScript(): string {
    const data = this.state.data!;
    const parts: string[] = [];

    parts.push('Looking 2 to 4 weeks out:');

    // Deadlines
    if (data.horizon.deadlines.length > 0) {
      const deadlineList = data.horizon.deadlines.slice(0, 3).map((t) => t.title);
      parts.push(`Deadlines: ${deadlineList.join(', ')}`);
    }

    // Bills
    if (data.horizon.upcomingBills.length > 0) {
      const billTotal = data.horizon.upcomingBills.reduce((sum, b) => sum + b.amount, 0);
      parts.push(`${data.horizon.upcomingBills.length} bill${data.horizon.upcomingBills.length !== 1 ? 's' : ''} coming up, $${billTotal.toFixed(0)} total`);
    }

    // Milestones
    if (data.horizon.projectMilestones.length > 0) {
      parts.push(`Milestones: ${data.horizon.projectMilestones.slice(0, 3).join(', ')}`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Build life areas section script
   * Per CONTEXT.md: gentle nudge only - awareness, not aggressive prioritization
   */
  private buildLifeAreasScript(): string {
    const data = this.state.data!;
    const parts: string[] = [];

    parts.push('Life area balance:');

    // Top neglected areas (max 2 to keep it brief)
    const neglected = data.lifeAreas.neglectedAreas.slice(0, 2);
    for (const area of neglected) {
      parts.push(area.suggestedMessage);
    }

    return parts.join(' ');
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a WeeklyReviewFlow with a speak function
 */
export function createWeeklyReviewFlow(
  speakFn: (text: string) => Promise<void>,
  callbacks?: WeeklyReviewFlowCallbacks
): WeeklyReviewFlow {
  return new WeeklyReviewFlow(speakFn, callbacks);
}
