'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotionPanelStore } from '@/lib/jarvis/stores/notionPanelStore';

/**
 * NotionPanel — 80% width overlay sliding from the right.
 *
 * Since Notion blocks iframes (X-Frame-Options), this panel shows
 * a branded container with context info and a deep-link button
 * that opens the database/page directly in Notion.
 */
export function NotionPanel() {
  const { isOpen, currentUrl, currentLabel, currentCluster, mode, closePanel, history, goBack } =
    useNotionPanelStore();

  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isDragging = useRef(false);

  // Animated close
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      closePanel();
      setClosing(false);
    }, 250);
  }, [closePanel]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  // Swipe-to-dismiss (touch events)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const delta = touchCurrentX.current - touchStartX.current;
    // Only allow swiping right (to dismiss)
    if (delta > 0 && panelRef.current) {
      panelRef.current.style.transform = `translateX(${delta}px)`;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
    const delta = touchCurrentX.current - touchStartX.current;
    if (delta > 100) {
      handleClose();
    } else if (panelRef.current) {
      panelRef.current.style.transform = '';
    }
  }, [handleClose]);

  if (!isOpen && !closing) return null;

  const modeLabel =
    mode === 'teach' ? 'Learning' : mode === 'show' ? 'Showing' : 'Viewing';

  const clusterLabel = currentCluster
    ? currentCluster.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[34] bg-black/50 transition-opacity duration-300 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 bottom-0 z-[35] w-[80%] max-w-lg
          bg-zinc-950 border-l border-white/10 flex flex-col
          ${closing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-zinc-900/80">
          <button
            onClick={history.length > 0 ? goBack : handleClose}
            className="relative text-white/60 hover:text-white transition-colors p-1"
            aria-label={history.length > 0 ? 'Go back' : 'Close panel'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500/80 rounded-full text-[10px] text-white flex items-center justify-center">
                {history.length}
              </span>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-white/90 text-sm font-medium truncate">{currentLabel}</p>
            {clusterLabel && (
              <p className="text-white/40 text-xs">{clusterLabel}</p>
            )}
          </div>

          <span className="text-cyan-400/70 text-xs uppercase tracking-wide">{modeLabel}</span>

          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {/* Notion icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white/70" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.35c-.42-.326-.98-.7-2.055-.607L3.01 2.96c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.934-.56.934-1.166V6.354c0-.606-.233-.933-.747-.886l-15.177.887c-.56.046-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.934-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.877 1.56l13.728-1.02c1.682-.14 2.1.094 2.8.607l3.876 2.707c.467.326.607.747.607 1.306v16.06c0 .84-.327 1.54-1.494 1.587L7.075 23.72c-.887.047-1.307-.093-1.774-.7L2.35 19.403c-.514-.654-.747-1.167-.747-1.82V2.96c0-.84.327-1.447 1.261-1.4z"/>
            </svg>
          </div>

          <h2 className="text-white/90 text-lg font-medium mb-2">{currentLabel}</h2>

          {clusterLabel && (
            <p className="text-white/50 text-sm mb-6">{clusterLabel} cluster</p>
          )}

          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15
              border border-white/20 rounded-xl text-white text-sm font-medium
              transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Notion
          </a>

          <p className="text-white/30 text-xs mt-4">
            Swipe right or tap outside to close
          </p>
        </div>

        {/* Floating Jarvis indicator */}
        <div className="absolute bottom-4 left-4">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-cyan-400/60 animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
