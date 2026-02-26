'use client';

import { useToastStore } from '@/lib/jarvis/stores/toastStore';
import { Toast } from '../primitives/Toast';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  const visible = toasts.slice(-3);

  return (
    <>
      {/* Keyframes for toast animations */}
      <style>{`
        @keyframes jarvis-toast-enter {
          from { transform: translateY(-16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes jarvis-toast-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {visible.map((t, i) => {
          const depth = visible.length - 1 - i; // 0 = newest, higher = older
          const scale = depth === 0 ? 1 : depth === 1 ? 0.975 : 0.95;
          const opacity = depth === 0 ? 1 : depth === 1 ? 0.9 : 0.8;

          return (
            <div
              key={t.id}
              style={{
                transform: `scale(${scale})`,
                opacity,
                animation: 'jarvis-toast-enter 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
            >
              <Toast
                variant={t.variant}
                message={t.message}
                action={t.action}
                duration={t.duration}
                onDismiss={() => removeToast(t.id)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
