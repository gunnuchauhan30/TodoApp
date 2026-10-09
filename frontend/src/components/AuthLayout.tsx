import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { CheckIcon } from './Icons';

export const Logo = () => (
  <Link to="/" className="inline-flex items-center gap-2.5 text-lg font-bold">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
      <CheckIcon strokeWidth={3} />
    </span>
    TaskFlow
  </Link>
);

export const AuthLayout = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <header className="flex items-center justify-between px-5 py-4 sm:px-8">
      <Logo />
      <ThemeToggle />
    </header>
    <main className="flex flex-1 items-center justify-center px-4 pb-16">
      <div className="card w-full max-w-md p-7 sm:p-9">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        {children}
      </div>
    </main>
  </div>
);
