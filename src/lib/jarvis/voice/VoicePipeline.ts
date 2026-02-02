/**
 * VoicePipeline - Orchestrates STT, LLM, TTS, and state transitions
 *
 * Coordinates the complete voice flow:
 * 1. User presses PTT -> listening state
 * 2. STT transcribes speech in real-time
 * 3. User releases PTT -> processing state
 * 4. Claude generates intelligent response
 * 5. TTS speaks response -> speaking state
 * 6. Audio ends -> idle state
 *
 * Features:
 * - Barge-in support (PTT during TTS interrupts playback)
 * - Error handling with spoken feedback
 * - State machine with clear transitions
 * - Multi-turn conversation context
 * - Time awareness via system prompt
 */

import { MicrophoneCapture } from '../audio/MicrophoneCapture';
import { DeepgramClient } from './DeepgramClient';
import { SpeechClient } from './SpeechClient';
import { useJarvisStore } from '../stores/jarvisStore';
import type { VoicePipelineState, TranscriptResult, STTCallbacks, TTSCallbacks } from './types';

// Intelligence layer imports
import { ClaudeClient } from '../intelligence/ClaudeClient';
import { ConversationManager } from '../intelligence/ConversationManager';
import { MemoryStore } from '../intelligence/MemoryStore';
import { buildSystemPrompt } from '../intelligence/systemPrompt';

// Response generator type (for backwards compatibility)
type ResponseGenerator = (transcript: string) => string | Promise<string>;

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

  // Intelligence layer
  private claudeClient: ClaudeClient;
  private conversationManager: ConversationManager;
  private memoryStore: MemoryStore;

  private state: VoicePipelineState = 'idle';
  private accumulatedTranscript = '';
  private lastFinalTranscript = '';

  // Speech completion callback (for briefing flow)
  private onSpeechComplete: (() => void) | null = null;
  private pendingSpeakResolve: (() => void) | null = null;

  constructor(config: VoicePipelineConfig = {}) {
    this.mic = MicrophoneCapture.getInstance();
    this.config = {
      responseGenerator: config.responseGenerator ?? ((t) => this.generateIntelligentResponse(t)),
      minTranscriptLength: config.minTranscriptLength ?? 1,
      speakErrors: config.speakErrors ?? true,
    };

    // Initialize intelligence layer
    this.memoryStore = new MemoryStore();
    this.conversationManager = new ConversationManager(this.memoryStore);
    this.claudeClient = new ClaudeClient();

    // Initialize TTS with callbacks
    const ttsCallbacks: TTSCallbacks = {
      onStart: () => {
        console.log('[VoicePipeline] TTS started speaking');
        this.setState('speaking');
      },
      onEnd: () => {
        console.log('[VoicePipeline] TTS finished speaking');
        this.setState('idle');

        // Resolve pending speak promise
        if (this.pendingSpeakResolve) {
          this.pendingSpeakResolve();
          this.pendingSpeakResolve = null;
        }

        // Call speech complete callback
        if (this.onSpeechComplete) {
          this.onSpeechComplete();
        }
      },
      onError: (error) => {
        console.error('[VoicePipeline] TTS error:', error);
        this.handleError(error);

        // Resolve pending speak promise on error too
        if (this.pendingSpeakResolve) {
          this.pendingSpeakResolve();
          this.pendingSpeakResolve = null;
        }
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

    // Abort any in-progress Claude request
    this.claudeClient.abort();

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
   * Set response generator (for custom response logic)
   */
  setResponseGenerator(generator: ResponseGenerator): void {
    this.config.responseGenerator = generator;
  }

  /**
   * Clear conversation history (useful for starting fresh)
   */
  clearConversation(clearPersisted: boolean = false): void {
    this.conversationManager.clear(clearPersisted);
    console.log('[VoicePipeline] Conversation cleared');
  }

  /**
   * Speak text directly (for briefings and proactive speech)
   * Returns a promise that resolves when speech completes
   */
  async speak(text: string): Promise<void> {
    console.log('[VoicePipeline] Speaking (direct):', text.substring(0, 50) + '...');

    return new Promise<void>((resolve) => {
      this.pendingSpeakResolve = resolve;
      this.setState('speaking');
      this.tts.speak(text);
      useJarvisStore.getState().setLastResponse(text);
    });
  }

  /**
   * Set callback for when speech completes
   * Useful for briefing flow to know when to prompt for response
   */
  setOnSpeechComplete(callback: (() => void) | null): void {
    this.onSpeechComplete = callback;
  }

  /**
   * Stop current TTS playback
   */
  stopSpeaking(): void {
    this.tts.stop();
    this.setState('idle');
  }

  // Private methods

  /**
   * Generate an intelligent response using Claude
   */
  private async generateIntelligentResponse(transcript: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Add user message to context
      this.conversationManager.addMessage({ role: 'user', content: transcript });

      // Build context for Claude
      const messages = this.conversationManager.getContextMessages();
      const systemPrompt = buildSystemPrompt({
        currentTime: new Date(),
        keyFacts: this.conversationManager.getKeyFacts()
      });

      let fullResponse = '';

      this.claudeClient.chat(messages, systemPrompt, {
        onToken: (text) => {
          fullResponse += text;
          // Future optimization: could stream to TTS here for lower latency
        },
        onComplete: (text) => {
          // Add assistant response to conversation history
          this.conversationManager.addMessage({ role: 'assistant', content: text });

          // Check if we should summarize (for long conversations)
          if (this.conversationManager.shouldSummarize()) {
            console.log('[VoicePipeline] Conversation getting long, should summarize');
            // Note: Actual summarization can be added later
          }

          resolve(text);
        },
        onError: (error) => {
          reject(error);
        }
      });
    });
  }

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
