import { spawn } from 'child_process';
import type { AudioMetadata } from './types';

export async function probeAudio(filePath: string): Promise<AudioMetadata> {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-select_streams', 'a:0',
    filePath,
  ];

  const result = await runProcess('ffprobe', args);
  const data = JSON.parse(result);

  const stream = data.streams?.[0];
  const format = data.format;

  if (!stream) {
    throw new Error(`No audio stream found in ${filePath}`);
  }

  const duration = parseFloat(format?.duration ?? stream?.duration ?? '0');
  const sampleRate = parseInt(stream?.sample_rate ?? '0', 10);
  const bitrate = parseInt(format?.bit_rate ?? stream?.bit_rate ?? '0', 10);

  return {
    duration: Number.isFinite(duration) ? duration : 0,
    sampleRate: Number.isFinite(sampleRate) ? sampleRate : 0,
    channels: stream?.channels ?? 0,
    codec: stream?.codec_name ?? 'unknown',
    bitrate: Number.isFinite(bitrate) ? bitrate : 0,
    format: format?.format_name ?? 'unknown',
  };
}

function runProcess(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited with code ${code}: ${stderr}`));
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run ${command}: ${err.message}`));
    });
  });
}
