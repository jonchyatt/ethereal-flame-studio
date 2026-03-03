/**
 * TTS API Route
 *
 * Primary: ElevenLabs (eleven_turbo_v2_5, voice from ELEVENLABS_VOICE_ID env).
 * Fallback: AWS Polly neural (Matthew), used if ElevenLabs is not configured or fails.
 * Returns MP3 audio for browser playback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

export const maxDuration = 15;

// ── Polly lazy singleton ──────────────────────────────────────────────────────

let _polly: PollyClient | null = null;
function getPollyClient(): PollyClient {
  if (!_polly) {
    _polly = new PollyClient({
      region: process.env.AWS_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return _polly;
}

const POLLY_DEFAULT_VOICE = 'Matthew';

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (text.length > 3000) {
      return NextResponse.json(
        { error: 'Text too long (max 3000 characters)' },
        { status: 400 }
      );
    }

    // ── ElevenLabs primary ────────────────────────────────────────────────────
    const elApiKey = process.env.ELEVENLABS_API_KEY;
    const elVoiceId = process.env.ELEVENLABS_VOICE_ID;

    if (elApiKey && elVoiceId) {
      try {
        const elRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': elApiKey,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        );

        if (elRes.ok) {
          const buffer = await elRes.arrayBuffer();
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': String(buffer.byteLength),
            },
          });
        }

        // Log and fall through to Polly
        const errBody = await elRes.text().catch(() => '(unreadable)');
        console.error(`[TTS] ElevenLabs failed (${elRes.status}), falling back to Polly:`, errBody);
      } catch (elErr) {
        console.error('[TTS] ElevenLabs error, falling back to Polly:', elErr);
      }
    }

    // ── Polly fallback ────────────────────────────────────────────────────────
    const command = new SynthesizeSpeechCommand({
      Engine: 'neural',
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: voice || POLLY_DEFAULT_VOICE,
      TextType: 'text',
    });

    const pollyRes = await getPollyClient().send(command);

    if (!pollyRes.AudioStream) {
      throw new Error('No audio stream returned from Polly');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of pollyRes.AudioStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    const message = error instanceof Error ? error.message : 'TTS failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
