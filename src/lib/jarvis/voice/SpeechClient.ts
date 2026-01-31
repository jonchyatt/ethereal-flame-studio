/**
 * SpeechClient - Browser-based TTS using Web Speech API
 *
 * Uses the built-in SpeechSynthesis API for zero-cost, zero-latency TTS.
 * No API keys required. Works in all modern browsers.
 *
 * Limitations:
 * - Voice quality varies by browser/OS
 * - No audio stream access (can't do audio-reactive orb animation)
 * - Orb shows "speaking" state but doesn't pulse to voice
 *
 * This is acceptable for Phase 2 to prove the pipeline works.
 * Can upgrade to ElevenLabs/OpenAI TTS later when voice quality matters.
 */

import { TTSConfig, TTSCallbacks } from './types';
import { useJarvisStore } from '../stores/jarvisStore';

// Preferred voices in order of preference (varies by browser/OS)
const PREFERRED_VOICES = [
  'Google UK English Male',
  'Daniel', // macOS
  'Microsoft David', // Windows
  'Alex', // macOS fallback
  'Samantha', // macOS female fallback
  'Google US English', // Chrome fallback
];

export class SpeechClient {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private config: TTSConfig;
  private callbacks: TTSCallbacks;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded: boolean = false;

  constructor(callbacks: TTSCallbacks = {}, config: TTSConfig = {}) {
    this.callbacks = callbacks;
    this.config = {
      rate: 1,
      pitch: 1,
      volume: 1,
      ...config,
    };

    // Only initialize in browser environment
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }

  /**
   * Load available voices (async in some browsers)
   */
  private loadVoices(): void {
    if (!this.synth) return;

    const setVoice = () => {
      const voices = this.synth!.getVoices();
      if (voices.length === 0) return;

      this.voicesLoaded = true;

      // If user specified a voice, try to find it
      if (this.config.voice) {
        this.selectedVoice =
          voices.find((v) => v.name === this.config.voice) || null;
      }

      // Otherwise, find best available voice from preferred list
      if (!this.selectedVoice) {
        for (const preferred of PREFERRED_VOICES) {
          const found = voices.find(
            (v) => v.name.includes(preferred) && v.lang.startsWith('en')
          );
          if (found) {
            this.selectedVoice = found;
            break;
          }
        }
      }

      // Fallback to first English voice
      if (!this.selectedVoice) {
        this.selectedVoice =
          voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
      }
    };

    // Voices may be loaded async (Chrome does this)
    if (this.synth.getVoices().length > 0) {
      setVoice();
    } else {
      this.synth.addEventListener('voiceschanged', setVoice, { once: true });
    }
  }

  /**
   * Speak text through browser TTS
   */
  speak(text: string): void {
    if (!this.synth) {
      this.callbacks.onError?.(
        new Error('SpeechSynthesis not available in this browser')
      );
      return;
    }

    // Cancel any current speech
    this.stop();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Apply configuration
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = this.config.rate ?? 1;
    utterance.pitch = this.config.pitch ?? 1;
    utterance.volume = this.config.volume ?? 1;

    // Set up event handlers
    utterance.onstart = () => {
      useJarvisStore.getState().setOrbState('speaking');
      this.callbacks.onStart?.();
    };

    utterance.onend = () => {
      useJarvisStore.getState().setOrbState('idle');
      this.currentUtterance = null;
      this.callbacks.onEnd?.();
    };

    utterance.onerror = (event) => {
      // 'canceled' is not really an error - happens when stop() is called
      if (event.error === 'canceled') {
        return;
      }
      useJarvisStore.getState().setOrbState('idle');
      this.currentUtterance = null;
      this.callbacks.onError?.(new Error(`Speech synthesis error: ${event.error}`));
    };

    // Store reference and start speaking
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
      useJarvisStore.getState().setOrbState('idle');
      this.currentUtterance = null;
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  /**
   * Set speech rate (0.1 - 10)
   */
  setRate(rate: number): void {
    this.config.rate = Math.max(0.1, Math.min(10, rate));
  }

  /**
   * Set speech pitch (0 - 2)
   */
  setPitch(pitch: number): void {
    this.config.pitch = Math.max(0, Math.min(2, pitch));
  }

  /**
   * Set speech volume (0 - 1)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get list of available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() ?? [];
  }

  /**
   * Set voice by name
   */
  setVoice(voiceName: string): boolean {
    const voices = this.getVoices();
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      this.config.voice = voiceName;
      return true;
    }
    return false;
  }

  /**
   * Get currently selected voice name
   */
  getSelectedVoice(): string | null {
    return this.selectedVoice?.name ?? null;
  }

  /**
   * Check if Web Speech API is available
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}
