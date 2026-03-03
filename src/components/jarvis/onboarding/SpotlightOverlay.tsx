'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 4;

/**
 * Find the first visible element matching a data-tutorial-id.
 * Uses querySelectorAll to handle dual-render layouts (e.g., DomainRail
 * renders BOTH mobile + desktop navs). Filters for non-zero dimensions
 * to skip hidden variants.
 */
function findVisibleElement(elementId: string): Element | null {
  const candidates = document.querySelectorAll(
    `[data-tutorial-id="${elementId}"]`
  );
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function SpotlightOverlay() {
  const spotlight = useTutorialStore((s) => s.spotlight);
  const clearSpotlight = useTutorialStore((s) => s.clearSpotlight);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>(0);

  const measure = useCallback(() => {
    if (!spotlight) {
      setRect(null);
      return;
    }

    const el = findVisibleElement(spotlight.elementId);
    if (!el) {
      setRect(null);
      return;
    }

    // Scroll into view if off-viewport, then measure after paint settles
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Double-RAF: first RAF fires at next paint, second fires after
    // the browser has actually composited the scroll position change
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // Re-check visibility after scroll (element might have been removed)
        if (r.width === 0 && r.height === 0) {
          setRect(null);
          return;
        }
        setRect({
          top: r.top - PADDING,
          left: r.left - PADDING,
          width: r.width + PADDING * 2,
          height: r.height + PADDING * 2,
        });
      });
    });
  }, [spotlight]);

  // Measure on spotlight change and reposition on resize/scroll
  useEffect(() => {
    measure();

    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [measure]);

  // Click listener to auto-clear when target is clicked
  useEffect(() => {
    if (!spotlight) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(`[data-tutorial-id="${spotlight.elementId}"]`)) {
        clearSpotlight();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [spotlight, clearSpotlight]);

  if (!spotlight || !rect) return null;

  const isPulse = spotlight.type === 'pulse';

  return (
    <>
      <style>{`
        @keyframes spotlight-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(34,211,238,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(34,211,238,0.2); }
        }
      `}</style>
      <div
        className="fixed pointer-events-none rounded-lg"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: 9999,
          ...(isPulse
            ? { animation: 'spotlight-pulse 2s ease-in-out infinite' }
            : { border: '2px solid rgba(34,211,238,0.6)', borderRadius: '8px' }
          ),
        }}
      />
    </>
  );
}
