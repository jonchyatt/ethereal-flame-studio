'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';
import { tutorialActionBus } from '@/lib/jarvis/curriculum/tutorialActionBus';
import { postJarvisAPI } from '@/lib/jarvis/api/fetchWithAuth';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface LaserPath {
  start: Point;
  target: Point;
}

// ── Shared TTS singleton — one audio track at a time across spotlight + chat ──
export const activeTTSAudio = { current: null as HTMLAudioElement | null };

// Tracks audio elements that we paused intentionally (stopActiveTTS).
// Used by the pause auto-resume listener to distinguish our stops from iOS interrupts.
const _intentionallyPaused = new WeakSet<HTMLAudioElement>();

export function stopActiveTTS() {
  if (activeTTSAudio.current) {
    _intentionallyPaused.add(activeTTSAudio.current);
    activeTTSAudio.current.pause();
    activeTTSAudio.current = null;
  }
}

const PADDING = 4;
const LASER_MARGIN = 24;
const LASER_OFFSET_X = 170;
const LASER_OFFSET_Y = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getLaserStartPoint(target: Point): Point {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const xDir = target.x < width / 2 ? 1 : -1;
  const yDir = target.y < height / 2 ? 1 : -1;
  return {
    x: clamp(target.x + LASER_OFFSET_X * xDir, LASER_MARGIN, width - LASER_MARGIN),
    y: clamp(target.y + LASER_OFFSET_Y * yDir, LASER_MARGIN, height - LASER_MARGIN),
  };
}

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
  const isNarrationEnabled = useTutorialStore((s) => s.isNarrationEnabled);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [laserPath, setLaserPath] = useState<LaserPath | null>(null);
  const [laserPosition, setLaserPosition] = useState<Point | null>(null);
  const rafRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const laserPointRef = useRef<Point | null>(null);
  const lastElementIdRef = useRef<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const elementId = spotlight?.elementId ?? null;
    if (lastElementIdRef.current !== elementId) {
      laserPointRef.current = null;
      lastElementIdRef.current = elementId;
    }
    if (!spotlight) {
      setLaserPath(null);
      setLaserPosition(null);
    }
  }, [spotlight]);

  // Play narration when a spotlight with narration text arrives.
  // isNarrationEnabled intentionally excluded from deps — toggling mute/unmute
  // should NOT restart narration that is already in-flight.
  useEffect(() => {
    // Stop any active TTS first (chat or prior spotlight)
    stopActiveTTS();
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (!spotlight?.narration || !isNarrationEnabled) return;

    let cancelled = false;

    postJarvisAPI('/api/jarvis/tts', { text: spotlight.narration })
      .then((res) => {
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        activeTTSAudio.current = audio;
        // iOS suspends audio on touch even when started asynchronously.
        // Auto-resume unless we explicitly stopped it via stopActiveTTS().
        audio.addEventListener('pause', () => {
          if (!audio.ended && !_intentionallyPaused.has(audio)) {
            audio.play().catch(() => {});
          }
        });
        audio.play().catch(() => {
          // Autoplay policy may block on first interaction — silent fail
        });
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(url);
          audioUrlRef.current = null;
          activeTTSAudio.current = null;
        }, { once: true });
      })
      .catch(() => {
        // Narration is enhancement — never block the tutorial flow
      });

    return () => {
      cancelled = true;
      stopActiveTTS();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlight?.narration]);

  const measure = useCallback(() => {
    // Cancel any in-flight retry before starting fresh
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (!spotlight) {
      setRect(null);
      setLaserPath(null);
      return;
    }

    const elementId = spotlight.elementId;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    const RETRY_MS = 150;

    const tryMeasure = () => {
      const el = findVisibleElement(elementId);
      if (!el) {
        // Element not in DOM yet — retry (handles navigation race condition)
        if (++attempts < MAX_ATTEMPTS) {
          retryTimerRef.current = setTimeout(tryMeasure, RETRY_MS);
        }
        return;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) {
            // Invisible after scroll — retry once more
            if (++attempts < MAX_ATTEMPTS) {
              retryTimerRef.current = setTimeout(tryMeasure, RETRY_MS);
            }
            return;
          }
          setRect({
            top: r.top - PADDING,
            left: r.left - PADDING,
            width: r.width + PADDING * 2,
            height: r.height + PADDING * 2,
          });
          const target: Point = {
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
          };
          const start = laserPointRef.current ?? getLaserStartPoint(target);
          setLaserPath({ start, target });
          laserPointRef.current = target;
        });
      });
    };

    tryMeasure();
  }, [spotlight]);

  useEffect(() => {
    if (!laserPath) {
      setLaserPosition(null);
      return;
    }
    setLaserPosition(laserPath.start);
    const id = requestAnimationFrame(() => {
      setLaserPosition(laserPath.target);
    });
    return () => cancelAnimationFrame(id);
  }, [laserPath]);

  // Cancel retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

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

  // Click listener: flash green on tap, then clear spotlight after 350ms
  useEffect(() => {
    if (!spotlight) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(`[data-tutorial-id="${spotlight.elementId}"]`)) {
        setFlashSuccess(true);
        tutorialActionBus.emit('spotlight-element-tapped');
        setTimeout(() => {
          clearSpotlight();
          setFlashSuccess(false);
        }, 350);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [spotlight, clearSpotlight]);

  if (!spotlight) return null;

  const isPulse = spotlight.type === 'pulse';
  const dx = laserPath ? laserPath.target.x - laserPath.start.x : 0;
  const dy = laserPath ? laserPath.target.y - laserPath.start.y : 0;
  const lineLength = Math.sqrt(dx * dx + dy * dy);
  const lineAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <>
      <style>{`
        @keyframes spotlight-target-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes laser-dot-pulse {
          0%, 100% {
            box-shadow: 0 0 0 1px rgba(255,255,255,0.6), 0 0 14px rgba(255,25,25,0.95), 0 0 28px rgba(255,25,25,0.55);
          }
          50% {
            box-shadow: 0 0 0 1px rgba(255,255,255,0.8), 0 0 20px rgba(255,25,25,1), 0 0 36px rgba(255,25,25,0.75);
          }
        }
        @keyframes laser-line-fade {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 0.95; }
        }
        @keyframes spotlight-success-flash {
          0%   { transform: scale(1); border-color: rgba(255,78,78,0.95); }
          40%  { transform: scale(1.05); border-color: rgba(52,211,153,0.95); }
          100% { transform: scale(1); border-color: rgba(52,211,153,0.95); }
        }
      `}</style>

      {/* Visual spotlight elements — only rendered once rect is measured */}
      {rect && (
        <>
          {laserPath && lineLength > 8 && (
            <div
              className="fixed pointer-events-none"
              style={{
                top: laserPath.start.y - 1,
                left: laserPath.start.x,
                width: lineLength,
                height: 2,
                background:
                  'linear-gradient(90deg, rgba(255,75,75,0.8) 0%, rgba(255,75,75,0.12) 100%)',
                transformOrigin: '0 50%',
                transform: `rotate(${lineAngle}deg)`,
                zIndex: 9998,
                animation: 'laser-line-fade 1.4s ease-in-out infinite',
              }}
            />
          )}
          {laserPosition && (
            <div
              className="fixed pointer-events-none"
              style={{
                top: 0,
                left: 0,
                transform: `translate(${laserPosition.x - 8}px, ${laserPosition.y - 8}px)`,
                transition: 'transform 650ms cubic-bezier(0.2, 0.9, 0.2, 1)',
                zIndex: 10000,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 9999,
                  background:
                    'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,108,108,0.98) 34%, rgba(255,32,32,0.95) 65%, rgba(255,32,32,0.2) 100%)',
                  animation: 'laser-dot-pulse 1.1s ease-in-out infinite',
                }}
              />
            </div>
          )}
          <div
            className="fixed pointer-events-none rounded-lg"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              zIndex: 9999,
              border: flashSuccess
                ? '2px solid rgba(52,211,153,0.95)'
                : isPulse
                  ? '2px solid rgba(255,78,78,0.95)'
                  : '2px solid rgba(255,120,120,0.95)',
              boxShadow: isPulse
                ? '0 0 0 1px rgba(255,255,255,0.5), 0 0 20px rgba(255,60,60,0.88), 0 0 50px rgba(255,60,60,0.35), 0 0 0 9999px rgba(0,0,0,0.28)'
                : '0 0 0 1px rgba(255,255,255,0.45), 0 0 16px rgba(255,92,92,0.65), 0 0 34px rgba(255,92,92,0.28), 0 0 0 9999px rgba(0,0,0,0.24)',
              animation: flashSuccess
                ? 'spotlight-success-flash 350ms ease-out forwards'
                : isPulse
                  ? 'spotlight-target-pulse 1.4s ease-in-out infinite'
                  : undefined,
            }}
          />
        </>
      )}
    </>
  );
}
