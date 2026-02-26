import { create } from 'zustand';

interface ShellState {
  activeDomain: string;
  isChatOpen: boolean;
  isCommandPaletteOpen: boolean;
}

interface ShellActions {
  setActiveDomain: (id: string) => void;
  toggleChat: () => void;
  closeChat: () => void;
  toggleCommandPalette: () => void;
  closeCommandPalette: () => void;
}

type ShellStore = ShellState & ShellActions;

export const useShellStore = create<ShellStore>((set) => ({
  activeDomain: 'home',
  isChatOpen: false,
  isCommandPaletteOpen: false,

  setActiveDomain: (id) => set({ activeDomain: id }),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  closeChat: () => set({ isChatOpen: false }),
  toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
}));
