'use client';

import { useState, useEffect, useRef } from 'react';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useVisualStore, selectSerializableState } from '@/lib/stores/visualStore';
import { ScreenshotCaptureRef } from './ScreenshotCapture';

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotRef: React.RefObject<ScreenshotCaptureRef | null>;
}

export function SaveTemplateDialog({
  isOpen,
  onClose,
  screenshotRef,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveTemplate = useTemplateStore((state) => state.saveTemplate);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSave = async () => {
    // Validate
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a template name');
      inputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Capture thumbnail
      let thumbnail: string | undefined;
      try {
        thumbnail = await screenshotRef.current?.capture();
      } catch (err) {
        console.warn('Failed to capture thumbnail:', err);
        // Continue without thumbnail
      }

      // Get current visual state
      const settings = selectSerializableState(useVisualStore.getState());

      // Save template
      saveTemplate(trimmedName, settings, {
        description: description.trim() || undefined,
        thumbnail,
      });

      onClose();
    } catch (err) {
      setError('Failed to save template');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="
          relative z-10
          bg-slate-900 border border-white/20 rounded-xl
          p-6 w-full max-w-md
          shadow-2xl
        "
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-white text-lg font-semibold mb-4">
          Save as Template
        </h2>

        {/* Name Input */}
        <div className="mb-4">
          <label className="block text-white/70 text-sm mb-1">
            Template Name <span className="text-red-400">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Look"
            className="
              w-full px-3 py-2 rounded-lg
              bg-white/10 border border-white/20
              text-white placeholder-white/40
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            "
            maxLength={50}
          />
        </div>

        {/* Description Input */}
        <div className="mb-4">
          <label className="block text-white/70 text-sm mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this visual style..."
            rows={2}
            className="
              w-full px-3 py-2 rounded-lg
              bg-white/10 border border-white/20
              text-white placeholder-white/40
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              resize-none
            "
            maxLength={200}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="
              px-4 py-2 rounded-lg
              bg-white/10 hover:bg-white/20
              text-white/80 hover:text-white
              transition-all
              disabled:opacity-50
            "
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="
              px-4 py-2 rounded-lg
              bg-blue-600 hover:bg-blue-500
              text-white font-medium
              transition-all
              disabled:opacity-50 disabled:cursor-wait
            "
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
