import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppHeader } from '../components/AppHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { TodoListSkeleton } from '../components/Skeleton';
import { TrashIcon } from '../components/Icons';
import { useEmptyTrash, usePermanentDelete, useRestoreTodo, useTrash } from '../hooks/useTodos';
import { Todo } from '../types';

const deletedAgo = (iso?: string | null): string => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

export const TrashPage = () => {
  const { data: todos = [], isLoading, isError, refetch } = useTrash();
  const restore = useRestoreTodo();
  const remove = usePermanentDelete();
  const empty = useEmptyTrash();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [toDelete, setToDelete] = useState<Todo | null>(null);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Trash</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Deleted todos stay here until you restore them or delete them forever.
            </p>
          </div>
          {todos.length > 0 && (
            <button className="btn-danger" onClick={() => setConfirmEmpty(true)}>
              <TrashIcon width={16} height={16} /> Empty trash
            </button>
          )}
        </div>

        {isLoading ? (
          <TodoListSkeleton count={3} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load the trash"
            description="Check your connection and try again."
            action={
              <button className="btn-primary" onClick={() => refetch()}>
                Retry
              </button>
            }
          />
        ) : todos.length === 0 ? (
          <EmptyState
            title="Trash is empty"
            description="Todos you delete will show up here so you can undo mistakes."
          />
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {todos.map((todo) => (
                <motion.li
                  key={todo._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-700 dark:text-slate-200">{todo.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Deleted {deletedAgo(todo.deletedAt)}
                      {todo.tags.length > 0 && ` · ${todo.tags.map((t) => `#${t}`).join(' ')}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-ghost !px-3 !py-1.5"
                      disabled={restore.isPending}
                      onClick={() => restore.mutate(todo._id)}
                    >
                      ↩ Restore
                    </button>
                    <button className="btn-danger !px-3 !py-1.5" onClick={() => setToDelete(todo)}>
                      Delete forever
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>

      <ConfirmModal
        open={confirmEmpty}
        title="Empty trash?"
        confirmLabel="Delete everything"
        danger
        busy={empty.isPending}
        onClose={() => setConfirmEmpty(false)}
        onConfirm={() => empty.mutate(undefined, { onSuccess: () => setConfirmEmpty(false) })}
      >
        This permanently deletes {todos.length} todo{todos.length === 1 ? '' : 's'} (and their attachments). This cannot
        be undone.
      </ConfirmModal>

      <ConfirmModal
        open={!!toDelete}
        title="Delete forever?"
        confirmLabel="Delete forever"
        danger
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete._id, { onSuccess: () => setToDelete(null) })}
      >
        “{toDelete?.title}” will be permanently deleted. This cannot be undone.
      </ConfirmModal>
    </div>
  );
};
