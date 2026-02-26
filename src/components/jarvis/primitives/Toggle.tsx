'use client';

type ToggleSize = 'sm' | 'md';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: ToggleSize;
}

const trackSizes: Record<ToggleSize, string> = {
  sm: 'w-8 h-5',
  md: 'w-10 h-6',
};

const thumbSizes: Record<ToggleSize, { className: string; onTranslate: string; offTranslate: string }> = {
  sm: { className: 'w-4 h-4', onTranslate: 'translateX(0.8125rem)', offTranslate: 'translateX(0.125rem)' },
  md: { className: 'w-5 h-5', onTranslate: 'translateX(1.125rem)', offTranslate: 'translateX(0.125rem)' },
};

const spring = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function Toggle({ checked, onChange, disabled = false, size = 'md' }: ToggleProps) {
  const thumb = thumbSizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex items-center rounded-full
        ${trackSizes[size]}
        ${checked ? 'bg-cyan-600' : 'bg-zinc-700'}
        ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}
        transition-colors duration-200
      `.trim().replace(/\s+/g, ' ')}
    >
      <span
        className={`
          rounded-full shadow-md
          ${thumb.className}
          ${checked ? 'bg-white' : 'bg-zinc-400'}
        `.trim().replace(/\s+/g, ' ')}
        style={{
          transform: checked ? thumb.onTranslate : thumb.offTranslate,
          transition: `all 200ms ${spring}`,
        }}
      />
    </button>
  );
}
