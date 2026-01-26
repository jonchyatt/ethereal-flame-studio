'use client';

/**
 * AudioControls - Audio file upload and playback UI with debug overlay
 *
 * Features:
 * - File upload for audio files (mp3, wav, ogg)
 * - Play/pause control
 * - Real-time audio level display (bass, mids, treble)
 * - Beat indicator that flashes on bass hits
 * - Integration with AudioAnalyzer singleton
 */

import { useRef, useEffect, useState } from 'react';
import { audioAnalyzer } from '@/lib/audio/AudioAnalyzer';
import { useAudioStore } from '@/lib/stores/audioStore';

export function AudioControls() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [isConnected, setIsConnected] = useState(false);

  const {
    isPlaying,
    audioFileName,
    bass,
    mid,
    high,
    amplitude,
    isBeat,
    currentScale,
    setPlaying,
    setAudioFile,
    setLevels,
    setBeat,
  } = useAudioStore();

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioElement = audioRef.current;
    if (!audioElement) return;

    try {
      // Create object URL from file
      const objectUrl = URL.createObjectURL(file);
      audioElement.src = objectUrl;

      // Connect analyzer to audio element
      await audioAnalyzer.connect(audioElement);
      setIsConnected(true);

      // Update store
      setAudioFile(file, file.name);

      console.log('Audio file loaded:', file.name);
    } catch (error) {
      console.error('Failed to load audio file:', error);
    }
  };

  // Handle play/pause
  const handlePlayPause = async () => {
    const audioElement = audioRef.current;
    if (!audioElement || !isConnected) return;

    try {
      if (isPlaying) {
        audioElement.pause();
        setPlaying(false);
      } else {
        // Resume AudioContext if suspended (browser autoplay policy)
        await audioAnalyzer.resume();
        await audioElement.play();
        setPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  // Animation loop for updating audio levels
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (currentTime: number) => {
      // Calculate delta time in seconds
      const deltaTime = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0.016; // Default to ~60fps
      lastTimeRef.current = currentTime;

      // Update audio analyzer
      audioAnalyzer.update(deltaTime);

      // Get levels and update store
      const levels = audioAnalyzer.getLevels();
      setLevels(levels);
      setBeat(levels.isBeat);

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, setLevels, setBeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-t border-white/10 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 flex-wrap">
          {/* File Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
              onChange={handleFileChange}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors min-w-[120px] text-center"
            >
              Upload Audio
            </label>
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            disabled={!isConnected}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors min-w-[100px] min-h-[44px]"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          {/* File Name */}
          {audioFileName && (
            <div className="text-white/80 text-sm truncate max-w-xs">
              {audioFileName}
            </div>
          )}

          {/* Debug Overlay - Audio Levels */}
          <div className="ml-auto flex items-center gap-6 text-xs font-mono">
            {/* Bass */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 uppercase">Bass:</span>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-75"
                  style={{ width: `${bass * 100}%` }}
                />
              </div>
              <span className="text-white w-12 text-right">
                {(bass * 100).toFixed(0)}%
              </span>
            </div>

            {/* Mids */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 uppercase">Mids:</span>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-75"
                  style={{ width: `${mid * 100}%` }}
                />
              </div>
              <span className="text-white w-12 text-right">
                {(mid * 100).toFixed(0)}%
              </span>
            </div>

            {/* Treble */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 uppercase">High:</span>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-75"
                  style={{ width: `${high * 100}%` }}
                />
              </div>
              <span className="text-white w-12 text-right">
                {(high * 100).toFixed(0)}%
              </span>
            </div>

            {/* Beat Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 uppercase">Beat:</span>
              <div
                className={`w-8 h-8 rounded-full transition-all duration-100 ${
                  isBeat
                    ? 'bg-red-500 scale-125 shadow-lg shadow-red-500/50'
                    : 'bg-white/10 scale-100'
                }`}
              />
            </div>

            {/* Scale Display */}
            <div className="flex items-center gap-2">
              <span className="text-white/60 uppercase">Scale:</span>
              <span className="text-white w-12 text-right">
                {currentScale.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Hidden audio element */}
        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
}
