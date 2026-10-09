import { Todo } from '../types';

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ISO string -> value for <input type="date"> (yyyy-mm-dd, local time)
export const toDateInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// <input type="date"> value -> ISO at local midnight (null when empty)
export const fromDateInput = (value: string): string | null =>
  value ? new Date(`${value}T00:00:00`).toISOString() : null;

export const isOverdue = (todo: Pick<Todo, 'dueDate' | 'completed'>): boolean =>
  !todo.completed && !!todo.dueDate && new Date(todo.dueDate) < startOfToday();

export const dueLabel = (iso: string): string => {
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000);
  const short = due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff < 0) return `Overdue · ${short}`;
  return `Due ${short}`;
};

export const formatBytes = (n: number): string =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
