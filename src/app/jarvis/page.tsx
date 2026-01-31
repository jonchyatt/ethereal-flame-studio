'use client';

import { useJarvisStore } from '@/lib/jarvis/stores/jarvisStore';

export default function JarvisPage() {
  const orbState = useJarvisStore((s) => s.orbState);

  return (
    <main className="flex flex-col items-center justify-center h-full w-full">
      {/* Orb container - will be replaced with actual orb in Plan 02 */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-32 h-32 rounded-full bg-blue-500/30 animate-pulse" />
      </div>

      {/* Controls area - will be replaced with push-to-talk in Plan 03 */}
      <div className="pb-8 text-center">
        <p className="text-white/50 text-sm">
          State: {orbState}
        </p>
      </div>
    </main>
  );
}
