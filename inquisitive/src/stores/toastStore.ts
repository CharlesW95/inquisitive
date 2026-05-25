import { create } from 'zustand';

type ToastState = {
  message: string | null;
  type: 'error' | 'info';
  showToast: (message: string, type?: 'error' | 'info') => void;
  hideToast: () => void;
};

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  type: 'error',
  showToast: (message, type = 'error') => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ message, type });
    dismissTimer = setTimeout(() => set({ message: null }), 3000);
  },
  hideToast: () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ message: null });
  },
}));
