/**
 * BriefingFlow - State machine for briefing walkthrough
 *
 * Manages the flow of a morning briefing:
 * 1. Present outline
 * 2. Walk through each section
 * 3. Allow skipping and questions
 * 4. Complete with "ready to start the day"
 *
 * Per CONTEXT.md:
 * - Outline-first structure
 * - Task detail level: just the title
 * - Empty sections mentioned briefly and skipped
 */

import type { BriefingData, BriefingSection, TaskSummary } from './types';
import { buildMorningBriefing } from './BriefingClient';
import type { VoicePipeline } from '../voice/VoicePipeline';
import { useJarvisStore } from '../stores/jarvisStore';

/**
 * State of the briefing flow
 */
interface BriefingFlowState {
  currentSection: BriefingSection;
  data: BriefingData | null;
  skippedSections: Set<BriefingSection>;
  isActive: boolean;
  isWaitingForResponse: boolean;
}

/**
 * Callbacks for BriefingFlow events
 */
export interface BriefingFlowCallbacks {
  onSpeakComplete?: () => void;
  onBriefingComplete?: () => void;
  onSectionChange?: (section: BriefingSection) => void;
}

/**
 * BriefingFlow class - manages the briefing walkthrough
 */
export class BriefingFlow {
  private state: BriefingFlowState;
  private speakFn: (text: string) => Promise<void>;
  private callbacks: BriefingFlowCallbacks;

  /**
   * Section order for walkthrough
   */
  private static readonly SECTION_ORDER: BriefingSection[] = [
    'outline',
    'tasks',
    'calendar',
    'bills',
    'habits',
    'complete',
  ];

  constructor(
    speakFn: (text: string) => Promise<void>,
    callbacks: BriefingFlowCallbacks = {}
  ) {
    this.speakFn = speakFn;
    this.callbacks = callbacks;
    this.state = {
      currentSection: 'outline',
      data: null,
      skippedSections: new Set(),
      isActive: false,
      isWaitingForResponse: false,
    };
  }

  /**
   * Start the briefing flow
   */
  async start(): Promise<void> {
    console.log('[BriefingFlow] Starting morning briefing');
    this.state.isActive = true;

    // Update store state
    useJarvisStore.getState().setIsBriefingActive(true);
    useJarvisStore.getState().setCurrentBriefingSection('outline');

    try {
      // Fetch all data
      this.state.data = await buildMorningBriefing();
      useJarvisStore.getState().setBriefingData(this.state.data);

      // Present outline
      const sections = this.getAvailableSections();
      const outline = this.buildOutlineScript(sections);

      await this.speak(outline);
      this.state.isWaitingForResponse = true;
    } catch (error) {
      console.error('[BriefingFlow] Error starting briefing:', error);
      await this.speak("I'm having trouble loading your briefing data. Let's try again later.");
      this.complete();
    }
  }

