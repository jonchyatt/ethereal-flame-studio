/**
 * Tutorial Execution Engine — the core orchestrator.
 *
 * Mounted in JarvisShell. Reads lesson data, drives the tutorialStore spotlight
 * and progress, injects instructions into chatStore, polls verificationEngine
 * for step completion, and choreographs chat open/close on mobile.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getLesson, type TutorialLesson, type TutorialStep } from '@/lib/jarvis/curriculum/tutorialLessons';
import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';
import { useChatStore } from '@/lib/jarvis/stores/chatStore';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import { tutorialActionBus } from '@/lib/jarvis/curriculum/tutorialActionBus';
import {
  evaluateVerification,
  captureStepContext,
  type StepContext,
} from '@/lib/jarvis/curriculum/verificationEngine';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TutorialEngineAPI {
  isActive: boolean;
  currentLesson: TutorialLesson | null;
  currentStepIndex: number;
  totalSteps: number;
  startLesson: (lessonId: string) => void;
  exitTutorial: () => void;
  skipStep: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CHAT_ELEMENT_IDS = new Set(['chat-input', 'chat-send']);

function isChatStep(step: TutorialStep): boolean {
  return !!step.spotlight && CHAT_ELEMENT_IDS.has(step.spotlight.elementId);
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

function openChatIfClosed(): void {
  if (!useShellStore.getState().isChatOpen) {
    useShellStore.setState({ isChatOpen: true });
  }
}

function closeChatIfOpen(): void {
  if (useShellStore.getState().isChatOpen) {
    useShellStore.getState().closeChat();
  }
}

function injectMessage(
  content: string,
  tutorial: { lessonId: string; type: 'instruction' | 'hint' | 'success' | 'teaching' | 'celebration' },
): void {
  useChatStore.getState().addMessage({
    role: 'assistant',
    content,
    tutorial,
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTutorialEngine(): TutorialEngineAPI {
  const [lesson, setLesson] = useState<TutorialLesson | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Refs for the polling interval and timers
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextRef = useRef<StepContext | null>(null);
  const stepStartRef = useRef<number>(0);
  const lessonStartRef = useRef<number>(0);

  // ── Cleanup helpers ───────────────────────────────────────────────────

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearPolling();
    clearTimer();
  }, [clearPolling, clearTimer]);

  // ── Step advancement (success → next or complete) ─────────────────────

  const advanceToNextStep = useCallback(
    (currentLesson: TutorialLesson, currentStepIndex: number) => {
      cleanup();
      const step = currentLesson.steps[currentStepIndex];

      // Clear spotlight
      useTutorialStore.getState().clearSpotlight();

      // Teaching point
      if (step.teachingPoint) {
        injectMessage(step.teachingPoint, {
          lessonId: currentLesson.id,
          type: 'teaching',
        });
      }

      const nextIndex = currentStepIndex + 1;

      if (nextIndex >= currentLesson.steps.length) {
        // ── COMPLETE ──────────────────────────────────────────────────
        timerRef.current = setTimeout(() => {
          // Celebration message
          injectMessage(currentLesson.completionMessage, {
            lessonId: currentLesson.id,
            type: 'celebration',
          });

          // Record completion
          const durationSeconds = Math.round((Date.now() - lessonStartRef.current) / 1000);
          useTutorialStore.getState().completeLesson({
            completedAt: new Date().toISOString(),
            stepCount: currentLesson.steps.length,
            mistakeCount: 0,
            durationSeconds,
          });

          // Next suggestion
          if (currentLesson.nextSuggestion) {
            const nextLesson = getLesson(currentLesson.nextSuggestion);
            if (nextLesson) {
              useTutorialStore.getState().setSuggestedNext(currentLesson.nextSuggestion);
              injectMessage(
                `Ready for the next lesson? Up next: **${nextLesson.name}**`,
                { lessonId: currentLesson.id, type: 'success' },
              );
            }
          }

          // Open chat so user sees celebration
          openChatIfClosed();

          // Reset internal state
          setIsActive(false);
          setLesson(null);
          setStepIndex(0);
          tutorialActionBus.reset();
        }, 800);
      } else {
        // ── NEXT STEP ─────────────────────────────────────────────────
        timerRef.current = setTimeout(() => {
          useTutorialStore.getState().advanceStep();
          setStepIndex(nextIndex);
        }, 800);
      }
    },
    [cleanup],
  );

  // ── Begin a step (instruct → await) ───────────────────────────────────

  const beginStep = useCallback(
    (currentLesson: TutorialLesson, idx: number) => {
      cleanup();
      const step = currentLesson.steps[idx];
      if (!step) return;

      // Capture context snapshot
      const ctx = captureStepContext();
      contextRef.current = ctx;
      stepStartRef.current = Date.now();

      // Reset action bus for this step
      tutorialActionBus.reset();

      // Choose instruction based on skill level
      const skillLevel = useTutorialStore.getState().skillLevel;
      const instruction = skillLevel === 'advanced' ? step.instructionAdvanced : step.instruction;

      // Inject instruction message
      injectMessage(instruction, {
        lessonId: currentLesson.id,
        type: 'instruction',
      });

      // Open chat to show instruction
      openChatIfClosed();

      // Set spotlight
      if (step.spotlight) {
        useTutorialStore.getState().setSpotlight(step.spotlight);
      }

      // Mobile auto-close: if target isn't a chat element, close chat after 2.5s
      if (isMobile() && !isChatStep(step)) {
        timerRef.current = setTimeout(() => {
          closeChatIfOpen();
        }, 2500);
      }

      // ── Start polling for verification ──────────────────────────────
      pollRef.current = setInterval(() => {
        const passed = evaluateVerification(step.verification, ctx);
        if (!passed) return;

        // For 'ring' (informational) spotlights, enforce a 3s minimum dwell
        if (step.spotlight?.type === 'ring') {
          const elapsed = Date.now() - stepStartRef.current;
          if (elapsed < 3000) return;
        }

        // Handle "already satisfied" — e.g. chat is already open because
        // the engine just opened it to show instruction
        const timeSinceStepStart = Date.now() - stepStartRef.current;
        if (timeSinceStepStart < 1000) return; // Give at least 1s before auto-advancing

        // Verification passed!
        clearPolling();

        // On mobile, re-open chat for success feedback
        if (isMobile()) {
          openChatIfClosed();
        }

        advanceToNextStep(currentLesson, idx);
      }, 500);
    },
    [cleanup, clearPolling, advanceToNextStep],
  );

  // ── Start a lesson ────────────────────────────────────────────────────

  const startLesson = useCallback(
    (lessonId: string) => {
      cleanup();
      const lessonData = getLesson(lessonId);
      if (!lessonData) {
        console.warn(`[tutorialEngine] Unknown lesson: "${lessonId}"`);
        return;
      }

      // Clear any suggested next
      useTutorialStore.getState().setSuggestedNext(null);

      // Initialize store
      useTutorialStore.getState().startLesson(lessonId);
      lessonStartRef.current = Date.now();

      // Set internal state
      setLesson(lessonData);
      setStepIndex(0);
      setIsActive(true);

      // Begin first step after a brief delay for state to settle
      setTimeout(() => {
        beginStep(lessonData, 0);
      }, 300);
    },
    [cleanup, beginStep],
  );

  // ── Exit tutorial ─────────────────────────────────────────────────────

  const exitTutorial = useCallback(() => {
    cleanup();
    useTutorialStore.getState().clearSpotlight();
    // Reset store lesson tracking (without recording completion)
    useTutorialStore.setState({ currentLesson: null, currentStep: 0, spotlight: null });
    tutorialActionBus.reset();
    setIsActive(false);
    setLesson(null);
    setStepIndex(0);
  }, [cleanup]);

  // ── Skip step ─────────────────────────────────────────────────────────

  const skipStep = useCallback(() => {
    if (!lesson) return;
    advanceToNextStep(lesson, stepIndex);
  }, [lesson, stepIndex, advanceToNextStep]);

  // ── Watch stepIndex changes to begin new steps ────────────────────────

  useEffect(() => {
    if (!isActive || !lesson || stepIndex === 0) return;
    // stepIndex just changed (from advanceStep) — begin the new step
    beginStep(lesson, stepIndex);
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-start from suggestedNext (reactive — fires when value changes) ──

  const suggestedNext = useTutorialStore((s) => s.suggestedNext);

  useEffect(() => {
    if (!suggestedNext || isActive) return;

    const alreadyCompleted = useTutorialStore.getState().progress[suggestedNext];
    if (alreadyCompleted) return;

    const timer = setTimeout(() => {
      startLesson(suggestedNext);
    }, 1500);

    return () => clearTimeout(timer);
  }, [suggestedNext]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isActive,
    currentLesson: lesson,
    currentStepIndex: stepIndex,
    totalSteps: lesson?.steps.length ?? 0,
    startLesson,
    exitTutorial,
    skipStep,
  };
}
