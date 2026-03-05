/** The 9 widget IDs matching the parameter group consolidation from REQUIREMENTS.md */
export type WidgetId =
  | 'global'
  | 'audio'
  | 'particles'
  | 'placement'
  | 'skybox-core'
  | 'video-skybox'
  | 'masking'
  | 'patches'
  | 'water';

/** Static configuration for a widget (does not change at runtime) */
export interface WidgetConfig {
  id: WidgetId;
  title: string;
  /** Default width in pixels */
  defaultWidth: number;
  /** Default height in pixels */
  defaultHeight: number;
  /** Minimum width in pixels */
  minWidth: number;
  /** Minimum height in pixels */
  minHeight: number;
}

/** Runtime state for a single widget instance */
export interface WidgetState {
  id: WidgetId;
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

/** The complete registry of widget configurations */
export const WIDGET_CONFIGS: Record<WidgetId, WidgetConfig> = {
  global: { id: 'global', title: 'Global & Mode', defaultWidth: 300, defaultHeight: 200, minWidth: 240, minHeight: 120 },
  audio: { id: 'audio', title: 'Audio Dynamics', defaultWidth: 340, defaultHeight: 480, minWidth: 280, minHeight: 200 },
  particles: { id: 'particles', title: 'Particle Layers', defaultWidth: 320, defaultHeight: 400, minWidth: 260, minHeight: 180 },
  placement: { id: 'placement', title: 'Orb & Camera', defaultWidth: 320, defaultHeight: 500, minWidth: 260, minHeight: 200 },
  'skybox-core': { id: 'skybox-core', title: 'Skybox', defaultWidth: 320, defaultHeight: 600, minWidth: 260, minHeight: 200 },
  'video-skybox': { id: 'video-skybox', title: 'Video Skybox', defaultWidth: 320, defaultHeight: 300, minWidth: 260, minHeight: 160 },
  masking: { id: 'masking', title: 'Masking', defaultWidth: 320, defaultHeight: 500, minWidth: 260, minHeight: 200 },
  patches: { id: 'patches', title: 'Patches & Logo', defaultWidth: 320, defaultHeight: 500, minWidth: 260, minHeight: 200 },
  water: { id: 'water', title: 'Water', defaultWidth: 300, defaultHeight: 240, minWidth: 240, minHeight: 140 },
};

/** Title bar height in pixels (used for minimize collapse) */
export const WIDGET_TITLE_BAR_HEIGHT = 40;

/** Z-index range for widgets: z-[75] base, increments per focus */
export const WIDGET_Z_BASE = 75;
export const WIDGET_Z_MAX = 85;
