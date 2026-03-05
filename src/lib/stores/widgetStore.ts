import { create } from 'zustand';
import {
  WidgetId,
  WidgetState,
  WIDGET_CONFIGS,
  WIDGET_Z_BASE,
  WIDGET_Z_MAX,
} from '@/types/widget';

interface WidgetStoreState {
  /** Map of widget ID to its runtime state */
  widgets: Record<WidgetId, WidgetState>;

  /** Open a widget (set isOpen=true, bring to front) */
  openWidget: (id: WidgetId) => void;

  /** Close a widget (set isOpen=false) */
  closeWidget: (id: WidgetId) => void;

  /** Toggle a widget's minimized state */
  toggleMinimize: (id: WidgetId) => void;

  /** Bring a widget to the front (highest z-index) */
  bringToFront: (id: WidgetId) => void;

  /** Update widget position after drag */
  updatePosition: (id: WidgetId, position: { x: number; y: number }) => void;

  /** Update widget size and position after resize */
  updateSize: (id: WidgetId, size: { width: number; height: number }, position: { x: number; y: number }) => void;
}

function createInitialWidgets(): Record<WidgetId, WidgetState> {
  const widgets = {} as Record<WidgetId, WidgetState>;
  const ids = Object.keys(WIDGET_CONFIGS) as WidgetId[];

  ids.forEach((id, index) => {
    const config = WIDGET_CONFIGS[id];
    widgets[id] = {
      id,
      isOpen: false,
      isMinimized: false,
      position: { x: 50 + index * 30, y: 50 + index * 30 },
      size: { width: config.defaultWidth, height: config.defaultHeight },
      zIndex: WIDGET_Z_BASE,
    };
  });

  return widgets;
}

function getNextZIndex(widgets: Record<WidgetId, WidgetState>): number {
  const openWidgets = Object.values(widgets).filter(w => w.isOpen);
  if (openWidgets.length === 0) return WIDGET_Z_BASE;

  const maxZ = Math.max(...openWidgets.map(w => w.zIndex));

  // If we've hit the ceiling, signal renormalization is needed
  if (maxZ >= WIDGET_Z_MAX) {
    return -1;
  }

  return maxZ + 1;
}

function renormalizeZIndices(
  widgets: Record<WidgetId, WidgetState>,
  focusedId: WidgetId
): Record<WidgetId, WidgetState> {
  const newWidgets = { ...widgets };
  const openIds = (Object.keys(widgets) as WidgetId[]).filter(id => widgets[id].isOpen && id !== focusedId);

  // Sort open widgets by current z-index (lowest first)
  openIds.sort((a, b) => widgets[a].zIndex - widgets[b].zIndex);

  // Reassign sequentially from WIDGET_Z_BASE
  openIds.forEach((id, index) => {
    newWidgets[id] = { ...widgets[id], zIndex: WIDGET_Z_BASE + index };
  });

  // Focused widget gets the highest z-index
  newWidgets[focusedId] = { ...widgets[focusedId], zIndex: WIDGET_Z_BASE + openIds.length };

  return newWidgets;
}

export const useWidgetStore = create<WidgetStoreState>()((set, get) => ({
  widgets: createInitialWidgets(),

  openWidget: (id) =>
    set((state) => {
      const nextZ = getNextZIndex(state.widgets);
      let newWidgets: Record<WidgetId, WidgetState>;

      if (nextZ === -1) {
        // Renormalize needed
        newWidgets = renormalizeZIndices(state.widgets, id);
        newWidgets[id] = { ...newWidgets[id], isOpen: true, isMinimized: false };
      } else {
        newWidgets = {
          ...state.widgets,
          [id]: { ...state.widgets[id], isOpen: true, isMinimized: false, zIndex: nextZ },
        };
      }

      return { widgets: newWidgets };
    }),

  closeWidget: (id) =>
    set((state) => ({
      widgets: {
        ...state.widgets,
        [id]: { ...state.widgets[id], isOpen: false },
      },
    })),

  toggleMinimize: (id) =>
    set((state) => ({
      widgets: {
        ...state.widgets,
        [id]: { ...state.widgets[id], isMinimized: !state.widgets[id].isMinimized },
      },
    })),

  bringToFront: (id) =>
    set((state) => {
      const nextZ = getNextZIndex(state.widgets);

      if (nextZ === -1) {
        return { widgets: renormalizeZIndices(state.widgets, id) };
      }

      // Skip if already at front
      if (state.widgets[id].zIndex === nextZ - 1) {
        return state;
      }

      return {
        widgets: {
          ...state.widgets,
          [id]: { ...state.widgets[id], zIndex: nextZ },
        },
      };
    }),

  updatePosition: (id, position) =>
    set((state) => ({
      widgets: {
        ...state.widgets,
        [id]: { ...state.widgets[id], position },
      },
    })),

  updateSize: (id, size, position) =>
    set((state) => ({
      widgets: {
        ...state.widgets,
        [id]: { ...state.widgets[id], size, position },
      },
    })),
}));

/** Select a single widget's state. Use in components to avoid cross-widget re-renders. */
export const selectWidget = (id: WidgetId) => (state: WidgetStoreState) => state.widgets[id];

/** Select only the open widget IDs (for WidgetLayer rendering). */
export const selectOpenWidgetIds = (state: WidgetStoreState): WidgetId[] =>
  (Object.keys(state.widgets) as WidgetId[]).filter(id => state.widgets[id].isOpen);
