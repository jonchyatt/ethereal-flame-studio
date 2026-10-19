/**
 * Node.js client for the Whisper transcription service.
 * Provides audio transcription and video description generation.
 *
 * Phase 4, Plan 04-04
 */

import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import FormData from 'form-data';

const WHISPER_URL = process.env.WHISPER_SERVICE_URL || 'http://localhost:8001';

/**
 * Result from Whisper transcription.
 */
export interface TranscriptionResult {
  text: string;
  language: string;
  durationSeconds: number;
  segmentsCount: number;
  /** Timed lines; empty when talking to an older service that returns text only. */
  segments: Array<{ startSec: number; endSec: number; text: string }>;
}

function parseResult(result: any): TranscriptionResult {
  return {
    text: result.text,
    language: result.language,
    durationSeconds: result.duration_seconds,
    segmentsCount: result.segments_count,
    segments: Array.isArray(result.segments)
      ? result.segments.map((s: any) => ({ startSec: Number(s.start), endSec: Number(s.end), text: String(s.text ?? '') }))
      : [],
  };
}

/** Uploads bytes already in memory (e.g. read from the storage adapter) to the Whisper service. */
export async function transcribeBuffer(data: Buffer, filename: string): Promise<TranscriptionResult> {
  const form = new globalThis.FormData();
  form.append('file', new Blob([new Uint8Array(data)]), filename);
  const response = await fetch(`${WHISPER_URL}/transcribe`, { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status} - ${await response.text()}`);
  }
  return parseResult(await response.json());
}

/**
 * Check if Whisper service is healthy.
 */
export async function checkWhisperHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WHISPER_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Transcribe an audio file by uploading it to the Whisper service.
 *
 * @param filePath - Path to the audio file
 * @returns Transcription result with text and metadata
 */
export async function transcribeFile(filePath: string): Promise<TranscriptionResult> {
  // Verify file exists
  await stat(filePath);

  // Create form data with file
  const form = new FormData();
  form.append('file', createReadStream(filePath));

  const response = await fetch(`${WHISPER_URL}/transcribe`, {
    method: 'POST',
    body: form as unknown as BodyInit,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Transcription failed: ${response.status} - ${error}`);
  }

  const result = await response.json();

  return parseResult(result);
}

/**
 * Transcribe an audio file by path (for files on shared volume).
 *
 * @param audioPath - Path to the audio file accessible by Whisper service
 * @returns Transcription result with text and metadata
 */
export async function transcribePath(audioPath: string): Promise<TranscriptionResult> {
  const response = await fetch(`${WHISPER_URL}/transcribe-path`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audio_path: audioPath }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Transcription failed: ${response.status} - ${error}`);
  }

  const result = await response.json();

  return parseResult(result);
}

/**
 * Generate a YouTube-friendly description from transcription.
 *
 * @param transcription - Transcription result
 * @param audioName - Name of the audio file
 * @returns Formatted video description
 */
export function formatVideoDescription(
  transcription: TranscriptionResult,
  audioName: string
): string {
  const lines = [
    `${audioName}`,
    '',
    transcription.text.slice(0, 500) + (transcription.text.length > 500 ? '...' : ''),
    '',
    `Duration: ${Math.round(transcription.durationSeconds / 60)} minutes`,
    `Language: ${transcription.language}`,
    '',
    '---',
    'Created with Ethereal Flame Studio',
  ];

  return lines.join('\n');
}

/**
 * Check if Whisper service is configured.
 */
export function isWhisperConfigured(): boolean {
  return Boolean(process.env.WHISPER_SERVICE_URL);
}
