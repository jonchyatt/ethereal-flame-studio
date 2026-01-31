/**
 * MicrophoneCapture - Browser audio capture with real-time amplitude analysis
 *
 * Features:
 * - RMS amplitude calculation (more accurate than peak)
 * - Latency instrumentation (logs capture start time)
 * - Singleton pattern for app-wide access
 * - Store integration (setAudioLevel, setIsCapturing)
 * - Clean resource cleanup on stop()
 */

import { useJarvisStore } from '../stores/jarvisStore';

// Latency instrumentation data
interface CaptureTimings {
  requestStart: number;
  streamReady: number;
  firstSample: number | null;
}

export class MicrophoneCapture {
  private static instance: MicrophoneCapture | null = null;

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private timingData: Float32Array<ArrayBuffer> | null = null;

  private timings: CaptureTimings = {
    requestStart: 0,
    streamReady: 0,
    firstSample: null,
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MicrophoneCapture {
    if (!MicrophoneCapture.instance) {
      MicrophoneCapture.instance = new MicrophoneCapture();
    }
    return MicrophoneCapture.instance;
  }

  /**
   * Check if browser supports audio capture
   */
  static isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      window.AudioContext
    );
  }

  /**
   * Check current microphone permission state
   * Returns: 'granted' | 'denied' | 'prompt'
   */
  static async checkPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      // Fallback: assume prompt if permissions API not available
      return 'prompt';
    }
    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      return result.state;
    } catch {
      // Some browsers don't support microphone permission query
      return 'prompt';
    }
  }

  /**
   * Request microphone permission and initialize audio capture
   * Does NOT start the analysis loop - call start() after this
   */
  async requestPermission(): Promise<boolean> {
    this.timings.requestStart = performance.now();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.timings.streamReady = performance.now();
      const latency = this.timings.streamReady - this.timings.requestStart;
      console.log(
        `[MicrophoneCapture] Permission granted. Stream ready in ${latency.toFixed(1)}ms`
      );

      // Initialize audio context
      this.audioContext = new AudioContext();

      // Create analyser with appropriate FFT size for amplitude
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256; // Smaller FFT for faster response
      this.analyserNode.smoothingTimeConstant = 0.3; // Moderate smoothing

      // Pre-allocate timing data buffer
      this.timingData = new Float32Array(this.analyserNode.fftSize);

      // Connect source -> analyser
      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream
      );
      this.sourceNode.connect(this.analyserNode);

      // Update store
      useJarvisStore.getState().setAudioPermissionGranted(true);

      return true;
    } catch (error) {
      console.error('[MicrophoneCapture] Permission denied:', error);
      useJarvisStore.getState().setAudioPermissionGranted(false);
      return false;
    }
  }

  /**
   * Start audio capture and amplitude analysis loop
   */
  start(): void {
    if (!this.analyserNode || !this.timingData) {
      console.warn('[MicrophoneCapture] Not initialized. Call requestPermission first.');
      return;
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    useJarvisStore.getState().setIsCapturing(true);
    useJarvisStore.getState().setOrbState('listening');

    const captureStartTime = performance.now();
    console.log(`[MicrophoneCapture] Capture started at ${captureStartTime.toFixed(1)}ms`);

    this.analyzeLoop();
  }

  /**
   * Stop audio capture
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    useJarvisStore.getState().setIsCapturing(false);
    useJarvisStore.getState().setAudioLevel(0);
    useJarvisStore.getState().setOrbState('idle');

    console.log('[MicrophoneCapture] Capture stopped');
  }

  /**
   * Full cleanup - release all resources
   */
  cleanup(): void {
    this.stop();

    // Disconnect audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.timingData = null;
    useJarvisStore.getState().setAudioPermissionGranted(false);

    console.log('[MicrophoneCapture] Cleanup complete');
  }

  /**
   * Calculate RMS (Root Mean Square) amplitude
   * More accurate than peak detection for perceived loudness
   */
  private calculateRMS(): number {
    if (!this.timingData) return 0;
    let sum = 0;
    for (let i = 0; i < this.timingData.length; i++) {
      sum += this.timingData[i] * this.timingData[i];
    }
    return Math.sqrt(sum / this.timingData.length);
  }

  /**
   * Main analysis loop - runs every animation frame while capturing
   */
  private analyzeLoop = (): void => {
    if (!this.analyserNode || !this.timingData) return;

    // Get time domain data (waveform)
    this.analyserNode.getFloatTimeDomainData(this.timingData);

    // Log first sample timing for latency measurement
    if (this.timings.firstSample === null) {
      this.timings.firstSample = performance.now();
      const totalLatency = this.timings.firstSample - this.timings.requestStart;
      console.log(
        `[MicrophoneCapture] First audio sample at ${this.timings.firstSample.toFixed(1)}ms (total latency: ${totalLatency.toFixed(1)}ms)`
      );
    }

    // Calculate RMS amplitude (0 to ~0.5 range typically)
    const rms = this.calculateRMS();

    // Normalize to 0-1 range with some headroom
    // Typical speech is 0.05-0.3 RMS, so multiply to use full range
    const normalizedLevel = Math.min(1, rms * 4);

    // Update store
    useJarvisStore.getState().setAudioLevel(normalizedLevel);

    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.analyzeLoop);
  };

  /**
   * Get current capture state
   */
  isCapturing(): boolean {
    return useJarvisStore.getState().isCapturing;
  }

  /**
   * Check if permission has been granted
   */
  hasPermission(): boolean {
    return useJarvisStore.getState().isAudioPermissionGranted;
  }

  /**
   * Get the current MediaStream (for use with STT)
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }
}
