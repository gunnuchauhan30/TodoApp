import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useAuthStore } from '../store/authStore';
import { useBulk, useCreateTodo, useReorderTodos, useTags, useTodos, useUpdateTodo } from '../hooks/useTodos';
import { useDebounced } from '../hooks/useDebounced';
import { BulkAction, Todo, TodoQuery } from '../types';
import { AppHeader } from '../components/AppHeader';
import { BulkBar } from '../components/BulkBar';
import { ShortcutsModal } from '../components/ShortcutsModal';
import { TodoForm } from '../components/TodoForm';
import { TodoCard } from '../components/TodoCard';
import { TodoToolbar } from '../components/TodoToolbar';
import { TodoListSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { PlusIcon } from '../components/Icons';

const DEFAULT_QUERY: TodoQuery = {
  page: 1,
  limit: 8,
  search: '',
  status: 'all',
  priority: '',
  tag: '',
  sortBy: 'order',
  dir: ''
};

export const DashboardPage = () => {
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState<TodoQuery>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounced(searchInput);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusForm, setFocusForm] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Debounced search -> query (reset to page 1)
  useEffect(() => {
    setQuery((q) => (q.search === debouncedSearch ? q : { ...q, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } = useTodos(query);
  const { data: tags = [] } = useTags();
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const reorder = useReorderTodos();
  const bulk = useBulk(() => setSelected(new Set()));

  // Local copy so drag-and-drop feels instant (optimistic), re-synced whenever the server data changes
  const [items, setItems] = useState<Todo[]>([]);
  useEffect(() => {
    if (data) setItems(data.data);
  }, [data]);

  // Page can become empty after deleting the last item on it
  useEffect(() => {
    if (data && data.page > data.pages) setQuery((q) => ({ ...q, page: data.pages }));
  }, [data]);

  const patchQuery = useCallback(
    (patch: Partial<TodoQuery>) => setQuery((q) => ({ ...q, ...patch, page: patch.page ?? 1 })),
    []
  );
  const hasFilters = !!(
    query.search ||
    query.status !== 'all' ||
    query.priority ||
    query.tag ||
    query.sortBy !== 'order' ||
    query.dir
  );
  const clearFilters = () => {
    setSearchInput('');
    setQuery({ ...DEFAULT_QUERY, limit: query.limit });
  };

  const dragEnabled = query.sortBy === 'order' && query.dir === '' && items.length > 1;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = useMemo(() => items.map((t) => t._id), [items]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = arrayMove(items, from, to);
    setItems(next);
    reorder.mutate(next.map((t) => t._id));
  };

  const closeEdit = useCallback(() => setEditing(null), []);
  const total = data?.total ?? 0;

  // Selection is per-view: clear it whenever the list changes
  useEffect(() => setSelected(new Set()), [query]);

  const toggleSelect = useCallback(
    (id: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    []
  );
  const selectAll = useCallback(() => setSelected(new Set(items.map((t) => t._id))), [items]);
  const runBulk = (action: BulkAction, value?: string) => bulk.mutate({ ids: [...selected], action, value });

  // Keyboard shortcuts (ignored while typing in a field or when a dialog is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      const typing = el.matches?.('input, textarea, select, [contenteditable="true"]');
      if (e.key === 'Escape') {
        if (typing) return;
        setSelected(new Set());
        setShowHelp(false);
        return;
      }
      if (typing || editing || showHelp) return;
      if (e.key === 'n') {
        e.preventDefault();
        setShowForm(true);
        setFocusForm((n) => n + 1);
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('todo-search')?.focus();
      } else if (e.key === 'a') {
        e.preventDefault();
        setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((t) => t._id))));
      } else if (e.key === '?') {
        setShowHelp(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, showHelp, items]);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className={`mx-auto max-w-3xl space-y-6 px-4 py-8 ${selected.size ? 'pb-36' : ''}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi {user?.name?.split(' ')[0]} 👋</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isLoading
                ? 'Loading your tasks…'
                : `You have ${total} todo${total === 1 ? '' : 's'}${hasFilters ? ' matching your filters' : ''}.`}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
            <PlusIcon width={16} height={16} />
            New todo
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showForm && (
            <div className="card p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Create a new todo</h2>
              <TodoForm
                key={focusForm}
                autoFocusTitle={focusForm > 0}
                submitLabel="Add todo"
                resetOnSuccess
                onSubmit={(d) => create.mutateAsync(d)}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}
        </AnimatePresence>

        <TodoToolbar
          query={query}
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          onChange={patchQuery}
          tags={tags}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />

        {isLoading ? (
          <TodoListSkeleton />
        ) : isError ? (
          <EmptyState
            title="Couldn't load your todos"
            description="Check your connection and try again."
            action={
              <button className="btn-primary" onClick={() => refetch()}>
                Retry
              </button>
            }
          />
        ) : items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No matching todos"
              description="Try a different search or clear your filters."
              action={
                <button className="btn-ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="Nothing here yet"
              description="Add your first todo to get started — set a priority, due date, tags and a checklist."
              action={
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                  <PlusIcon width={16} height={16} />
                  Create your first todo
                </button>
              }
            />
          )
        ) : (
          <div className={`transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map((todo) => (
                      <TodoCard
                        key={todo._id}
                        todo={todo}
                        dragEnabled={dragEnabled}
                        onEdit={setEditing}
                        onTagClick={(tag) => patchQuery({ tag })}
                        selected={selected.has(todo._id)}
                        selectionActive={selected.size > 0}
                        onSelect={toggleSelect}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
            <p className="mt-3 text-center text-xs text-slate-400">
              {dragEnabled && 'Drag the ⋮⋮ handle to reorder · '}
              <button
                className="underline hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowHelp(true)}
              >
                Keyboard shortcuts (?)
              </button>
            </p>
            <Pagination
              page={data?.page ?? 1}
              pages={data?.pages ?? 1}
              total={total}
              onChange={(page) => patchQuery({ page })}
            />
          </div>
        )}
      </main>

      <Modal open={!!editing} title="Edit todo" onClose={closeEdit}>
        {editing && (
          <TodoForm
            initial={editing}
            submitLabel="Save changes"
            onCancel={closeEdit}
            onSubmit={async (d) => {
              await update.mutateAsync({ id: editing._id, data: d });
              closeEdit();
            }}
          />
        )}
      </Modal>

      <ShortcutsModal open={showHelp} onClose={() => setShowHelp(false)} />

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          pageSize={items.length}
          busy={bulk.isPending}
          onAction={runBulk}
          onSelectAll={selectAll}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  );
};
