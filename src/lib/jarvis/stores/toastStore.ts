import { create } from 'zustand';

export interface ToastItem {
  id: string;
  variant: 'success' | 'error' | 'info' | 'warning';
  message: string;
  action?: { label: string; onClick: () => void };
  duration: number;
  createdAt: number;
}

type AddToastOpts = {
  variant: ToastItem['variant'];
  message: string;
  action?: ToastItem['action'];
  duration?: number;
};

interface ToastState {
  toasts: ToastItem[];
  addToast: (opts: AddToastOpts) => string;
  removeToast: (id: string) => void;
}

const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();
let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (opts) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const duration = opts.duration ?? 4000;
    const item: ToastItem = { ...opts, id, duration, createdAt: Date.now() };

    set((s) => {
      const toasts = s.toasts.length >= 5 ? s.toasts.slice(1) : s.toasts;
      return { toasts: [...toasts, item] };
    });

    const timeout = setTimeout(() => {
      get().removeToast(id);
    }, duration);
    timeoutMap.set(id, timeout);

    return id;
  },

  removeToast: (id) => {
    const existing = timeoutMap.get(id);
    if (existing) {
      clearTimeout(existing);
      timeoutMap.delete(id);
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (message: string, opts?: Omit<AddToastOpts, 'variant' | 'message'>) =>
    useToastStore.getState().addToast({ variant: 'success', message, ...opts }),
  error: (message: string, opts?: Omit<AddToastOpts, 'variant' | 'message'>) =>
    useToastStore.getState().addToast({ variant: 'error', message, ...opts }),
  info: (message: string, opts?: Omit<AddToastOpts, 'variant' | 'message'>) =>
    useToastStore.getState().addToast({ variant: 'info', message, ...opts }),
  warning: (message: string, opts?: Omit<AddToastOpts, 'variant' | 'message'>) =>
    useToastStore.getState().addToast({ variant: 'warning', message, ...opts }),
};
