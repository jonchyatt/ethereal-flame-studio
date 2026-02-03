'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useJarvisStore } from '@/lib/jarvis/stores/jarvisStore';
import { useDashboardStore } from '@/lib/jarvis/stores/dashboardStore';
import { MicrophoneCapture } from '@/lib/jarvis/audio/MicrophoneCapture';
import { VoicePipeline } from '@/lib/jarvis/voice/VoicePipeline';
import { PermissionPrompt } from '@/components/jarvis/PermissionPrompt';
import { PushToTalk } from '@/components/jarvis/PushToTalk';
import { DashboardPanel } from '@/components/jarvis/Dashboard';
import { getScheduler, destroyScheduler } from '@/lib/jarvis/executive/Scheduler';
import { BriefingFlow } from '@/lib/jarvis/executive/BriefingFlow';
import { buildMorningBriefing } from '@/lib/jarvis/executive/BriefingClient';
import { getNudgeManager, destroyNudgeManager } from '@/lib/jarvis/executive/NudgeManager';
import { getCheckInManager, destroyCheckInManager } from '@/lib/jarvis/executive/CheckInManager';
import { NudgeOverlay } from '@/components/jarvis/NudgeOverlay';
import type { ScheduledEvent, BriefingData } from '@/lib/jarvis/executive/types';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Three.js
const JarvisOrb = dynamic(
  () => import('@/components/jarvis/JarvisOrb').then((mod) => mod.JarvisOrb),
  { ssr: false }
);

type PermissionUIState = 'loading' | 'prompt' | 'denied' | 'ready';

// Voice selector for debug panel
function VoiceSelector() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  useEffect(() => {
    const loadVoices = () => {
      const available = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      setVoices(available);
      if (available.length > 0 && !selectedVoice) {
        setSelectedVoice(available[0].name);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoice]);

  const testVoice = (voiceName: string) => {
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Hello, I am Jarvis. How can I help you today?");
      utterance.voice = voice;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/20">
      <p className="text-white/50 mb-2">Voice:</p>
      <select
        value={selectedVoice}
        onChange={(e) => {
          setSelectedVoice(e.target.value);
          testVoice(e.target.value);
        }}
        className="w-full bg-zinc-800 text-white text-xs rounded px-2 py-1 border border-zinc-600"
      >
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => testVoice(selectedVoice)}
        className="mt-2 w-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded px-2 py-1"
      >
        Test Voice
      </button>
    </div>
  );
}

