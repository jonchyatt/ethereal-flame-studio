/**
 * Tutorial Manager
 *
 * Handles tutorial state, progress tracking, and content delivery.
 * Integrates with memory system for persistent progress.
 */

import {
  TutorialProgress,
  TutorialState,
  TutorialModuleId,
  TutorialModule,
  TutorialSection,
  DEFAULT_TUTORIAL_PROGRESS,
  ExpertiseLevel
} from './types';
import {
  TUTORIAL_MODULES,
  TUTORIAL_SEQUENCE,
  findModuleByTrigger,
  getNextModule,
  hasCompletedPrerequisites
} from './modules';

/**
 * Storage key for tutorial progress (localStorage fallback)
 */
const STORAGE_KEY = 'jarvis_tutorial_progress';

/**
 * Tutorial Manager class
 */
export class TutorialManager {
  private state: TutorialState;

  constructor() {
    this.state = {
      isActive: false,
      currentSectionIndex: 0,
      hasCompletedOnboarding: false,
      progress: this.loadProgress()
    };

    // Check if user has completed onboarding
    this.state.hasCompletedOnboarding =
      this.state.progress.completedModules.includes('welcome');
  }

  /**
   * Load progress from storage
   */
  private loadProgress(): TutorialProgress {
    if (typeof window === 'undefined') {
      return DEFAULT_TUTORIAL_PROGRESS;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load tutorial progress:', e);
    }

    return { ...DEFAULT_TUTORIAL_PROGRESS };
  }

