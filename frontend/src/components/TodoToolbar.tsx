import { Priority, SortBy, StatusFilter, TodoQuery } from '../types';
import { SearchIcon, XIcon } from './Icons';

interface Props {
  query: TodoQuery;
  searchInput: string;
  onSearchInput: (v: string) => void;
  onChange: (patch: Partial<TodoQuery>) => void;
  tags: string[];
  hasFilters: boolean;
  onClear: () => void;
}

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Done' },
  { value: 'overdue', label: 'Overdue' }
];

const SORTS: { value: SortBy; label: string }[] = [
  { value: 'order', label: 'Custom order' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'A → Z' }
];

export const TodoToolbar = ({ query, searchInput, onSearchInput, onChange, tags, hasFilters, onClear }: Props) => (
  <div className="space-y-3">
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        id="todo-search"
        type="search"
        aria-label="Search todos"
        className="input !pl-10 !pr-9"
        placeholder="Search by title, description or tag…"
        value={searchInput}
        onChange={(e) => onSearchInput(e.target.value)}
      />
      {searchInput && (
        <button
          onClick={() => onSearchInput('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          <XIcon width={16} height={16} />
        </button>
      )}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800" role="tablist" aria-label="Status filter">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            role="tab"
            aria-selected={query.status === s.value}
            onClick={() => onChange({ status: s.value })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${query.status === s.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <select
        aria-label="Filter by priority"
        className="input !w-auto !py-2"
        value={query.priority}
        onChange={(e) => onChange({ priority: e.target.value as Priority | '' })}
      >
        <option value="">Any priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        aria-label="Filter by tag"
        className="input !w-auto !py-2"
        value={query.tag}
        onChange={(e) => onChange({ tag: e.target.value })}
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            #{t}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-2">
        <select
          aria-label="Sort by"
          className="input !w-auto !py-2"
          value={query.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value as SortBy, dir: '' })}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          className="btn-ghost !px-3 !py-2"
          aria-label="Reverse sort direction"
          title="Reverse sort direction"
          onClick={() =>
            onChange({
              dir:
                query.dir === 'asc'
                  ? 'desc'
                  : query.dir === 'desc'
                    ? 'asc'
                    : query.sortBy === 'title' || query.sortBy === 'dueDate'
                      ? 'desc'
                      : 'asc'
            })
          }
        >
          ⇅
        </button>
      </div>
    </div>

    {hasFilters && (
      <button onClick={onClear} className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
        Clear all filters
      </button>
    )}
  </div>
);
