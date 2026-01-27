/**
 * Batch render page.
 * Provides UI for batch job submission.
 *
 * Phase 4, Plan 04-09
 */

import { BatchUploader } from '@/components/batch/BatchUploader';
import Link from 'next/link';

export const metadata = {
  title: 'Batch Render - Ethereal Flame Studio',
  description: 'Batch process multiple audio files into videos',
};

export default function BatchPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <header className="p-4 border-b border-gray-800">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-white font-semibold hover:text-blue-400">
            Ethereal Flame Studio
          </Link>
          <nav className="space-x-4">
            <Link href="/" className="text-gray-400 hover:text-white">
              Preview
            </Link>
            <Link href="/batch" className="text-white">
              Batch
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            Batch Render
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Upload multiple audio files and render them overnight.
            You will receive a notification when the batch completes.
          </p>
          <BatchUploader />
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="bg-gray-800/50 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">How it works</h2>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside">
            <li>Select your audio files (MP3, WAV, OGG)</li>
            <li>Choose a visual template (Flame or Mist)</li>
            <li>Select output formats (multiple allowed)</li>
            <li>Click &quot;Start Batch&quot; to queue renders</li>
            <li>You will receive a push notification when complete</li>
            <li>Videos sync to Google Drive automatically</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
