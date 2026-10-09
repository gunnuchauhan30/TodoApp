interface Props {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}

export const Pagination = ({ page, pages, total, onChange }: Props) => {
  if (pages <= 1)
    return (
      <p className="mt-4 text-center text-xs text-slate-500">
        {total} todo{total === 1 ? '' : 's'}
      </p>
    );

  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1
  );

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Page {page} of {pages} · {total} todos
      </p>
      <div className="flex items-center gap-1.5">
        <button className="btn-ghost !px-3 !py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5">
            {i > 0 && n - nums[i - 1] > 1 && <span className="text-slate-400">…</span>}
            <button
              onClick={() => onChange(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium transition ${
                n === page
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          </span>
        ))}
        <button className="btn-ghost !px-3 !py-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
};
