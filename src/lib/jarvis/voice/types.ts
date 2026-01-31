/**
 * Voice Pipeline Type Definitions
 *
 * Types for STT (Speech-to-Text) and TTS (Text-to-Speech) integration.
 */

// STT transcript result from Deepgram
export interface TranscriptResult {
  transcript: string;
  isFinal: boolean; // Max accuracy for this segment
  speechFinal: boolean; // User finished speaking (utterance complete)
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

// STT configuration options
export interface STTConfig {
  model?: string; // Default: 'nova-3'
  language?: string; // Default: 'en-US'
  interimResults?: boolean; // Default: true
  smartFormat?: boolean; // Default: true
}

// Event callbacks for DeepgramClient
export interface STTCallbacks {
  onTranscript: (result: TranscriptResult) => void;
  onError: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

// TTS configuration
export interface TTSConfig {
  voice?: string; // Voice name (browser-dependent)
  rate?: number; // Speech rate 0.1-10, default: 1
  pitch?: number; // Pitch 0-2, default: 1
  volume?: number; // Volume 0-1, default: 1
}

// TTS callbacks
export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Voice pipeline state (extends JarvisState in 02-03)
export type VoicePipelineState =
  | 'idle' // Waiting for user action
  | 'listening' // Recording audio, sending to STT
  | 'processing' // STT complete, generating response
  | 'speaking' // TTS audio playing
  | 'error'; // Something went wrong