export default function JarvisPage() {
  const isAudioPermissionGranted = useJarvisStore((s) => s.isAudioPermissionGranted);
  const audioLevel = useJarvisStore((s) => s.audioLevel);
  const orbState = useJarvisStore((s) => s.orbState);
  const isCapturing = useJarvisStore((s) => s.isCapturing);
  const pipelineState = useJarvisStore((s) => s.pipelineState);
  const currentTranscript = useJarvisStore((s) => s.currentTranscript);
  const error = useJarvisStore((s) => s.error);
  const isBriefingActive = useJarvisStore((s) => s.isBriefingActive);
  const currentBriefingSection = useJarvisStore((s) => s.currentBriefingSection);
  const activeNudge = useJarvisStore((s) => s.activeNudge);

  const [permissionUIState, setPermissionUIState] = useState<PermissionUIState>('loading');
  const [showDebug, setShowDebug] = useState(false);

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<BriefingData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const refreshCounter = useDashboardStore((s) => s.refreshCounter);

  // Voice pipeline ref
  const pipelineRef = useRef<VoicePipeline | null>(null);

  // Briefing flow ref
  const briefingFlowRef = useRef<BriefingFlow | null>(null);

  // Check permission on mount and initialize pipeline
  useEffect(() => {
    const checkPermission = async () => {
      // Skip permission check on server side
      if (typeof window === 'undefined') return;

      try {
        // Check if browser supports audio capture
        if (!MicrophoneCapture.isSupported()) {
          console.warn('[JarvisPage] Audio capture not supported in this browser');
          setPermissionUIState('denied');
          return;
        }

        // Check existing permission state
        const state = await MicrophoneCapture.checkPermission();
        console.log('[JarvisPage] Initial permission state:', state);

        if (state === 'granted') {
          // Permission already granted at browser level - go straight to ready
          // The VoicePipeline will request the actual stream when PTT is pressed
          pipelineRef.current = new VoicePipeline();
          console.log('[JarvisPage] Permission pre-granted, pipeline created');
          setPermissionUIState('ready');
        } else if (state === 'denied') {
          setPermissionUIState('denied');
        } else {
          setPermissionUIState('prompt');
        }
      } catch (error) {
        console.error('[JarvisPage] Error during initialization:', error);
        // Fall back to prompt state on any error
        setPermissionUIState('prompt');
      }
    };

    checkPermission();

    // Cleanup on unmount
    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.cleanup();
        pipelineRef.current = null;
      }
      destroyScheduler();
      destroyNudgeManager();
      destroyCheckInManager();
      const mic = MicrophoneCapture.getInstance();
      mic.cleanup();
    };
  }, []);

  // Initialize scheduler when ready
  useEffect(() => {
    if (permissionUIState !== 'ready') return;

    const handleScheduledEvent = (event: ScheduledEvent) => {
      console.log('[JarvisPage] Scheduled event:', event.type);
      if (event.type === 'morning_briefing') {
        startMorningBriefing();
      } else if (event.type === 'midday_checkin') {
        startMiddayCheckIn();
      } else if (event.type === 'evening_checkin') {
        startEveningCheckIn();
      }
    };

    const handleMissedEvent = (event: ScheduledEvent) => {
      console.log('[JarvisPage] Missed event:', event.type);
      // Could prompt: "You missed your morning briefing. Want to hear it now?"
      // For now, just log
    };

    const scheduler = getScheduler(handleScheduledEvent, handleMissedEvent);
    scheduler.start();

    return () => {
      scheduler.stop();
    };
  }, [permissionUIState]);

  // Fetch dashboard data on mount, on refresh trigger, and periodically
  useEffect(() => {
    if (permissionUIState !== 'ready') return;

    async function fetchDashboardData() {
      setDashboardLoading(true);
      try {
        const data = await buildMorningBriefing();
        setDashboardData(data);
      } catch (error) {
        console.error('[JarvisPage] Failed to fetch dashboard data:', error);
      } finally {
        setDashboardLoading(false);
      }
    }

    fetchDashboardData();
  }, [permissionUIState, refreshCounter]); // Re-fetch when refreshCounter changes

  // Periodic dashboard refresh (every 5 minutes) as backup
  useEffect(() => {
    if (permissionUIState !== 'ready') return;

    const interval = setInterval(() => {
      useDashboardStore.getState().triggerRefresh();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [permissionUIState]);

  // Periodic nudge checking (every 5 minutes)
  useEffect(() => {
    if (permissionUIState !== 'ready') return;

    const nudgeManager = getNudgeManager();
    nudgeManager.startPeriodicCheck(buildMorningBriefing);

    return () => {
      nudgeManager.stopPeriodicCheck();
    };
  }, [permissionUIState]);

  // Start morning briefing
  const startMorningBriefing = useCallback(async () => {
    console.log('[JarvisPage] Starting morning briefing');

    if (!pipelineRef.current) {
      console.warn('[JarvisPage] Pipeline not ready for briefing');
      return;
    }

    // Create speak function that uses the pipeline
    const speakFn = async (text: string): Promise<void> => {
      if (pipelineRef.current) {
        await pipelineRef.current.speak(text);
      }
    };

    // Create and start briefing flow
    briefingFlowRef.current = new BriefingFlow(speakFn, {
      onBriefingComplete: () => {
        console.log('[JarvisPage] Briefing complete');
        briefingFlowRef.current = null;
      },
    });

    await briefingFlowRef.current.start();
  }, []);

  // Start midday check-in
  const startMiddayCheckIn = useCallback(async () => {
    console.log('[JarvisPage] Starting midday check-in');

    if (!pipelineRef.current) {
      console.warn('[JarvisPage] Pipeline not ready for check-in');
      return;
    }

    const checkInManager = getCheckInManager();
    await checkInManager.startMiddayCheckIn(pipelineRef.current, () => {
      console.log('[JarvisPage] Midday check-in complete');
    });
  }, []);

  // Start evening check-in
  const startEveningCheckIn = useCallback(async () => {
    console.log('[JarvisPage] Starting evening check-in');

    if (!pipelineRef.current) {
      console.warn('[JarvisPage] Pipeline not ready for check-in');
      return;
    }

    const checkInManager = getCheckInManager();
    await checkInManager.startEveningCheckIn(pipelineRef.current, () => {
      console.log('[JarvisPage] Evening check-in complete');
    });
  }, []);

  // Handle permission granted from PermissionPrompt
  const handlePermissionGranted = useCallback(() => {
    // Create voice pipeline - it will initialize mic on first PTT press
    pipelineRef.current = new VoicePipeline();
    console.log('[JarvisPage] Permission granted, pipeline created');
    setPermissionUIState('ready');
  }, []);

  // PTT handlers for voice pipeline
  const handlePTTStart = useCallback(() => {
    console.log('[JarvisPage] PTT start');
    pipelineRef.current?.startListening();
  }, []);

  const handlePTTEnd = useCallback(() => {
    console.log('[JarvisPage] PTT end');
    pipelineRef.current?.stopListening();
  }, []);

  // Toggle debug overlay
  const toggleDebug = useCallback(() => {
    setShowDebug((prev) => !prev);
  }, []);

  // Handle orb tap - per CONTEXT.md: "Tap the orb to activate audio"
  const handleOrbTap = useCallback(() => {
    console.log('[JarvisPage] Orb tapped, orbState:', orbState);

    // If speaking (any mode), stop immediately - this is the primary way to interrupt on mobile
    if (orbState === 'speaking') {
      pipelineRef.current?.stopSpeaking();
      // If during briefing, also skip the current section
      if (briefingFlowRef.current?.isActive()) {
        briefingFlowRef.current?.skipCurrentSection();
      }
      return;
    }

    // If there's an active nudge, engage with it
    if (activeNudge && pipelineRef.current) {
      console.log('[JarvisPage] Engaging with nudge:', activeNudge.message);
      const nudgeManager = getNudgeManager();
      nudgeManager.speakNudge(activeNudge.message, pipelineRef.current);
      nudgeManager.acknowledgeNudge(activeNudge.id);
      return;
    }

    // If idle, start listening
    if (orbState === 'idle' && !isBriefingActive) {
      pipelineRef.current?.startListening();
    }
  }, [orbState, isBriefingActive, activeNudge]);

  return (
    <main className="relative flex flex-col h-full w-full bg-black overflow-hidden">
      {/* Orb visualization - always visible, dimmed behind permission prompt */}
      <div
        className={`flex-1 w-full transition-opacity duration-300 ${
          permissionUIState !== 'ready' ? 'opacity-30' : 'opacity-100'
        }`}
      >
        <JarvisOrb onTap={handleOrbTap} />
      </div>

      {/* Permission prompt overlay */}
      {(permissionUIState === 'prompt' || permissionUIState === 'denied') && (
        <PermissionPrompt
          onPermissionGranted={handlePermissionGranted}
          permissionState={permissionUIState}
        />
      )}

      {/* Loading state */}
      {permissionUIState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-white/50 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Initializing...
          </div>
        </div>
      )}

      {/* Push-to-talk controls - only shown when permission granted */}
      {permissionUIState === 'ready' && (
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center">
          <PushToTalk
            onPTTStart={handlePTTStart}
            onPTTEnd={handlePTTEnd}
            usePipeline={true}
            hideVisual={true}
          />

          {/* Briefing controls */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={startMorningBriefing}
              disabled={isBriefingActive}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white rounded-lg transition-colors"
            >
              {isBriefingActive ? `Briefing: ${currentBriefingSection || 'loading...'}` : 'Start Briefing'}
            </button>

            {/* Debug toggle button */}
            <button
              onClick={toggleDebug}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {showDebug ? 'Hide Debug' : 'Debug'}
            </button>
          </div>
        </div>
      )}

      {/* Transcript overlay - small, positioned in bottom-left corner to not block orb touch */}
      {permissionUIState === 'ready' && currentTranscript && (
        <div className="absolute bottom-28 left-3 z-30 pointer-events-none max-w-[200px] sm:max-w-xs">
          <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1">
            <p className="text-white/80 text-xs sm:text-sm leading-tight">
              {currentTranscript}
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {permissionUIState === 'ready' && error && (
        <div className="absolute top-4 left-4 bg-red-900/70 backdrop-blur-sm rounded-lg px-4 py-2 max-w-sm z-40">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Dashboard panel - beside orb, not over it */}
      {permissionUIState === 'ready' && (
        <DashboardPanel data={dashboardData} loading={dashboardLoading} />
      )}

      {/* Nudge overlay - subtle indicator above controls */}
      {permissionUIState === 'ready' && <NudgeOverlay />}

      {/* Debug overlay */}
      {showDebug && permissionUIState === 'ready' && (
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-white/70 space-y-1 z-40 max-w-xs">
          <p>
            Orb State: <span className="text-white">{orbState}</span>
          </p>
          <p>
            Pipeline: <span className="text-white">{pipelineState}</span>
          </p>
          <p>
            Capturing: <span className="text-white">{isCapturing ? 'Yes' : 'No'}</span>
          </p>
          <p>
            Audio Level:{' '}
            <span className="text-white">{(audioLevel * 100).toFixed(0)}%</span>
          </p>
          <p>
            Permission:{' '}
            <span className="text-white">
              {isAudioPermissionGranted ? 'Granted' : 'Not Granted'}
            </span>
          </p>
          <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-cyan-500 transition-all duration-75"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
          <VoiceSelector />
        </div>
      )}
    </main>
  );
}
