import { useThemeStore } from '../store/themeStore';
import { MoonIcon, SunIcon } from './Icons';

export const ThemeToggle = () => {
  const { theme, toggle } = useThemeStore();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="btn-ghost !p-2.5"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};
