/**
 * AWS Polly TTS API Route
 *
 * Converts text to speech using AWS Polly neural voices.
 * Returns MP3 audio stream for browser playback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

// Initialize Polly client
const polly = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Neural voices that sound natural and warm (NOT butler-like)
// Matthew = warm US male, Joanna = warm US female
const DEFAULT_VOICE = 'Matthew';

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Limit text length to prevent abuse
    if (text.length > 3000) {
      return NextResponse.json(
        { error: 'Text too long (max 3000 characters)' },
        { status: 400 }
      );
    }

    const command = new SynthesizeSpeechCommand({
      Engine: 'neural',
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: voice || DEFAULT_VOICE,
      TextType: 'text',
    });

    const response = await polly.send(command);

    if (!response.AudioStream) {
      throw new Error('No audio stream returned from Polly');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Return audio as MP3
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[TTS] Polly error:', error);

    const message = error instanceof Error ? error.message : 'TTS failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