  /**
   * Save progress to storage
   */
  private saveProgress(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.progress));
    } catch (e) {
      console.warn('Failed to save tutorial progress:', e);
    }
  }

  /**
   * Check if user is new (hasn't completed welcome)
   */
  isNewUser(): boolean {
    return !this.state.hasCompletedOnboarding;
  }

  /**
   * Check if a tutorial session is currently active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get current progress
   */
  getProgress(): TutorialProgress {
    return this.state.progress;
  }

  /**
   * Start the tutorial from a specific module or the next in sequence
   */
  startTutorial(moduleId?: TutorialModuleId, forceRestart = false): {
    success: boolean;
    module?: TutorialModule;
    message?: string;
  } {
    // If module specified, try to start it
    if (moduleId) {
      const module = TUTORIAL_MODULES[moduleId];
      if (!module) {
        return { success: false, message: `Unknown tutorial module: ${moduleId}` };
      }

      // Check prerequisites unless forcing
      if (!forceRestart && !hasCompletedPrerequisites(moduleId, this.state.progress.completedModules)) {
        const prereqs = module.prerequisites.join(', ');
        return {
          success: false,
          message: `You need to complete these modules first: ${prereqs}`
        };
      }

      this.state.isActive = true;
      this.state.currentModule = moduleId;
      this.state.currentSectionIndex = 0;
      this.state.progress.currentModule = moduleId;
      this.state.progress.currentSection = 0;
      this.state.progress.lastInteraction = new Date().toISOString();
      this.saveProgress();

      return { success: true, module };
    }

    // Otherwise, start from next incomplete module
    const nextModule = getNextModule(this.state.progress.completedModules);
    if (!nextModule) {
      return { success: false, message: "You've completed all tutorial modules!" };
    }

    this.state.isActive = true;
    this.state.currentModule = nextModule.id;
    this.state.currentSectionIndex = 0;
    this.state.progress.currentModule = nextModule.id;
    this.state.progress.currentSection = 0;
    this.state.progress.lastInteraction = new Date().toISOString();
    this.saveProgress();

    return { success: true, module: nextModule };
  }

  /**
   * Find and start a module by topic keywords
   */
  teachTopic(topic: string): {
    success: boolean;
    module?: TutorialModule;
    message?: string;
  } {
    const module = findModuleByTrigger(topic);
    if (!module) {
      return {
        success: false,
        message: `I don't have a specific tutorial for "${topic}". Try asking about: navigation, life areas, goals, tasks, bills, habits, memory, or say "start tutorial" for the full walkthrough.`
      };
    }

    return this.startTutorial(module.id);
  }

  /**
   * Get the current module being delivered
   */
  getCurrentModule(): TutorialModule | undefined {
    if (!this.state.currentModule) return undefined;
    return TUTORIAL_MODULES[this.state.currentModule];
  }

  /**
   * Get the current section being delivered
   */
  getCurrentSection(): TutorialSection | undefined {
    const module = this.getCurrentModule();
    if (!module) return undefined;
    return module.content.sections[this.state.currentSectionIndex];
  }

  /**
   * Advance to the next section within the current module
   */
  nextSection(): {
    hasMore: boolean;
    section?: TutorialSection;
    isModuleComplete: boolean;
  } {
    const module = this.getCurrentModule();
    if (!module) {
      return { hasMore: false, isModuleComplete: true };
    }

    const nextIndex = this.state.currentSectionIndex + 1;
    if (nextIndex < module.content.sections.length) {
      this.state.currentSectionIndex = nextIndex;
      this.state.progress.currentSection = nextIndex;
      this.saveProgress();

      return {
        hasMore: true,
        section: module.content.sections[nextIndex],
        isModuleComplete: false
      };
    }

    // Module complete
    return { hasMore: false, isModuleComplete: true };
  }

  /**
   * Complete the current module
   */
  completeCurrentModule(): {
    nextModule?: TutorialModule;
    tutorialComplete: boolean;
  } {
    if (this.state.currentModule) {
      if (!this.state.progress.completedModules.includes(this.state.currentModule)) {
        this.state.progress.completedModules.push(this.state.currentModule);
      }

      // Update onboarding status
      if (this.state.currentModule === 'welcome') {
        this.state.hasCompletedOnboarding = true;
      }
    }

    this.state.isActive = false;
    this.state.currentModule = undefined;
    this.state.currentSectionIndex = 0;
    this.state.progress.currentModule = undefined;
    this.state.progress.currentSection = undefined;
    this.state.progress.lastInteraction = new Date().toISOString();
    this.saveProgress();

    const nextModule = getNextModule(this.state.progress.completedModules);
    return {
      nextModule,
      tutorialComplete: !nextModule
    };
  }

  /**
   * Skip the current module
   */
  skipCurrentModule(): void {
    this.completeCurrentModule();
  }

  /**
   * Set user's preference for on-demand help instead of guided tutorial
   */
  setPreferOnDemand(prefer: boolean): void {
    this.state.progress.preferOnDemand = prefer;
    this.saveProgress();
  }

  /**
   * Update user's expertise level
   */
  setExpertiseLevel(level: ExpertiseLevel): void {
    this.state.progress.expertiseLevel = level;
    this.saveProgress();
  }

  /**
   * Generate the full content for a module (for Claude to speak)
   */
  generateModuleContent(module: TutorialModule): string {
    const parts: string[] = [];

    // Intro
    parts.push(module.content.intro);

    // Sections
    for (const section of module.content.sections) {
      parts.push(`\n${section.content}`);
      if (section.examples && section.examples.length > 0) {
        parts.push(`\nExamples you can try:\n${section.examples.map(e => `- "${e}"`).join('\n')}`);
      }
    }

    // Exercise (if exists)
    if (module.content.exercise) {
      parts.push(`\n${module.content.exercise}`);
    }

    // Outro
    parts.push(`\n${module.content.outro}`);

    return parts.join('\n');
  }

  /**
   * Generate a shorter version for voice delivery
   */
  generateVoiceContent(module: TutorialModule): string {
    const parts: string[] = [];

    // Intro
    parts.push(module.content.intro);

    // Just section content, skip examples for brevity
    for (const section of module.content.sections) {
      parts.push(section.content);
    }

    // Overwhelm alert
    parts.push(`\nQuick reminder: ${module.content.overwhelmAlert}`);

    // Outro
    parts.push(module.content.outro);

    return parts.join('\n\n');
  }

  /**
   * Get quick reference card content
   */
  getQuickReference(): string {
    return `JARVIS QUICK START

ADD THINGS:
- "Add a task: [description]"
- "Create a project called [name]"
- "Add a bill: [name] [amount] due [date]"

COMPLETE THINGS:
- "Mark [task name] complete"
- "Mark [bill] as paid"
- "I did [habit] today"

CHECK THINGS:
- "What's on my plate today?"
- "Any bills due this week?"
- "What are my priorities?"

PLAN THINGS:
- "Help me plan my day"
- "What should I focus on?"
- "I'm overwhelmed, simplify for me"

REMEMBER THINGS:
- "Remember that [fact about me]"
- "What do you know about [topic]?"

TUTORIAL:
- "Start tutorial" - Begin guided onboarding
- "Teach me about [topic]" - Specific help
- "What can you do?" - Quick overview`;
  }

  /**
   * Check if user should be prompted about the tutorial
   */
  shouldPromptTutorial(): boolean {
    // Don't prompt if they've started or prefer on-demand
    if (this.state.progress.preferOnDemand) return false;
    if (this.state.hasCompletedOnboarding) return false;
    return true;
  }

  /**
   * Get tutorial context for system prompt
   */
  getTutorialContext(): string | undefined {
    if (!this.isNewUser() && !this.isActive()) {
      return undefined;
    }

    if (this.isNewUser()) {
      return `TUTORIAL AWARENESS:
This is a new user who hasn't completed onboarding.
- If they seem lost, offer: "Would you like me to walk you through how I work?"
- Keep initial responses simple and welcoming
- Avoid overwhelming with features`;
    }

    if (this.isActive() && this.state.currentModule) {
      const module = this.getCurrentModule();
      return `ACTIVE TUTORIAL:
Currently teaching module: ${module?.title}
Progress: ${this.state.currentSectionIndex + 1}/${module?.content.sections.length || 0} sections
- Stay focused on tutorial content
- Guide user through the material
- When they say "continue", deliver next section
- When they say "skip", mark module complete and offer next`;
    }

    return undefined;
  }
}

// Singleton instance
let tutorialManager: TutorialManager | null = null;

export function getTutorialManager(): TutorialManager {
  if (!tutorialManager) {
    tutorialManager = new TutorialManager();
  }
  return tutorialManager;
}
