'use client';

import React from 'react';
import { Rnd } from 'react-rnd';
import { Minus, Maximize2, X } from 'lucide-react';
import { WIDGET_TITLE_BAR_HEIGHT } from '@/types/widget';
import type { WidgetId } from '@/types/widget';

interface WidgetContainerProps {
  /** Widget identifier */
  id: WidgetId;
  /** Display title shown in title bar */
  title: string;
  /** Current position */
  position: { x: number; y: number };
  /** Current size */
  size: { width: number; height: number };
  /** Current z-index */
  zIndex: number;
  /** Whether the widget is minimized (collapsed to title bar) */
  isMinimized: boolean;
  /** Minimum width constraint */
  minWidth: number;
  /** Minimum height constraint */
  minHeight: number;
  /** Called when user drags the widget to a new position */
  onDragStop: (id: WidgetId, position: { x: number; y: number }) => void;
  /** Called when user resizes the widget */
  onResizeStop: (id: WidgetId, size: { width: number; height: number }, position: { x: number; y: number }) => void;
  /** Called when user clicks anywhere on the widget (z-order) */
  onFocus: (id: WidgetId) => void;
  /** Called when user clicks minimize button */
  onMinimize: (id: WidgetId) => void;
  /** Called when user clicks close button */
  onClose: (id: WidgetId) => void;
  /** Widget content */
  children: React.ReactNode;
}

export function WidgetContainer({
  id,
  title,
  position,
  size,
  zIndex,
  isMinimized,
  minWidth,
  minHeight,
  onDragStop,
  onResizeStop,
  onFocus,
  onMinimize,
  onClose,
  children,
}: WidgetContainerProps) {
  return (
    <Rnd
      position={{ x: position.x, y: position.y }}
      size={{
        width: size.width,
        height: isMinimized ? WIDGET_TITLE_BAR_HEIGHT : size.height,
      }}
      minWidth={minWidth}
      minHeight={isMinimized ? WIDGET_TITLE_BAR_HEIGHT : minHeight}
      bounds="parent"
      dragHandleClassName="widget-drag-handle"
      enableResizing={!isMinimized}
      onDragStop={(_e, d) => onDragStop(id, { x: d.x, y: d.y })}
      onResizeStop={(_e, _direction, ref, _delta, newPosition) =>
        onResizeStop(
          id,
          { width: parseInt(ref.style.width), height: parseInt(ref.style.height) },
          newPosition
        )
      }
      onMouseDown={() => onFocus(id)}
      style={{ zIndex }}
      cancel=".widget-content"
    >
      <div className="flex flex-col h-full border border-white/15 rounded-lg shadow-xl overflow-hidden bg-black/80 backdrop-blur-md">
        {/* Title bar - drag handle */}
        <div
          className="widget-drag-handle flex items-center justify-between px-3 shrink-0 bg-white/10 hover:bg-white/15 cursor-grab active:cursor-grabbing select-none"
          style={{ height: WIDGET_TITLE_BAR_HEIGHT }}
        >
          <span className="text-white/80 text-sm font-medium truncate mr-2">
            {title}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors pointer-events-auto rounded"
              onClick={(e) => {
                e.stopPropagation();
                onMinimize(id);
              }}
              aria-label={isMinimized ? `Restore ${title}` : `Minimize ${title}`}
            >
              {isMinimized ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors pointer-events-auto rounded"
              onClick={(e) => {
                e.stopPropagation();
                onClose(id);
              }}
              aria-label={`Close ${title}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        {!isMinimized && (
          <div className="widget-content flex-1 overflow-y-auto bg-black/80">
            {children}
          </div>
        )}
      </div>
    </Rnd>
  );
}
