'use client';

import { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadState {
  /** Upload progress 0-100. */
  progress: number;
  /** Current phase of the upload flow. */
  status: 'idle' | 'requesting-url' | 'uploading' | 'complete' | 'error';
  /** Error message when status is 'error'. */
  error: string | null;
  /** Storage key once upload starts. */
  key: string | null;
}

export interface UseStorageUploadOptions {
  /** Called when the upload completes successfully. */
  onComplete?: (key: string) => void;
  /** Called when the upload fails. */
  onError?: (error: string) => void;
}

const INITIAL_STATE: UploadState = {
  progress: 0,
  status: 'idle',
  error: null,
  key: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook for uploading files to storage with XHR-based progress tracking.
 *
 * Uses a two-step flow:
 *   1. POST /api/storage/upload to get a presigned/local upload URL
 *   2. PUT the file to that URL via XMLHttpRequest (for progress events)
 *
 * `fetch()` does not support upload progress (ReadableStream upload is not
 * widely supported), so we use XHR for step 2.
 */
export function useStorageUpload(options?: UseStorageUploadOptions) {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  // Stable reference to options to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const upload = useCallback(async (file: File, key: string): Promise<string> => {
    // Reset state at start
    setState({ progress: 0, status: 'requesting-url', error: null, key });

    // Step 1: Request presigned / upload URL
    let uploadUrl: string;
    let method: string;

    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error?.message || `Upload URL request failed: ${res.status}`;
        setState((s) => ({ ...s, status: 'error', error: msg }));
        optionsRef.current?.onError?.(msg);
        throw new Error(msg);
      }

      const { data } = await res.json();
      uploadUrl = data.uploadUrl;
      method = data.method || 'PUT';
    } catch (err) {
      // If we already set error state above, just rethrow
      if (err instanceof Error && state.status !== 'error') {
        const msg = err.message || 'Failed to request upload URL';
        setState((s) => ({ ...s, status: 'error', error: msg }));
        optionsRef.current?.onError?.(msg);
      }
      throw err;
    }

    // Step 2: Upload file via XHR for progress tracking
    setState((s) => ({ ...s, status: 'uploading', progress: 0 }));

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setState((s) => ({ ...s, progress: pct }));
        }
      });

      xhr.addEventListener('load', () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          setState((s) => ({ ...s, status: 'complete', progress: 100 }));
          optionsRef.current?.onComplete?.(key);
          resolve(key);
        } else {
          const error = `Upload failed: ${xhr.status} ${xhr.statusText}`;
          setState((s) => ({ ...s, status: 'error', error }));
          optionsRef.current?.onError?.(error);
          reject(new Error(error));
        }
      });

      xhr.addEventListener('error', () => {
        xhrRef.current = null;
        const error = 'Upload failed: network error';
        setState((s) => ({ ...s, status: 'error', error }));
        optionsRef.current?.onError?.(error);
        reject(new Error(error));
      });

      xhr.addEventListener('abort', () => {
        xhrRef.current = null;
        const error = 'Upload cancelled';
        setState((s) => ({ ...s, status: 'error', error }));
        optionsRef.current?.onError?.(error);
        reject(new Error(error));
      });

      xhr.open(method, uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }, []);

  const reset = useCallback(() => {
    // Abort any in-flight upload
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  return {
    upload,
    reset,
    progress: state.progress,
    status: state.status,
    error: state.error,
    key: state.key,
  };
}
