import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const apply = (theme: Theme) => document.documentElement.classList.toggle('dark', theme === 'dark');

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        apply(next);
        set({ theme: next });
      }
    }),
    { name: 'theme-storage', onRehydrateStorage: () => (state) => state && apply(state.theme) }
  )
);
