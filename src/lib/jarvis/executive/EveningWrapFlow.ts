/**
 * EveningWrapFlow - State machine for evening wrap walkthrough
 *
 * Manages the comprehensive evening wrap flow:
 * 1. Present outline
 * 2. Day review (completed/incomplete tasks - factual, not scorecard)
 * 3. Task status updates
 * 4. New task capture
 * 5. Tomorrow preview
 * 6. Week summary
 * 7. Finance check
 * 8. Open-ended closing
 * 9. Complete
 *
 * Per CONTEXT.md:
 * - Factual outline, not scorecard or judgment
 * - Jarvis speaks up if something important seems neglected
 * - Open-ended closing: "Anything else on your mind?"
 * - Duration adapts based on content volume
 */

import type { EveningWrapData, EveningWrapSection, TaskSummary } from './types';
import { buildEveningWrapData } from './BriefingClient';
import { useJarvisStore } from '../stores/jarvisStore';

/**
 * State of the evening wrap flow
 */
interface EveningWrapFlowState {
  currentSection: EveningWrapSection;
  data: EveningWrapData | null;
  skippedSections: Set<EveningWrapSection>;
  isActive: boolean;
  isWaitingForResponse: boolean;
  capturedItems: string[]; // Items captured during newCaptures section
}

/**
 * Callbacks for EveningWrapFlow events
 */
export interface EveningWrapFlowCallbacks {
  onSpeakComplete?: () => void;
  onWrapComplete?: () => void;
  onSectionChange?: (section: EveningWrapSection) => void;
  onItemCaptured?: (item: string) => void;
}

/**
 * EveningWrapFlow class - manages the evening wrap walkthrough
 */
export class EveningWrapFlow {
  private state: EveningWrapFlowState;
  private speakFn: (text: string) => Promise<void>;
  private callbacks: EveningWrapFlowCallbacks;

  /**
   * Section order for walkthrough
   */
  private static readonly SECTION_ORDER: EveningWrapSection[] = [
    'outline',
    'dayReview',
    'taskUpdates',
    'newCaptures',
    'tomorrowPreview',
    'weekSummary',
    'financeCheck',
    'closing',
    'complete',
  ];

  constructor(
    speakFn: (text: string) => Promise<void>,
    callbacks: EveningWrapFlowCallbacks = {}
  ) {
    this.speakFn = speakFn;
    this.callbacks = callbacks;
    this.state = {
      currentSection: 'outline',
      data: null,
      skippedSections: new Set(),
      isActive: false,
      isWaitingForResponse: false,
      capturedItems: [],
    };
  }

  /**
   * Start the evening wrap flow
   */
  async start(): Promise<void> {
    console.log('[EveningWrapFlow] Starting evening wrap');
    this.state.isActive = true;
    this.state.capturedItems = [];

    // Update store state
    useJarvisStore.getState().setIsBriefingActive(true);
    useJarvisStore.getState().setCurrentBriefingSection('outline');

    try {
      // Fetch all evening wrap data
      this.state.data = await buildEveningWrapData();

      // Present outline
      const outline = this.buildOutlineScript();
      await this.speak(outline);
      this.state.isWaitingForResponse = true;
    } catch (error) {
      console.error('[EveningWrapFlow] Error starting evening wrap:', error);
      await this.speak("I'm having trouble loading your data. Let's try again later.");
      this.complete();
    }
  }

