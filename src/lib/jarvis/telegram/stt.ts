/**
 * Telegram STT helpers
 *
 * Transcribe short audio buffers from Telegram voice notes.
 * Uses Deepgram if configured, otherwise falls back to Whisper service.
 */

import { randomUUID } from 'crypto';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { transcribeFile, isWhisperConfigured } from '@/lib/services/whisperClient';

const DEEPGRAM_ENDPOINT =
  'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true';

export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (process.env.DEEPGRAM_API_KEY) {
    return transcribeWithDeepgram(buffer, mimeType);
  }

  if (isWhisperConfigured()) {
    return transcribeWithWhisper(buffer);
  }

  throw new Error('No STT service configured');
}

async function transcribeWithDeepgram(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY is not set');
  }

  const response = await fetch(DEEPGRAM_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/ogg',
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Deepgram STT failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
    };
  };

  const transcript =
    payload.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

  return transcript.trim();
}

async function transcribeWithWhisper(buffer: Buffer): Promise<string> {
  const fileName = `jarvis-telegram-${randomUUID()}.ogg`;
  const filePath = join(tmpdir(), fileName);

  await writeFile(filePath, buffer);
  try {
    const result = await transcribeFile(filePath);
    return result.text.trim();
  } finally {
    await unlink(filePath).catch(() => {});
  }
}
