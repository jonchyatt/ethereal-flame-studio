/**
 * VoicePipeline - Orchestrates STT, TTS, and state transitions
 *
 * Coordinates the complete voice flow:
 * 1. User presses PTT -> listening state
 * 2. STT transcribes speech in real-time
 * 3. User releases PTT -> processing state
 * 4. Generate response (echo for now)
 * 5. TTS speaks response -> speaking state
 * 6. Audio ends -> idle state
 *
 * Features:
 * - Barge-in support (PTT during TTS interrupts playback)
 * - Error handling with spoken feedback
 * - State machine with clear transitions
 */

import { MicrophoneCapture } from '../audio/MicrophoneCapture';
import { DeepgramClient } from './DeepgramClient';
import { SpeechClient } from './SpeechClient';
import { useJarvisStore } from '../stores/jarvisStore';
import type { VoicePipelineState, TranscriptResult, STTCallbacks, TTSCallbacks } from './types';

// Default response generator (echo mode for testing)
type ResponseGenerator = (transcript: string) => string | Promise<string>;

const defaultResponseGenerator: ResponseGenerator = (transcript) =>
  `You said: ${transcript}`;

export interface VoicePipelineConfig {
  /** Custom response generator (default: echo) */
  responseGenerator?: ResponseGenerator;
  /** Minimum transcript length to process (default: 1) */
  minTranscriptLength?: number;
  /** Speak error messages (default: true) */
  speakErrors?: boolean;
}

export class VoicePipeline {
  private mic: MicrophoneCapture;
  private stt: DeepgramClient | null = null;
  private tts: SpeechClient;
  private config: Required<VoicePipelineConfig>;

  private state: VoicePipelineState = 'idle';
  private accumulatedTranscript = '';
  private lastFinalTranscript = '';

  constructor(config: VoicePipelineConfig = {}) {
    this.mic = MicrophoneCapture.getInstance();
    this.config = {
      responseGenerator: config.responseGenerator ?? defaultResponseGenerator,
      minTranscriptLength: config.minTranscriptLength ?? 1,
      speakErrors: config.speakErrors ?? true,
    };

    // Initialize TTS with callbacks
    const ttsCallbacks: TTSCallbacks = {
      onStart: () => {
        console.log('[VoicePipeline] TTS started speaking');
        this.setState('speaking');
      },
      onEnd: () => {
        console.log('[VoicePipeline] TTS finished speaking');
        this.setState('idle');
      },
      onError: (error) => {
        console.error('[VoicePipeline] TTS error:', error);
        this.handleError(error);
      },
    };

    this.tts = new SpeechClient(ttsCallbacks);
  }

  /**
   * Initialize the pipeline (ensure microphone permission)
   */
  async initialize(): Promise<boolean> {
    if (this.mic.hasPermission()) {
      return true;
    }
    return this.mic.requestPermission();
  }

  /**
   * Start listening (called on PTT press)
   */
  async startListening(): Promise<void> {
    console.log('[VoicePipeline] startListening() called, current state:', this.state);

    // Barge-in: if currently speaking, stop TTS and start listening
    if (this.state === 'speaking') {
      console.log('[VoicePipeline] Barge-in detected, stopping TTS');
      this.tts.stop();
    }

    // Don't restart if already listening
    if (this.state === 'listening') {
      console.log('[VoicePipeline] Already listening, ignoring');
      return;
    }

    // Ensure we have permission
    if (!this.mic.hasPermission()) {
      const granted = await this.initialize();
      if (!granted) {
        this.handleError(new Error('Microphone permission required'));
        return;
      }
    }

    // Reset transcript accumulators
    this.accumulatedTranscript = '';
    this.lastFinalTranscript = '';
    useJarvisStore.getState().setCurrentTranscript('');
    useJarvisStore.getState().setFinalTranscript('');
    useJarvisStore.getState().setError(null);

    // Get media stream for STT
    const mediaStream = this.mic.getMediaStream();
    if (!mediaStream) {
      this.handleError(new Error('No media stream available'));
      return;
    }

    // Create STT client with callbacks
    const sttCallbacks: STTCallbacks = {
      onTranscript: (result) => this.handleTranscript(result),
      onError: (error) => this.handleSTTError(error),
      onOpen: () => {
        console.log('[VoicePipeline] STT connection opened');
      },
      onClose: () => {
        console.log('[VoicePipeline] STT connection closed');
      },
    };

    this.stt = new DeepgramClient(sttCallbacks);

    // Start microphone capture (for audio level visualization)
    this.mic.start();

    // Start STT
    try {
      await this.stt.start(mediaStream);
      this.setState('listening');
      console.log('[VoicePipeline] Now listening');
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to start STT'));
    }
  }

