import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../hooks/useAuth';
import { Logo } from './AuthLayout';
import { ThemeToggle } from './ThemeToggle';
import { LogoutIcon } from './Icons';

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export const AppHeader = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Logo />
        <nav className="order-last flex w-full gap-1 sm:order-none sm:w-auto" aria-label="Main">
          <NavLink to="/dashboard" className={link}>
            Todos
          </NavLink>
          <NavLink to="/trash" className={link}>
            Trash
          </NavLink>
          <NavLink to="/profile" className={link}>
            Profile
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <span className="mr-1 hidden max-w-[10rem] truncate text-sm text-slate-500 dark:text-slate-400 md:inline">
            {user?.name}
          </span>
          <ThemeToggle />
          <button onClick={logout} className="btn-ghost !px-3 !py-2.5" aria-label="Log out">
            <LogoutIcon />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
