import { BatchUploader } from '@/components/batch/BatchUploader';
import { NavShell } from '@/components/nav/NavShell';

export const metadata = {
  title: 'Batch Render - Ethereal Flame Studio',
  description: 'Batch process multiple audio files into videos',
};

export default function BatchPage() {
  return (
    <NavShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Batch Render</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Upload multiple audio files and render them overnight. Notifications when complete.
          </p>
        </div>

        <BatchUploader />

        <div className="rounded-xl border border-white/8 bg-white/3 p-5">
          <h2 className="text-sm font-medium text-white mb-3">How it works</h2>
          <ol className="text-zinc-400 space-y-1.5 list-decimal list-inside text-sm">
            <li>Select your audio files (MP3, WAV, OGG)</li>
            <li>Choose a visual template (Flame or Mist)</li>
            <li>Select output formats (multiple allowed)</li>
            <li>Click &quot;Start Batch&quot; to queue renders</li>
            <li>Push notification when complete</li>
            <li>Videos sync to Google Drive automatically</li>
          </ol>
        </div>
      </div>
    </NavShell>
  );
}
