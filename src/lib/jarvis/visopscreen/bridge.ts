/**
 * Visopscreen Bridge — Typed message protocol for Jarvis ↔ Visopscreen communication.
 *
 * This module is a pure type/constant library. It does NOT send postMessages directly
 * (that's a browser-side concern handled by the Jarvis UI component).
 * It defines:
 *   - All message types Jarvis can send to Visopscreen
 *   - All response types Visopscreen sends back
 *   - Known spotlight target IDs (data-tutorial-id attributes in spread-analyzer.html)
 *   - Known lesson IDs (window.TUTORIAL_LESSONS keys)
 *   - buildMessage() helper to construct correctly-typed message payloads
 *
 * Usage in a Jarvis client component:
 *   import { buildMessage, LESSON_IDS, SPOTLIGHT_TARGETS } from '@/lib/jarvis/visopscreen';
 *   visopscreenIframeRef.contentWindow?.postMessage(
 *     buildMessage({ type: 'startLesson', lessonId: LESSON_IDS.bwbTradeSetup }),
 *     VISOPSCREEN_URL
 *   );
 */

// ---------------------------------------------------------------------------
// Visopscreen URLs
// ---------------------------------------------------------------------------
export const VISOPSCREEN_URL   = 'https://visopscreen.refreshbiology.com';
export const VISOPSCREEN_LOCAL = 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Inbound message types (Jarvis → Visopscreen)
// ---------------------------------------------------------------------------

export interface StartLessonMessage {
  type: 'startLesson';
  /** Lesson ID from LESSON_IDS. Triggers window.tutorialEngine.startLesson(lessonId). */
  lessonId: string;
}

export interface HighlightElementMessage {
  type: 'highlightElement';
  /** data-tutorial-id attribute value of the element to highlight for 3 seconds. */
  targetId: string;
}

export interface GetRegimeStatusMessage {
  type: 'getRegimeStatus';
}

export interface GetCurriculumStatusMessage {
  type: 'getCurriculumStatus';
}

export interface PingMessage {
  type: 'ping';
}

export type VisopscreenMessageType =
  | 'startLesson'
  | 'highlightElement'
  | 'getRegimeStatus'
  | 'getCurriculumStatus'
  | 'ping';

export type VisopscreenMessage =
  | StartLessonMessage
  | HighlightElementMessage
  | GetRegimeStatusMessage
  | GetCurriculumStatusMessage
  | PingMessage;

// ---------------------------------------------------------------------------
// Response types (Visopscreen → Jarvis)
// ---------------------------------------------------------------------------

export type VisopscreenResponseType =
  | 'lessonStarted'
  | 'elementHighlighted'
  | 'regimeStatus'
  | 'curriculumStatus'
  | 'pong'
  | 'error';

export interface VisopscreenResponse {
  type: VisopscreenResponseType;
  [key: string]: unknown;
}

export interface LessonStartedResponse {
  type: 'lessonStarted';
  lessonId: string;
  ok: boolean;
}

export interface ElementHighlightedResponse {
  type: 'elementHighlighted';
  targetId: string;
  found: boolean;
}

export interface RegimeStatusResponse {
  type: 'regimeStatus';
  data: { archetype: string; confidence: number | null; source: string } | null;
}

export interface CurriculumStatusResponse {
  type: 'curriculumStatus';
  lessons: string[];
  tutorialEngineReady: boolean;
}

export interface PongResponse {
  type: 'pong';
  ready: boolean;
  tutorialEngineReady: boolean;
  tutorialLessonsLoaded: boolean;
  timestamp: number;
}

export interface ErrorResponse {
  type: 'error';
  error: string;
  lessonId?: string;
  targetId?: string;
}

// ---------------------------------------------------------------------------
// buildMessage — constructs a correctly-typed message payload
// ---------------------------------------------------------------------------
export function buildMessage(msg: VisopscreenMessage): VisopscreenMessage {
  return msg;
}

// ---------------------------------------------------------------------------
// SPOTLIGHT_TARGETS — known data-tutorial-id values in spread-analyzer.html
// Use these with highlightElement to point Jarvis at specific UI elements.
// ---------------------------------------------------------------------------
export const SPOTLIGHT_TARGETS = {
  dataConnectionHeader: 'data-connection-header',
  liveStatusIndicator:  'live-status-indicator',
  regimeDisplayArea:    'regime-display-area',
  regimeArchetype:      'regime-archetype',
  dataSourceDemo:       'data-source-demo',
  dataSourceYahoo:      'data-source-yahoo',
  dataSourceTos:        'data-source-tos',
  dataSourceSchwab:     'data-source-schwab',
  findTabBtn:           'find-tab-btn',
  buildTabBtn:          'build-tab-btn',
  analysisTabBtn:       'analysis-tab-btn',
  bwbScreener:          'bwb-screener',
  ratioScreener:        'ratio-screener',
  regimeGateMsg:        'regime-gate-msg',
  strategyWizardBtn:    'wizard-open-btn',
} as const;

export type SpotlightTarget = typeof SPOTLIGHT_TARGETS[keyof typeof SPOTLIGHT_TARGETS];

// ---------------------------------------------------------------------------
// LESSON_IDS — known lesson IDs from window.TUTORIAL_LESSONS (Phase 27-03)
// ---------------------------------------------------------------------------
export const LESSON_IDS = {
  bwbTradeSetup:       'bwb-trade-setup',
  strategyWizard:      'strategy-wizard',
  pnlAnalysis:         'pnl-analysis',
  leapCycles:          'leap-cycles',
  regimeIntelligence:  'regime-intelligence',
} as const;

export type LessonId = typeof LESSON_IDS[keyof typeof LESSON_IDS];
