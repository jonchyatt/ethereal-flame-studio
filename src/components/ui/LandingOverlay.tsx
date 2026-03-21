'use client';

import { useRouter } from 'next/navigation';

type ViewMode = 'landing' | 'experience' | 'designer' | 'create';

interface LandingOverlayProps {
  viewMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
}

export function LandingOverlay({ viewMode, onSelectMode }: LandingOverlayProps) {
  const router = useRouter();

  if (viewMode !== 'landing') return null;

  const cards = [
    {
      action: () => onSelectMode('experience'),
      title: 'Experience',
      subtitle: 'Watch & feel',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      action: () => onSelectMode('designer'),
      title: 'Design',
      subtitle: 'Build your look',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      action: () => router.push('/create'),
      title: 'Create Video',
      subtitle: 'WebGL instant or Blender cinema',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="landing-overlay fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      <h1 className="landing-title text-white text-3xl sm:text-4xl font-light tracking-wide mb-2 select-none">
        Ethereal Flame Studio
      </h1>
      <p className="landing-subtitle text-white/50 text-sm mb-10 select-none">Visual music experiences</p>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 px-6 max-w-3xl w-full">
        {cards.map((card, i) => (
          <button
            key={card.title}
            onClick={card.action}
            className="
              landing-card flex-1
              bg-white/5 border border-white/10 rounded-2xl
              p-6 sm:p-8
              hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]
              transition-all duration-200
              flex flex-col items-center gap-3
              text-white/80 hover:text-white
              group
            "
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}
          >
            <div className="text-white/60 group-hover:text-white transition-colors">
              {card.icon}
            </div>
            <span className="text-lg font-medium">{card.title}</span>
            <span className="text-white/40 text-sm">{card.subtitle}</span>
          </button>
        ))}
      </div>

      {/* Animations — inlined so they work without global CSS changes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes landingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes landingSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .landing-overlay { animation: landingFadeIn 0.6s ease-out; }
        .landing-title { animation: landingSlideUp 0.7s ease-out; }
        .landing-subtitle { animation: landingSlideUp 0.8s ease-out; }
        .landing-card { animation: landingSlideUp 0.6s ease-out both; }
      `}} />
    </div>
  );
}
