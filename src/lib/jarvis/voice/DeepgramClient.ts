/**
 * DeepgramClient - Browser-side STT client
 *
 * Connects to /api/jarvis/stt via SSE for receiving transcripts
 * Uses Web Audio API (ScriptProcessorNode) to capture raw PCM audio
 * POSTs audio chunks to server as linear16
 * Emits transcript events via callbacks
 */

import type { STTCallbacks, STTConfig, TranscriptResult } from './types';
import { postBinaryJarvisAPI, deleteJarvisAPI, buildSSEUrl } from '../api/fetchWithAuth';

// Generate unique session ID
function generateSessionId(): string {
  return `stt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Convert Float32Array samples to Int16 linear PCM
function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Downsample audio to target sample rate
function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const index = Math.round(i * ratio);
    result[i] = buffer[index];
  }
  return result;
}

export class DeepgramClient {
  private sessionId: string;
  private config: Required<STTConfig>;
  private callbacks: STTCallbacks;

  private eventSource: EventSource | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRunning = false;

  // Track connection state
  private isConnected = false;
  private audioQueue: ArrayBuffer[] = [];

  // Target sample rate for Deepgram
  private readonly TARGET_SAMPLE_RATE = 16000;

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

    // 2. Setup Web Audio API for raw PCM capture
    await this.setupAudioCapture(mediaStream);
  }

  /**
   * Stop STT session and cleanup
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log(`[DeepgramClient] Stopping session: ${this.sessionId}`);
    this.isRunning = false;

    // Stop audio processing
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

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
    // Build authenticated SSE URL (includes _secret query param)
    const url = buildSSEUrl('/api/jarvis/stt', {
      sessionId: this.sessionId,
      model: this.config.model,
      language: this.config.language,
    });
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
   * Setup Web Audio API for raw PCM capture
   * Uses ScriptProcessorNode to get raw audio samples
   */
  private async setupAudioCapture(mediaStream: MediaStream): Promise<void> {
    // Create audio context
    this.audioContext = new AudioContext();
    const inputSampleRate = this.audioContext.sampleRate;

    console.log(`[DeepgramClient] Audio context sample rate: ${inputSampleRate}Hz`);

    // Create source from media stream
    this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream);

    // Create processor node (buffer size 4096 gives ~93ms chunks at 44.1kHz)
    // Using 4096 for balance between latency and efficiency
    const bufferSize = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    // Process audio samples
    this.processorNode.onaudioprocess = (event) => {
      if (!this.isRunning) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Downsample to 16kHz
      const downsampled = downsampleBuffer(
        inputData,
        inputSampleRate,
        this.TARGET_SAMPLE_RATE
      );

      // Convert to 16-bit PCM
      const pcmData = floatTo16BitPCM(downsampled);

      if (this.isConnected) {
        this.sendAudioChunk(pcmData);
      } else {
        // Queue audio until Deepgram connection is ready
        this.audioQueue.push(pcmData);
      }
    };

    // Connect: source -> processor -> destination (required for processing to work)
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    console.log('[DeepgramClient] Audio capture started (raw PCM, 16kHz, 16-bit)');
  }

  /**
   * Send audio chunk to server
   */
  private async sendAudioChunk(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      // Use authenticated binary POST
      const response = await postBinaryJarvisAPI(
        '/api/jarvis/stt',
        audioBuffer,
        'application/octet-stream',
        { 'X-Session-Id': this.sessionId }
      );

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
      // Use authenticated DELETE
      await deleteJarvisAPI(`/api/jarvis/stt?sessionId=${this.sessionId}`);
    } catch {
      // Ignore cleanup errors
    }
  }
}
