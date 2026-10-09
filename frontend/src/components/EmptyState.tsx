import { ReactNode } from 'react';
import { InboxIcon } from './Icons';

interface Props {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: Props) => (
  <div className="card flex flex-col items-center px-6 py-14 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
      <InboxIcon width={30} height={30} />
    </div>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);