  /**
   * Stop listening (called on PTT release)
   */
  async stopListening(): Promise<void> {
    console.log('[VoicePipeline] stopListening() called, current state:', this.state);

    if (this.state !== 'listening') {
      console.log('[VoicePipeline] Not listening, ignoring stop');
      return;
    }

    // Stop STT
    if (this.stt) {
      this.stt.stop();
      this.stt = null;
    }

    // Stop microphone capture
    this.mic.stop();

    // Get final transcript
    const transcript = this.lastFinalTranscript || this.accumulatedTranscript;
    useJarvisStore.getState().setFinalTranscript(transcript);

    console.log('[VoicePipeline] Final transcript:', transcript);

    // Check if we have something to respond to
    if (transcript.trim().length < this.config.minTranscriptLength) {
      console.log('[VoicePipeline] No meaningful transcript, returning to idle');
      this.setState('idle');
      return;
    }

    // Process the transcript
    await this.processTranscript(transcript);
  }

  /**
   * Cancel any in-progress operation
   */
  cancel(): void {
    console.log('[VoicePipeline] Cancelling all operations');

    // Stop STT
    if (this.stt) {
      this.stt.stop();
      this.stt = null;
    }

    // Stop microphone
    this.mic.stop();

    // Stop TTS
    this.tts.stop();

    // Reset state
    this.accumulatedTranscript = '';
    this.lastFinalTranscript = '';
    this.setState('idle');
    useJarvisStore.getState().resetPipeline();
  }

  /**
   * Get current pipeline state
   */
  getState(): VoicePipelineState {
    return this.state;
  }

  /**
   * Check if pipeline is busy (not idle)
   */
  isBusy(): boolean {
    return this.state !== 'idle';
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.cancel();
    // Note: Don't cleanup MicrophoneCapture here as it's a singleton
  }

  /**
   * Set response generator (for upgrading from echo to LLM)
   */
  setResponseGenerator(generator: ResponseGenerator): void {
    this.config.responseGenerator = generator;
  }

  // Private methods

  private setState(newState: VoicePipelineState): void {
    console.log(`[VoicePipeline] State: ${this.state} -> ${newState}`);
    this.state = newState;
    useJarvisStore.getState().setPipelineState(newState);

    // Map pipeline state to orb state
    const orbStateMap: Record<VoicePipelineState, 'idle' | 'listening' | 'thinking' | 'speaking'> = {
      idle: 'idle',
      listening: 'listening',
      processing: 'thinking',
      speaking: 'speaking',
      error: 'idle',
    };

    useJarvisStore.getState().setOrbState(orbStateMap[newState]);
  }

  private handleTranscript(result: TranscriptResult): void {
    console.log('[VoicePipeline] Transcript:', result);

    // Update current (interim) transcript
    if (!result.isFinal) {
      // For interim results, show accumulated + current
      useJarvisStore.getState().setCurrentTranscript(
        this.lastFinalTranscript + (this.lastFinalTranscript ? ' ' : '') + result.transcript
      );
    } else {
      // For final results, accumulate
      if (result.transcript.trim()) {
        this.lastFinalTranscript = (
          this.lastFinalTranscript +
          (this.lastFinalTranscript ? ' ' : '') +
          result.transcript
        ).trim();
        useJarvisStore.getState().setCurrentTranscript(this.lastFinalTranscript);
      }
    }

    // Also update accumulated transcript (for edge cases)
    this.accumulatedTranscript = this.lastFinalTranscript || result.transcript;
  }

  private handleSTTError(error: Error): void {
    console.error('[VoicePipeline] STT error:', error);
    // Don't treat all STT errors as fatal - some are recoverable
    // Only set error state if we're not already processing
    if (this.state === 'listening') {
      this.handleError(error);
    }
  }

  private async processTranscript(transcript: string): Promise<void> {
    this.setState('processing');

    try {
      // Generate response
      console.log('[VoicePipeline] Generating response for:', transcript);
      const response = await this.config.responseGenerator(transcript);
      console.log('[VoicePipeline] Response:', response);

      // Store the response
      useJarvisStore.getState().setLastResponse(response);

      // Speak the response
      this.tts.speak(response);
      // Note: TTS callbacks will handle state transitions
    } catch (error) {
      console.error('[VoicePipeline] Error generating response:', error);
      this.handleError(error instanceof Error ? error : new Error('Failed to generate response'));
    }
  }

  private handleError(error: Error): void {
    console.error('[VoicePipeline] Error:', error.message);

    // Store error in state
    useJarvisStore.getState().setError(error.message);

    // Speak error message if configured
    if (this.config.speakErrors) {
      this.tts.speak("I'm sorry, something went wrong. Please try again.");
    } else {
      this.setState('idle');
    }
  }
}