  /**
   * Advance to the next section
   */
  async advanceToNext(): Promise<void> {
    if (!this.state.isActive || !this.state.data) return;

    this.state.isWaitingForResponse = false;
    const currentIndex = EveningWrapFlow.SECTION_ORDER.indexOf(this.state.currentSection);

    // Find next non-skipped, non-empty section
    for (let i = currentIndex + 1; i < EveningWrapFlow.SECTION_ORDER.length; i++) {
      const section = EveningWrapFlow.SECTION_ORDER[i];

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

    console.log(`[EveningWrapFlow] Skipping section: ${this.state.currentSection}`);
    this.state.skippedSections.add(this.state.currentSection);

    await this.speak('Okay, skipping that.');
    await this.advanceToNext();
  }

  /**
   * Handle user response during evening wrap
   */
  async handleUserResponse(response: string): Promise<void> {
    if (!this.state.isActive) return;

    const lower = response.toLowerCase().trim();

    // Handle newCaptures section specially
    if (this.state.currentSection === 'newCaptures') {
      return this.handleCaptureResponse(response, lower);
    }

    // Handle taskUpdates section specially
    if (this.state.currentSection === 'taskUpdates') {
      return this.handleTaskUpdateResponse(response, lower);
    }

    // Skip commands
    if (
      lower.includes('skip') ||
      lower.includes('next') ||
      lower.includes('move on') ||
      lower === 'no' ||
      lower === 'done' ||
      lower.includes("that's all")
    ) {
      await this.advanceToNext();
      return;
    }

    // Continue/proceed commands
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

    // Stop wrap commands
    if (
      lower.includes('stop') ||
      lower.includes('cancel') ||
      lower.includes('end wrap') ||
      lower.includes("that's enough")
    ) {
      await this.speak('Okay, ending the wrap. Have a good evening!');
      this.complete();
      return;
    }

    // Default: treat as continue
    await this.advanceToNext();
  }

  /**
   * Handle responses during newCaptures section
   */
  private async handleCaptureResponse(response: string, lower: string): Promise<void> {
    // Done with captures
    if (
      lower === 'done' ||
      lower === 'no' ||
      lower === 'nothing' ||
      lower.includes("that's all") ||
      lower.includes('nothing else') ||
      lower.includes('skip')
    ) {
      if (this.state.capturedItems.length > 0) {
        await this.speak(`Got it, captured ${this.state.capturedItems.length} item${this.state.capturedItems.length > 1 ? 's' : ''}.`);
      }
      await this.advanceToNext();
      return;
    }

    // Capture the item
    this.state.capturedItems.push(response);
    this.callbacks.onItemCaptured?.(response);
    console.log(`[EveningWrapFlow] Captured item: ${response}`);

    await this.speak('Got it. Anything else?');
    this.state.isWaitingForResponse = true;
  }

  /**
   * Handle responses during taskUpdates section
   */
  private async handleTaskUpdateResponse(response: string, lower: string): Promise<void> {
    // Skip/done with updates
    if (
      lower === 'skip' ||
      lower === 'no' ||
      lower === 'done' ||
      lower.includes("that's all") ||
      lower.includes('nothing')
    ) {
      await this.advanceToNext();
      return;
    }

    // Acknowledge the update request (actual update would be handled by intent system)
    await this.speak('Noted. Any other updates?');
    this.state.isWaitingForResponse = true;
  }

  /**
   * Get current section
   */
  getCurrentSection(): EveningWrapSection {
    return this.state.currentSection;
  }

  /**
   * Check if wrap is active
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
   * Get captured items
   */
  getCapturedItems(): string[] {
    return [...this.state.capturedItems];
  }

  /**
   * Cancel the wrap
   */
  cancel(): void {
    console.log('[EveningWrapFlow] Wrap cancelled');
    this.complete();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Speak text and wait for completion
   */
  private async speak(text: string): Promise<void> {
    console.log(`[EveningWrapFlow] Speaking: ${text.substring(0, 50)}...`);
    await this.speakFn(text);
    this.callbacks.onSpeakComplete?.();
  }

  /**
   * Complete the wrap
   */
  private complete(): void {
    this.state.isActive = false;
    this.state.isWaitingForResponse = false;
    useJarvisStore.getState().setIsBriefingActive(false);
    useJarvisStore.getState().setCurrentBriefingSection(null);
    this.callbacks.onWrapComplete?.();
    console.log('[EveningWrapFlow] Wrap complete');
  }

  /**
   * Build the outline script
   */
  private buildOutlineScript(): string {
    const sections = this.getAvailableSections();

    if (sections.length === 0) {
      return "Let's wrap up the day. Not much to cover today. Anything on your mind?";
    }

    return "Let's wrap up the day. We'll cover what got done, tomorrow's tasks, and capture any loose ends. Ready to begin?";
  }

  /**
   * Get list of sections with data
   */
  private getAvailableSections(): string[] {
    if (!this.state.data) return [];

    const sections: string[] = [];

    // Day review - always include if there are any tasks
    if (
      this.state.data.dayReview.completedTasks.length > 0 ||
      this.state.data.dayReview.incompleteTasks.length > 0
    ) {
      sections.push('day review');
    }

    // Tomorrow preview
    if (this.state.data.tomorrow.tasks.length > 0) {
      sections.push('tomorrow preview');
    }

    // Week summary
    if (
      this.state.data.weekSummary.busyDays.length > 0 ||
      this.state.data.weekSummary.upcomingDeadlines.length > 0
    ) {
      sections.push('week summary');
    }

    // Finance check
    if (this.state.data.bills.thisWeek.length > 0) {
      sections.push('finances');
    }

    return sections;
  }

  /**
   * Check if section has data to present
   */
  private hasSectionData(section: EveningWrapSection): boolean {
    if (!this.state.data) return false;

    switch (section) {
      case 'outline':
        return true;
      case 'dayReview':
        return (
          this.state.data.dayReview.completedTasks.length > 0 ||
          this.state.data.dayReview.incompleteTasks.length > 0
        );
      case 'taskUpdates':
        // Only show if there are incomplete tasks
        return this.state.data.dayReview.incompleteTasks.length > 0;
      case 'newCaptures':
        // Always offer capture opportunity
        return true;
      case 'tomorrowPreview':
        return this.state.data.tomorrow.tasks.length > 0;
      case 'weekSummary':
        return (
          this.state.data.weekSummary.busyDays.length > 0 ||
          this.state.data.weekSummary.lightDays.length > 0 ||
          this.state.data.weekSummary.upcomingDeadlines.length > 0
        );
      case 'financeCheck':
        return this.state.data.bills.thisWeek.length > 0;
      case 'closing':
        return true; // Always include closing
      case 'complete':
        return true;
      default:
        return false;
    }
  }

  /**
   * Present a section
   */
  private async presentSection(section: EveningWrapSection): Promise<void> {
    if (!this.state.data) return;

    let script = '';

    switch (section) {
      case 'dayReview':
        script = this.buildDayReviewScript();
        break;
      case 'taskUpdates':
        script = this.buildTaskUpdatesScript();
        break;
      case 'newCaptures':
        script = this.buildNewCapturesScript();
        break;
      case 'tomorrowPreview':
        script = this.buildTomorrowPreviewScript();
        break;
      case 'weekSummary':
        script = this.buildWeekSummaryScript();
        break;
      case 'financeCheck':
        script = this.buildFinanceCheckScript();
        break;
      case 'closing':
        script = this.buildClosingScript();
        break;
      case 'complete':
        script = 'All wrapped up. Have a good evening.';
        break;
    }

    await this.speak(script);

    if (section !== 'complete') {
      this.state.isWaitingForResponse = true;
    } else {
      this.complete();
    }
  }

  /**
   * Build day review script
   * Per CONTEXT.md: factual outline, not a scorecard
   */
  private buildDayReviewScript(): string {
    const data = this.state.data!;
    const parts: string[] = [];

    const completed = data.dayReview.completedTasks;
    const incomplete = data.dayReview.incompleteTasks;

    // Completed tasks
    if (completed.length > 0) {
      const titles = completed.slice(0, 5).map((t) => t.title).join(', ');
      parts.push(`You completed ${completed.length} task${completed.length > 1 ? 's' : ''} today: ${titles}.`);
      if (completed.length > 5) {
        parts.push(`Plus ${completed.length - 5} more.`);
      }
    }

    // Incomplete tasks
    if (incomplete.length > 0) {
      const titles = incomplete.slice(0, 3).map((t) => t.title).join(', ');
      parts.push(`${incomplete.length} task${incomplete.length > 1 ? 's' : ''} still pending: ${titles}.`);
    }

    // Nothing done case
    if (completed.length === 0 && incomplete.length === 0) {
      parts.push('No tasks were scheduled for today.');
    }

    parts.push('Shall we continue?');
    return parts.join(' ');
  }

  /**
   * Build task updates script
   */
  private buildTaskUpdatesScript(): string {
    const incomplete = this.state.data!.dayReview.incompleteTasks.length;
    return `You have ${incomplete} pending task${incomplete > 1 ? 's' : ''}. Want to update any task statuses? Or say skip.`;
  }

  /**
   * Build new captures script
   */
  private buildNewCapturesScript(): string {
    return "Anything floating in your head to capture? Say done when finished.";
  }

  /**
   * Build tomorrow preview script
   * Per CONTEXT.md: Jarvis speaks up if something important seems neglected
   */
  private buildTomorrowPreviewScript(): string {
    const data = this.state.data!;
    const tasks = data.tomorrow.tasks;
    const parts: string[] = [];

    if (tasks.length === 0) {
      return "Tomorrow's clear. No tasks scheduled. Anything to adjust?";
    }

    // Task count and brief list
    const titles = tasks.slice(0, 3).map((t) => t.title).join(', ');
    parts.push(`Tomorrow you have ${tasks.length} task${tasks.length > 1 ? 's' : ''}: ${titles}.`);

    if (tasks.length > 3) {
      parts.push(`Plus ${tasks.length - 3} more.`);
    }

    // Check for high priority tasks that might be at risk
    const highPriority = tasks.filter((t) => t.priority === 'High');
    if (highPriority.length > 0) {
      parts.push(`Note: ${highPriority[0].title} is high priority.`);
    }

    parts.push('Anything to adjust?');
    return parts.join(' ');
  }

  /**
   * Build week summary script
   */
  private buildWeekSummaryScript(): string {
    const data = this.state.data!;
    const parts: string[] = [];

    parts.push('Looking at the week:');

    // Busy days
    if (data.weekSummary.busyDays.length > 0) {
      parts.push(`${data.weekSummary.busyDays.join(' and ')} ${data.weekSummary.busyDays.length > 1 ? 'are' : 'is'} packed.`);
    }

    // Light days
    if (data.weekSummary.lightDays.length > 0) {
      parts.push(`${data.weekSummary.lightDays.join(' and ')} ${data.weekSummary.lightDays.length > 1 ? 'are' : 'is'} light.`);
    }

    // Deadlines
    if (data.weekSummary.upcomingDeadlines.length > 0) {
      const deadline = data.weekSummary.upcomingDeadlines[0];
      parts.push(`Deadline coming up: ${deadline.title}.`);
    }

    // If nothing notable
    if (
      data.weekSummary.busyDays.length === 0 &&
      data.weekSummary.lightDays.length === 0 &&
      data.weekSummary.upcomingDeadlines.length === 0
    ) {
      parts.push('Week looks balanced.');
    }

    parts.push('Shall we continue?');
    return parts.join(' ');
  }

  /**
   * Build finance check script
   * Reuses BriefingFlow pattern
   */
  private buildFinanceCheckScript(): string {
    const data = this.state.data!;

    if (data.bills.thisWeek.length === 0) {
      return 'No bills due soon. Moving on.';
    }

    const billCount = data.bills.thisWeek.length;
    const total = data.bills.total;

    return `${billCount} bill${billCount > 1 ? 's' : ''} due soon, $${total.toFixed(0)} total. Shall we continue?`;
  }

  /**
   * Build closing script
   * Per CONTEXT.md: open-ended to invite more conversation
   */
  private buildClosingScript(): string {
    return "Anything else on your mind?";
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an EveningWrapFlow with a speak function
 */
export function createEveningWrapFlow(
  speakFn: (text: string) => Promise<void>,
  callbacks?: EveningWrapFlowCallbacks
): EveningWrapFlow {
  return new EveningWrapFlow(speakFn, callbacks);
}