  /**
   * Advance to the next section
   */
  async advanceToNext(): Promise<void> {
    if (!this.state.isActive || !this.state.data) return;

    this.state.isWaitingForResponse = false;
    const currentIndex = BriefingFlow.SECTION_ORDER.indexOf(this.state.currentSection);

    // Find next non-skipped, non-empty section
    for (let i = currentIndex + 1; i < BriefingFlow.SECTION_ORDER.length; i++) {
      const section = BriefingFlow.SECTION_ORDER[i];

      if (!this.state.skippedSections.has(section) && this.hasSectionData(section)) {
        this.state.currentSection = section;
        useJarvisStore.getState().setCurrentBriefingSection(section);
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

    console.log(`[BriefingFlow] Skipping section: ${this.state.currentSection}`);
    this.state.skippedSections.add(this.state.currentSection);

    await this.speak('Okay, skipping that.');
    await this.advanceToNext();
  }

  /**
   * Handle user response during briefing
   */
  async handleUserResponse(response: string): Promise<void> {
    if (!this.state.isActive) return;

    const lower = response.toLowerCase().trim();

    // Skip commands
    if (
      lower.includes('skip') ||
      lower.includes('next') ||
      lower.includes('move on') ||
      lower === 'no'
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

    // Stop briefing
    if (
      lower.includes('stop') ||
      lower.includes('cancel') ||
      lower.includes('end briefing') ||
      lower.includes('that\'s enough')
    ) {
      await this.speak('Okay, ending the briefing. Have a great day!');
      this.complete();
      return;
    }

    // Questions - for now, advance but could be extended
    if (lower.includes('question') || lower.startsWith('what') || lower.startsWith('how')) {
      // Future: Route to Claude for questions about current section
      await this.speak("I'll note that question. Let's continue for now.");
      await this.advanceToNext();
      return;
    }

    // Default: treat as continue
    await this.advanceToNext();
  }

  /**
   * Get current section
   */
  getCurrentSection(): BriefingSection {
    return this.state.currentSection;
  }

  /**
   * Check if briefing is active
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
   * Cancel the briefing
   */
  cancel(): void {
    console.log('[BriefingFlow] Briefing cancelled');
    this.complete();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Speak text and wait for completion
   */
  private async speak(text: string): Promise<void> {
    console.log(`[BriefingFlow] Speaking: ${text.substring(0, 50)}...`);
    await this.speakFn(text);
    this.callbacks.onSpeakComplete?.();
  }

  /**
   * Complete the briefing
   */
  private complete(): void {
    this.state.isActive = false;
    this.state.isWaitingForResponse = false;
    useJarvisStore.getState().setIsBriefingActive(false);
    useJarvisStore.getState().setCurrentBriefingSection(null);
    this.callbacks.onBriefingComplete?.();
    console.log('[BriefingFlow] Briefing complete');
  }

  /**
   * Build the outline script
   */
  private buildOutlineScript(sections: string[]): string {
    const greeting = this.getTimeBasedGreeting();
    const sectionsList = sections.join(', ');

    return `${greeting}. Today we'll cover ${sectionsList}. Ready to begin?`;
  }

  /**
   * Get time-appropriate greeting
   */
  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Get list of sections with data
   */
  private getAvailableSections(): string[] {
    if (!this.state.data) return [];

    const sections: string[] = [];

    if (this.state.data.tasks.today.length > 0 || this.state.data.tasks.overdue.length > 0) {
      sections.push('tasks');
    }

    if (this.state.data.calendar.today.length > 0) {
      sections.push('calendar');
    }

    // Always include bills (mention even if empty)
    sections.push('bills');

    if (this.state.data.habits.active.length > 0) {
      sections.push('habits');
    }

    return sections;
  }

  /**
   * Check if section has data to present
   */
  private hasSectionData(section: BriefingSection): boolean {
    if (!this.state.data) return false;

    switch (section) {
      case 'outline':
        return true;
      case 'tasks':
        return (
          this.state.data.tasks.today.length > 0 ||
          this.state.data.tasks.overdue.length > 0
        );
      case 'calendar':
        return this.state.data.calendar.today.length > 0;
      case 'bills':
        return true; // Always mention, even if empty
      case 'habits':
        return this.state.data.habits.active.length > 0;
      case 'complete':
        return true;
      default:
        return false;
    }
  }

  /**
   * Present a section
   */
  private async presentSection(section: BriefingSection): Promise<void> {
    if (!this.state.data) return;

    let script = '';

    switch (section) {
      case 'tasks':
        script = this.buildTasksScript();
        break;
      case 'calendar':
        script = this.buildCalendarScript();
        break;
      case 'bills':
        script = this.buildBillsScript();
        break;
      case 'habits':
        script = this.buildHabitsScript();
        break;
      case 'complete':
        script = "That's everything. Ready to start the day?";
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
   * Build tasks section script
   * Per CONTEXT.md: just the title, no context or goal links
   */
  private buildTasksScript(): string {
    const data = this.state.data!;
    const parts: string[] = [];

    // Overdue tasks first
    if (data.tasks.overdue.length > 0) {
      parts.push(`You have ${data.tasks.overdue.length} overdue task${data.tasks.overdue.length > 1 ? 's' : ''}.`);
    }

    // Today's tasks
    if (data.tasks.today.length > 0) {
      const titles = data.tasks.today.slice(0, 5).map((t) => t.title);
      parts.push(`Today: ${titles.join(', ')}.`);

      if (data.tasks.today.length > 5) {
        parts.push(`Plus ${data.tasks.today.length - 5} more.`);
      }
    } else if (data.tasks.overdue.length === 0) {
      parts.push('No tasks scheduled for today.');
    }

    parts.push('Any questions, or shall we continue?');

    return parts.join(' ');
  }

  /**
   * Build calendar section script
   */
  private buildCalendarScript(): string {
    const data = this.state.data!;

    if (data.calendar.today.length === 0) {
      return 'Your calendar is clear today. Shall we continue?';
    }

    const events = data.calendar.today.slice(0, 5);
    const eventList = events.map((e) => `${e.title} at ${e.time}`).join(', ');

    let script = `You have ${data.calendar.today.length} event${data.calendar.today.length > 1 ? 's' : ''} today. ${eventList}.`;

    if (data.calendar.today.length > 5) {
      script += ` Plus ${data.calendar.today.length - 5} more.`;
    }

    script += ' Shall we continue?';

    return script;
  }

  /**
   * Build bills section script
   */
  private buildBillsScript(): string {
    const data = this.state.data!;

    if (data.bills.thisWeek.length === 0) {
      return 'No bills due this week. Moving to habits.';
    }

    const billCount = data.bills.thisWeek.length;
    const total = data.bills.total;

    return `${billCount} bill${billCount > 1 ? 's' : ''} due this week, $${total.toFixed(0)} total. Shall we continue?`;
  }

  /**
   * Build habits section script
   */
  private buildHabitsScript(): string {
    const data = this.state.data!;

    if (data.habits.active.length === 0) {
      return 'No active habits to review. Moving on.';
    }

    return `${data.habits.streakSummary} Anything else before we wrap up?`;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a BriefingFlow with a VoicePipeline
 */
export function createBriefingFlow(
  speakFn: (text: string) => Promise<void>,
  callbacks?: BriefingFlowCallbacks
): BriefingFlow {
  return new BriefingFlow(speakFn, callbacks);
}
