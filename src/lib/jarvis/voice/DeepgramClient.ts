/**
 * DeepgramClient - Browser-side STT client
 *
 * Connects to /api/jarvis/stt via SSE for receiving transcripts
 * Uses MediaRecorder to capture audio from MicrophoneCapture's MediaStream
 * POSTs audio chunks to server
 * Emits transcript events via callbacks
 */

import type { STTCallbacks, STTConfig, TranscriptResult } from './types';

// Generate unique session ID
function generateSessionId(): string {
  return `stt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class DeepgramClient {
  private sessionId: string;
  private config: Required<STTConfig>;
  private callbacks: STTCallbacks;

  private eventSource: EventSource | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isRunning = false;

  // Track connection state
  private isConnected = false;
  private audioQueue: ArrayBuffer[] = [];

  constructor(callbacks: STTCallbacks, config: STTConfig = {}) {
    this.sessionId = generateSessionId();
    this.callbacks = callbacks;
    this.config = {
      model: config.model || 'nova-3',
      language: config.language || 'en-US',
      interimResults: config.interimResults ?? true,
      smartFormat: config.smartFormat ?? true,
    };
  }

  /**
   * Start STT session with audio from MediaStream
   *
   * @param mediaStream - MediaStream from MicrophoneCapture (or getUserMedia)
   */
  async start(mediaStream: MediaStream): Promise<void> {
    if (this.isRunning) {
      console.warn('[DeepgramClient] Already running');
      return;
    }

    this.isRunning = true;
    this.audioQueue = [];
    this.isConnected = false;

    console.log(`[DeepgramClient] Starting session: ${this.sessionId}`);

    // 1. Open SSE connection for receiving transcripts
    this.setupEventSource();

    // 2. Setup MediaRecorder for audio capture
    await this.setupMediaRecorder(mediaStream);
  }

  /**
   * Stop STT session and cleanup
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log(`[DeepgramClient] Stopping session: ${this.sessionId}`);
    this.isRunning = false;

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    // Close SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Request server cleanup
    this.cleanupServerSession();

    this.isConnected = false;
    this.audioQueue = [];
    this.callbacks.onClose?.();
  }

  /**
   * Check if client is currently running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get current session ID
   */
  get session(): string {
    return this.sessionId;
  }

  /**
   * Setup EventSource for receiving transcripts via SSE
   */
  private setupEventSource(): void {
    const params = new URLSearchParams({
      sessionId: this.sessionId,
      model: this.config.model,
      language: this.config.language,
    });

    const url = `/api/jarvis/stt?${params}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleSSEMessage(data);
      } catch (err) {
        console.error('[DeepgramClient] Failed to parse SSE message:', err);
      }
    };

    this.eventSource.onerror = (err) => {
      console.error('[DeepgramClient] SSE error:', err);
      if (this.isRunning) {
        this.callbacks.onError(new Error('SSE connection error'));
        this.stop();
      }
    };
  }

  /**
   * Handle incoming SSE messages
   */
  private handleSSEMessage(data: {
    type: string;
    transcript?: string;
    isFinal?: boolean;
    speechFinal?: boolean;
    confidence?: number;
    words?: TranscriptResult['words'];
    error?: string;
  }): void {
    switch (data.type) {
      case 'connected':
        console.log('[DeepgramClient] SSE connected');
        break;

      case 'open':
        console.log('[DeepgramClient] Deepgram connection opened');
        this.isConnected = true;
        this.callbacks.onOpen?.();
        // Flush queued audio chunks
        this.flushAudioQueue();
        break;

      case 'transcript':
        if (data.transcript) {
          const result: TranscriptResult = {
            transcript: data.transcript,
            isFinal: data.isFinal || false,
            speechFinal: data.speechFinal || false,
            confidence: data.confidence || 0,
            words: data.words,
          };
          this.callbacks.onTranscript(result);
        }
        break;

      case 'utterance_end':
        // Could emit additional event if needed
        console.log('[DeepgramClient] Utterance end detected');
        break;

      case 'error':
        console.error('[DeepgramClient] Server error:', data.error);
        this.callbacks.onError(new Error(data.error || 'Unknown server error'));
        break;

      case 'close':
        console.log('[DeepgramClient] Deepgram connection closed');
        this.isConnected = false;
        if (this.isRunning) {
          this.stop();
        }
        break;

      default:
        console.log('[DeepgramClient] Unknown message type:', data.type);
    }
  }

  /**
   * Setup MediaRecorder for audio capture
   */
  private async setupMediaRecorder(mediaStream: MediaStream): Promise<void> {
    // Check for supported MIME types
    // webm/opus is widely supported and efficient
    // linear16 (PCM) would be better for Deepgram but needs conversion
    const mimeType = this.getSupportedMimeType();

    if (!mimeType) {
      throw new Error('No supported audio MIME type found');
    }

    console.log(`[DeepgramClient] Using MIME type: ${mimeType}`);

    this.mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType,
      audioBitsPerSecond: 128000,
    });

    // Send audio chunks as they become available
    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.isRunning) {
        const audioBuffer = await event.data.arrayBuffer();

        if (this.isConnected) {
          await this.sendAudioChunk(audioBuffer);
        } else {
          // Queue audio until Deepgram connection is ready
          this.audioQueue.push(audioBuffer);
        }
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[DeepgramClient] MediaRecorder error:', event);
      this.callbacks.onError(new Error('MediaRecorder error'));
    };

    // Start recording with 100ms chunks for low latency
    this.mediaRecorder.start(100);
    console.log('[DeepgramClient] MediaRecorder started');
  }

  /**
   * Get a supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string | null {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return null;
  }

  /**
   * Send audio chunk to server
   */
  private async sendAudioChunk(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const response = await fetch('/api/jarvis/stt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Session-Id': this.sessionId,
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[DeepgramClient] Failed to send audio:', error);
      }
    } catch (err) {
      console.error('[DeepgramClient] Network error sending audio:', err);
    }
  }

  /**
   * Flush queued audio chunks after connection opens
   */
  private async flushAudioQueue(): Promise<void> {
    console.log(`[DeepgramClient] Flushing ${this.audioQueue.length} queued chunks`);

    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift();
      if (chunk) {
        await this.sendAudioChunk(chunk);
      }
    }
  }

  /**
   * Request server to cleanup session
   */
  private async cleanupServerSession(): Promise<void> {
    try {
      await fetch(`/api/jarvis/stt?sessionId=${this.sessionId}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore cleanup errors
    }
  }
}
