import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Logo } from '../components/AuthLayout';
import { ThemeToggle } from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: '🎯',
    title: 'Priorities & due dates',
    text: 'Colour-coded priorities and deadlines, with overdue todos flagged automatically.'
  },
  {
    icon: '🏷️',
    title: 'Tags & smart search',
    text: 'Slice your list by tag, status or priority and find anything instantly.'
  },
  { icon: '✅', title: 'Checklists', text: 'Break big todos into steps and watch the progress bar fill up.' },
  { icon: '↕️', title: 'Drag & drop', text: 'Reorder todos by hand — your custom order is saved.' },
  { icon: '📎', title: 'Attachments', text: 'Keep images, PDFs and notes right next to the task they belong to.' },
  { icon: '🌙', title: 'Dark mode', text: 'Easy on the eyes, day or night, and it remembers your choice.' }
];

export const HomePage = () => {
  const isAuthenticated = useAuthStore((s) => !!s.token);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="btn-ghost">
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="py-14 text-center sm:py-24">
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            Free · Fast · Private
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Get things done, <span className="text-brand-600 dark:text-brand-400">beautifully.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            TaskFlow is a modern todo app with priorities, tags, due dates, checklists and drag-and-drop — everything
            you need, nothing you don&apos;t.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="btn-primary !px-6 !py-3 text-base">
              Get started — it&apos;s free
            </Link>
            <Link to="/login" className="btn-ghost !px-6 !py-3 text-base">
              I have an account
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
