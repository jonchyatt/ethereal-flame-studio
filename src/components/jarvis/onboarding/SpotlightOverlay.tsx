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
    const el = document.querySelector(`[data-tutorial-id="${spotlight.elementId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
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
