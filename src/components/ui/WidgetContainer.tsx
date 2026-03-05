'use client';

import React from 'react';
import { Rnd } from 'react-rnd';
import { WidgetId, WIDGET_TITLE_BAR_HEIGHT } from '@/types/widget';

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
      onResizeStop={(_e, _direction, ref, _delta, pos) =>
        onResizeStop(
          id,
          { width: parseInt(ref.style.width), height: parseInt(ref.style.height) },
          pos
        )
      }
      onMouseDown={() => onFocus(id)}
      style={{ zIndex }}
      cancel=".widget-content"
    >
      <div className="flex flex-col h-full bg-black/80 backdrop-blur-md border border-white/15 rounded-lg shadow-xl overflow-hidden">
        {/* Title bar - drag handle */}
        <div
          className="widget-drag-handle flex items-center justify-between px-3 bg-white/10 hover:bg-white/15 cursor-grab active:cursor-grabbing select-none shrink-0"
          style={{ height: WIDGET_TITLE_BAR_HEIGHT }}
        >
          <span className="text-white/80 text-sm font-medium truncate mr-2">
            {title}
          </span>
          <div className="flex items-center gap-1">
            {/* Minimize button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMinimize(id);
              }}
              className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded"
              aria-label={isMinimized ? 'Restore widget' : 'Minimize widget'}
            >
              {isMinimized ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(id);
              }}
              className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded"
              aria-label="Close widget"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        {!isMinimized && (
          <div className="widget-content flex-1 overflow-y-auto">
            {children}
          </div>
        )}
      </div>
    </Rnd>
  );
}
