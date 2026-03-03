'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';

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
  const toggleNarration = useTutorialStore((s) => s.toggleNarration);
  const [rect, setRect] = useState<Rect | null>(null);
  const [laserPath, setLaserPath] = useState<LaserPath | null>(null);
  const [laserPosition, setLaserPosition] = useState<Point | null>(null);
  const rafRef = useRef<number>(0);
  const laserPointRef = useRef<Point | null>(null);
  const lastElementIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Play narration when a spotlight with text arrives
  useEffect(() => {
    // Stop any in-flight audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (!spotlight?.narration || !isNarrationEnabled) return;

    let cancelled = false;

    fetch('/api/jarvis/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spotlight.narration }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(() => {
          // Autoplay policy may block on first interaction — silent fail
        });
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(url);
          audioUrlRef.current = null;
          audioRef.current = null;
        }, { once: true });
      })
      .catch(() => {
        // Narration is enhancement — never block the tutorial flow
      });

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [spotlight?.narration, isNarrationEnabled]);

  const measure = useCallback(() => {
    if (!spotlight) {
      setRect(null);
      setLaserPath(null);
      return;
    }

    const el = findVisibleElement(spotlight.elementId);
    if (!el) {
      setRect(null);
      setLaserPath(null);
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
        const target: Point = {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
        };
        const start = laserPointRef.current ?? getLaserStartPoint(target);
        setLaserPath({ start, target });
        laserPointRef.current = target;
      });
    });
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
      `}</style>

      {/* Narration mute toggle — visible whenever a spotlight is active */}
      <button
        onClick={toggleNarration}
        className="fixed top-4 right-4 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors pointer-events-auto"
        style={{ zIndex: 10001 }}
        title={isNarrationEnabled ? 'Mute narration' : 'Unmute narration'}
        aria-label={isNarrationEnabled ? 'Mute narration' : 'Unmute narration'}
      >
        {isNarrationEnabled
          ? <Volume2 className="w-4 h-4" />
          : <VolumeX className="w-4 h-4" />
        }
      </button>

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
              border: isPulse
                ? '2px solid rgba(255,78,78,0.95)'
                : '2px solid rgba(255,120,120,0.95)',
              boxShadow: isPulse
                ? '0 0 0 1px rgba(255,255,255,0.5), 0 0 20px rgba(255,60,60,0.88), 0 0 50px rgba(255,60,60,0.35), 0 0 0 9999px rgba(0,0,0,0.28)'
                : '0 0 0 1px rgba(255,255,255,0.45), 0 0 16px rgba(255,92,92,0.65), 0 0 34px rgba(255,92,92,0.28), 0 0 0 9999px rgba(0,0,0,0.24)',
              animation: isPulse ? 'spotlight-target-pulse 1.4s ease-in-out infinite' : undefined,
            }}
          />
        </>
      )}
    </>
  );
}
