'use client';

/**
 * Batch upload component.
 * Allows users to upload multiple audio files and select rendering options.
 *
 * Phase 4, Plan 04-09
 */

import { useState, useCallback } from 'react';

interface BatchStatus {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
}

interface BatchResult {
  batchId: string;
  fileCount: number;
  formatCount: number;
  totalJobs: number;
}

const TEMPLATES = [
  { id: 'flame', name: 'Ethereal Flame' },
  { id: 'mist', name: 'Ethereal Mist' },
];

const FORMATS = [
  { id: '1080p', name: '1080p (16:9)' },
  { id: '1080p_vertical', name: '1080p (9:16)' },
  { id: '4k', name: '4K (16:9)' },
  { id: '360mono', name: '360 Mono' },
  { id: '360stereo', name: '360 Stereo (VR)' },
];

export function BatchUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [template, setTemplate] = useState('flame');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['1080p']);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [status, setStatus] = useState<BatchStatus | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError(null);
    }
  }, []);

  const handleFormatToggle = useCallback((formatId: string) => {
    setSelectedFormats(prev =>
      prev.includes(formatId)
        ? prev.filter(f => f !== formatId)
        : [...prev, formatId]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) {
      setError('Please select at least one audio file');
      return;
    }

    if (selectedFormats.length === 0) {
      setError('Please select at least one output format');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('template', template);
      selectedFormats.forEach(format => formData.append('formats', format));

      const response = await fetch('/api/batch', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
      setFiles([]); // Clear files after successful upload

      // Start polling for status
      pollStatus(data.batchId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [files, template, selectedFormats]);

  const pollStatus = useCallback(async (batchId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/batch/${batchId}`);
        const data = await response.json();
        setStatus(data.status);

        // Continue polling if jobs are still processing
        if (data.status.pending > 0 || data.status.processing > 0) {
          setTimeout(poll, 2000);
        }
      } catch (err) {
        console.error('Status poll failed:', err);
      }
    };

    poll();
  }, []);

  return (
    <div className="p-6 bg-black/50 backdrop-blur-md rounded-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-white mb-4">Batch Render</h2>

      {/* File Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">Audio Files</label>
        <input
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileChange}
          className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
        />
        {files.length > 0 && (
          <p className="text-sm text-gray-400 mt-1">{files.length} file(s) selected</p>
        )}
      </div>

      {/* Template Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">Template</label>
        <select
          value={template}
          onChange={e => setTemplate(e.target.value)}
          className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700"
        >
          {TEMPLATES.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Format Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">Output Formats</label>
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map(format => (
            <label
              key={format.id}
              className="flex items-center p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={selectedFormats.includes(format.id)}
                onChange={() => handleFormatToggle(format.id)}
                className="mr-2"
              />
              <span className="text-white text-sm">{format.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isUploading || files.length === 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
      >
        {isUploading ? 'Uploading...' : `Start Batch (${files.length * selectedFormats.length} renders)`}
      </button>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/50 text-red-300 rounded">
          {error}
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="mt-4 p-3 bg-green-900/50 text-green-300 rounded">
          <p>Batch created: {result.batchId.slice(0, 8)}...</p>
          <p>{result.totalJobs} render jobs queued</p>
        </div>
      )}

      {/* Progress */}
      {status && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Progress</span>
            <span>{status.completed + status.failed} / {status.total}</span>
          </div>
          <div className="w-full bg-gray-700 rounded h-2">
            <div
              className="bg-blue-600 h-2 rounded transition-all"
              style={{ width: `${((status.completed + status.failed) / status.total) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Completed: {status.completed}</span>
            <span>Failed: {status.failed}</span>
            <span>Processing: {status.processing}</span>
          </div>
        </div>
      )}
    </div>
  );
}
