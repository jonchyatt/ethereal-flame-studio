'use client';

import { useWidgetStore, selectOpenWidgetIds } from '@/lib/stores/widgetStore';
import { WidgetId, WIDGET_CONFIGS } from '@/types/widget';
import { WidgetContainer } from './WidgetContainer';

/**
 * WidgetPanel renders a single widget and subscribes only to that widget's state.
 * Using an individual selector prevents cross-widget re-renders.
 */
function WidgetPanel({ id }: { id: WidgetId }) {
  const widget = useWidgetStore((state) => state.widgets[id]);
  // Use getState() for actions -- they are stable references, not reactive.
  // Only `widget` above is reactive, so this component only re-renders
  // when THIS widget's state changes.
  const { toggleMinimize, closeWidget, bringToFront, updatePosition, updateSize } =
    useWidgetStore.getState();

  const config = WIDGET_CONFIGS[id];

  return (
    <WidgetContainer
      id={id}
      title={config.title}
      position={widget.position}
      size={widget.size}
      zIndex={widget.zIndex}
      isMinimized={widget.isMinimized}
      minWidth={config.minWidth}
      minHeight={config.minHeight}
      onDragStop={updatePosition}
      onResizeStop={updateSize}
      onFocus={bringToFront}
      onMinimize={toggleMinimize}
      onClose={closeWidget}
    >
      {/* Placeholder content until Phase 20 extracts real widget content */}
      <div className="p-3 text-white/60 text-sm">
        <p className="font-medium text-white/80 mb-2">{config.title}</p>
        <p>Widget content will be extracted from AdvancedEditor in Phase 20.</p>
        <p className="mt-2 text-xs text-white/40">
          Drag the title bar to move. Resize from edges/corners.
        </p>
      </div>
    </WidgetContainer>
  );
}

/**
 * WidgetLayer is a full-viewport overlay that renders open widgets as floating panels.
 * It reads open widget IDs from widgetStore and renders a WidgetPanel for each.
 *
 * z-[70]: above ControlPanel (z-50), below widget panels themselves (z-[75-85]),
 * below modals (z-100).
 *
 * pointer-events-none on the container allows clicks to pass through to the canvas.
 * Each WidgetPanel wrapper has pointer-events-auto so widgets remain interactive.
 *
 * fixed inset-0 makes this a full-viewport overlay -- react-rnd uses bounds="parent"
 * to constrain widgets within this container.
 */
export function WidgetLayer() {
  const openWidgetIds = useWidgetStore(selectOpenWidgetIds);

  if (openWidgetIds.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-none"
      id="widget-layer"
    >
      {openWidgetIds.map((id) => (
        <div key={id} className="pointer-events-auto">
          <WidgetPanel id={id} />
        </div>
      ))}
    </div>
  );
}
