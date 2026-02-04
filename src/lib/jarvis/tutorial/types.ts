/**
 * Tutorial System Types
 *
 * Defines types for Jarvis's voice-guided onboarding system.
 * Based on Simon's Notion Life OS pedagogical framework.
 */

/**
 * Tutorial module identifier
 */
export type TutorialModuleId =
  | 'welcome'
  | 'navigation'
  | 'life-areas'
  | 'goals'
  | 'brain-dump'
  | 'processing'
  | 'daily-rhythm'
  | 'voice-commands'
  | 'bills'
  | 'habits'
  | 'memory'
  | 'overwhelm'
  | 'advanced';

/**
 * User's expertise level (affects tutorial delivery)
 */
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * A single tutorial module definition
 */
export interface TutorialModule {
  id: TutorialModuleId;
  title: string;
  description: string;
  /** Estimated duration in minutes */
  duration: number;
  /** Prerequisites (module IDs that must be completed first) */
  prerequisites: TutorialModuleId[];
  /** The actual tutorial content - Jarvis speaks this */
  content: TutorialContent;
  /** Keywords that trigger this module when user asks for help */
  triggers: string[];
}

/**
 * Content structure for a tutorial module
 */
export interface TutorialContent {
  /** Opening message - sets the context */
  intro: string;
  /** Main content sections */
  sections: TutorialSection[];
  /** Brief reminder when user might be overwhelmed */
  overwhelmAlert: string;
  /** Exercise or call to action */
  exercise?: string;
  /** Summary/wrap-up */
  outro: string;
}

/**
 * A section within a tutorial module
 */
export interface TutorialSection {
  title: string;
  /** What Jarvis says */
  content: string;
  /** Example voice commands to demonstrate */
  examples?: string[];
  /** Whether this is the "simple" or "advanced" version */
  method?: 'simple' | 'advanced';
}

/**
 * User's tutorial progress (stored in memory)
 */
export interface TutorialProgress {
  /** When user started the tutorial */
  startedAt: string;
  /** Modules completed */
  completedModules: TutorialModuleId[];
  /** Current module in progress */
  currentModule?: TutorialModuleId;
  /** Current section within module (0-indexed) */
  currentSection?: number;
  /** User's assessed expertise level */
  expertiseLevel: ExpertiseLevel;
  /** User skipped full tutorial, prefers on-demand help */
  preferOnDemand: boolean;
  /** Last tutorial interaction */
  lastInteraction?: string;
}

/**
 * Tutorial state for the current session
 */
export interface TutorialState {
  /** Is a tutorial session active? */
  isActive: boolean;
  /** Current module being delivered */
  currentModule?: TutorialModuleId;
  /** Current section index */
  currentSectionIndex: number;
  /** Has user seen the welcome module? */
  hasCompletedOnboarding: boolean;
  /** User's progress */
  progress: TutorialProgress;
}

/**
 * Tutorial tool parameters
 */
export interface StartTutorialParams {
  /** Specific module to start (optional - defaults to next in sequence) */
  moduleId?: TutorialModuleId;
  /** Force restart even if already completed */
  forceRestart?: boolean;
}

export interface TeachTopicParams {
  /** Topic keywords to find relevant module */
  topic: string;
}

export interface SkipModuleParams {
  /** Module to skip */
  moduleId?: TutorialModuleId;
}

/**
 * Default tutorial progress for new users
 */
export const DEFAULT_TUTORIAL_PROGRESS: TutorialProgress = {
  startedAt: new Date().toISOString(),
  completedModules: [],
  expertiseLevel: 'beginner',
  preferOnDemand: false
};
