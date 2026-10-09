import { useState } from 'react';
import { BulkAction, Priority } from '../types';
import { Spinner } from './Spinner';
import { TrashIcon, XIcon } from './Icons';

interface Props {
  count: number;
  pageSize: number;
  busy: boolean;
  onAction: (action: BulkAction, value?: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export const BulkBar = ({ count, pageSize, busy, onAction, onSelectAll, onClear }: Props) => {
  const [tag, setTag] = useState('');

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4" role="region" aria-label="Bulk actions">
      <div className="card flex max-w-full flex-wrap items-center gap-2 p-3 shadow-xl">
        <span className="px-1 text-sm font-semibold">{count} selected</span>
        {count < pageSize && (
          <button
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            onClick={onSelectAll}
          >
            Select all
          </button>
        )}
        <span className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

        <button className="btn-primary !px-3 !py-1.5" disabled={busy} onClick={() => onAction('complete')}>
          {busy ? <Spinner /> : '✓'} Done
        </button>
        <button className="btn-ghost !px-3 !py-1.5" disabled={busy} onClick={() => onAction('pending')}>
          Pending
        </button>

        <select
          aria-label="Set priority for selected"
          className="input !w-auto !py-1.5"
          value=""
          disabled={busy}
          onChange={(e) => e.target.value && onAction('priority', e.target.value as Priority)}
        >
          <option value="">Priority…</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div className="flex items-center gap-1">
          <input
            aria-label="Tag name"
            className="input !w-24 !py-1.5"
            placeholder="tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
          <button
            className="btn-ghost !px-2.5 !py-1.5"
            disabled={busy || !tag.trim()}
            onClick={() => onAction('addTag', tag)}
            title="Add tag to selected"
          >
            + Tag
          </button>
          <button
            className="btn-ghost !px-2.5 !py-1.5"
            disabled={busy || !tag.trim()}
            onClick={() => onAction('removeTag', tag)}
            title="Remove tag from selected"
          >
            − Tag
          </button>
        </div>

        <button className="btn-danger !px-3 !py-1.5" disabled={busy} onClick={() => onAction('delete')}>
          <TrashIcon width={14} height={14} /> Delete
        </button>
        <button
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
};
