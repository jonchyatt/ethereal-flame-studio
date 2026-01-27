'use client';

import { useState, ReactNode } from 'react';

interface ParameterGroupProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ParameterGroup({
  title,
  defaultOpen = false,
  children,
}: ParameterGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full px-3 py-2.5
          flex justify-between items-center
          bg-white/5 hover:bg-white/10
          transition-colors
        "
      >
        <span className="text-white/80 text-sm font-medium">{title}</span>
        <svg
          className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 bg-black/20">
          {children}
        </div>
      )}
    </div>
  );
}
