/**
 * SpeechClient - TTS using AWS Polly neural voices
 *
 * Uses AWS Polly for high-quality neural voice synthesis.
 * Falls back to Web Speech API if Polly fails.
 *
 * Features:
 * - Neural voice quality (Matthew - warm US male)
 * - Audio-reactive orb animation via analyser node
 * - Automatic fallback to browser TTS
 */

import { TTSConfig, TTSCallbacks } from './types';
import { useJarvisStore } from '../stores/jarvisStore';
import { postJarvisAPI } from '../api/fetchWithAuth';

// Default Polly voice (warm US male, NOT butler-like)
const DEFAULT_POLLY_VOICE = 'Matthew';

// Fallback Web Speech API voices
const FALLBACK_VOICES = [
  'Google US English',
  'Microsoft Mark',
  'Samantha',
  'Alex',
];

export class SpeechClient {
  private config: TTSConfig;
  private callbacks: TTSCallbacks;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;
  private isPlaying: boolean = false;

  // Fallback Web Speech
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor(callbacks: TTSCallbacks = {}, config: TTSConfig = {}) {
    this.callbacks = callbacks;
    this.config = {
      rate: 1,
      pitch: 1,
      volume: 1,
      voice: DEFAULT_POLLY_VOICE,
      ...config,
    };

    // Initialize Web Speech as fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadFallbackVoices();
    }
  }

  /**
   * Load fallback voices for Web Speech API
   */
  private loadFallbackVoices(): void {
    if (!this.synth) return;

    const setVoice = () => {
      const voices = this.synth!.getVoices();
      for (const preferred of FALLBACK_VOICES) {
        const found = voices.find(
          (v) => v.name.includes(preferred) && v.lang.startsWith('en')
        );
        if (found) {
          this.selectedVoice = found;
          break;
        }
      }
      if (!this.selectedVoice) {
        this.selectedVoice = voices.find((v) => v.lang.startsWith('en')) || null;
      }
    };

    if (this.synth.getVoices().length > 0) {
      setVoice();
    } else {
      this.synth.addEventListener('voiceschanged', setVoice, { once: true });
    }
  }

  /**
   * Speak text using AWS Polly (with fallback to Web Speech)
   */
  async speak(text: string): Promise<void> {
    // Stop any current speech
    this.stop();

    try {
      await this.speakWithPolly(text);
    } catch (error) {
      console.warn('[SpeechClient] Polly failed, falling back to Web Speech:', error);
      this.speakWithWebSpeech(text);
    }
  }

  /**
   * Speak using AWS Polly
   */
  private async speakWithPolly(text: string): Promise<void> {
    // Fetch audio from Polly API (with authentication)
    const response = await postJarvisAPI('/api/jarvis/tts', {
      text,
      voice: this.config.voice || DEFAULT_POLLY_VOICE,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'TTS request failed' }));
      throw new Error(error.error || 'TTS request failed');
    }

    // Get audio buffer
    const arrayBuffer = await response.arrayBuffer();

    // Create audio context if needed
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Decode audio
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Create nodes
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create analyser for audio-reactive orb
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = this.config.volume ?? 1;

    // Connect: source -> analyser -> gain -> output
    source.connect(this.analyser);
    this.analyser.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Set up events
    this.currentSource = source;
    this.isPlaying = true;

    source.onended = () => {
      this.isPlaying = false;
      this.currentSource = null;
      this.stopAudioReactivity();
      useJarvisStore.getState().setOrbState('idle');
      this.callbacks.onEnd?.();
    };

    // Start playback
    useJarvisStore.getState().setOrbState('speaking');
    this.callbacks.onStart?.();
    source.start(0);

    // Start audio reactivity
    this.startAudioReactivity();
  }

  /**
   * Start audio-reactive orb animation
   */
  private startAudioReactivity(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!this.analyser || !this.isPlaying) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate RMS amplitude
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Normalize to 0-1 range (255 max value)
      const level = Math.min(1, rms / 128);

      // Update orb audio level
      useJarvisStore.getState().setAudioLevel(level);

      this.animationFrame = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  /**
   * Stop audio reactivity animation
   */
  private stopAudioReactivity(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    useJarvisStore.getState().setAudioLevel(0);
  }

  /**
   * Fallback to Web Speech API
   */
  private speakWithWebSpeech(text: string): void {
    if (!this.synth) {
      this.callbacks.onError?.(new Error('No TTS available'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = this.config.rate ?? 1;
    utterance.pitch = this.config.pitch ?? 1;
    utterance.volume = this.config.volume ?? 1;

    utterance.onstart = () => {
      this.isPlaying = true;
      useJarvisStore.getState().setOrbState('speaking');
      this.callbacks.onStart?.();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      useJarvisStore.getState().setOrbState('idle');
      this.callbacks.onEnd?.();
    };

    utterance.onerror = (event) => {
      if (event.error === 'canceled') return;
      this.isPlaying = false;
      useJarvisStore.getState().setOrbState('idle');
      this.callbacks.onError?.(new Error(`Speech error: ${event.error}`));
    };

    this.synth.speak(utterance);
  }

  /**
   * Stop current speech
   */
  stop(): void {
    // Stop Polly audio
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }

    // Stop Web Speech
    if (this.synth?.speaking) {
      this.synth.cancel();
    }

    this.isPlaying = false;
    this.stopAudioReactivity();
    useJarvisStore.getState().setOrbState('idle');
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isPlaying;
  }

  /**
   * Set speech volume (0 - 1)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set Polly voice ID
   */
  setVoice(voiceId: string): void {
    this.config.voice = voiceId;
  }

  /**
   * Get current voice
   */
  getSelectedVoice(): string {
    return this.config.voice || DEFAULT_POLLY_VOICE;
  }

  /**
   * Check if Polly is available (has API route)
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined';
  }
}
