import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { todoService } from '../services/todoService';
import { getErrorMessage } from '../lib/axios';
import { BulkAction, TodoInput, TodoQuery } from '../types';

export const useTodos = (query: TodoQuery) =>
  useQuery({
    queryKey: ['todos', query],
    queryFn: () => todoService.getTodos(query),
    placeholderData: keepPreviousData
  });

export const useTags = () => useQuery({ queryKey: ['tags'], queryFn: todoService.getTags });

// Shared: refresh lists + tag filter after any mutation
const useRefresh = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['todos'] });
    qc.invalidateQueries({ queryKey: ['tags'] });
  };
};

export const useCreateTodo = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (data: TodoInput) => todoService.createTodo(data),
    onSuccess: () => {
      refresh();
      toast.success('Todo added');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not add todo'))
  });
};

export const useUpdateTodo = (opts: { silent?: boolean } = {}) => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TodoInput> }) => todoService.updateTodo(id, data),
    onSuccess: () => {
      refresh();
      if (!opts.silent) toast.success('Todo updated');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not update todo'))
  });
};

export const useToggleTodo = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => todoService.toggleTodo(id),
    onSuccess: (res) => {
      refresh();
      if (res.nextTodo?.dueDate) {
        const when = new Date(res.nextTodo.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        toast.success(`Done ✓ — next one scheduled for ${when}`, { icon: '🔁' });
      } else {
        toast.success(res.data.completed ? 'Marked as done ✓' : 'Marked as pending');
      }
    },
    onError: (e) => toast.error(getErrorMessage(e))
  });
};

// Soft delete with an "Undo" action that restores the todo
export const useDeleteTodo = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => todoService.deleteTodo(id),
    onSuccess: (_res, id) => {
      refresh();
      toast(
        (t) => (
          <span className="flex items-center gap-3 text-sm">
            Todo deleted
            <button
              className="font-semibold text-brand-500 hover:underline"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await todoService.restoreTodo(id);
                  refresh();
                  toast.success('Todo restored');
                } catch (e) {
                  toast.error(getErrorMessage(e));
                }
              }}
            >
              Undo
            </button>
          </span>
        ),
        { duration: 6000, icon: '🗑️' }
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not delete todo'))
  });
};

export const useReorderTodos = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (ids: string[]) => todoService.reorder(ids),
    onError: (e) => {
      toast.error(getErrorMessage(e, 'Could not save new order'));
      refresh(); // roll the UI back to the server's order
    }
  });
};

export const useUploadAttachment = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => todoService.uploadAttachment(id, file),
    onSuccess: () => {
      refresh();
      toast.success('File attached');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Upload failed'))
  });
};

export const useDeleteAttachment = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      todoService.deleteAttachment(id, attachmentId),
    onSuccess: () => {
      refresh();
      toast.success('Attachment removed');
    },
    onError: (e) => toast.error(getErrorMessage(e))
  });
};

// ---------- Trash ----------
export const useTrash = () => useQuery({ queryKey: ['trash'], queryFn: todoService.getTrash });

const useRefreshTrash = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['trash'] });
    qc.invalidateQueries({ queryKey: ['todos'] });
    qc.invalidateQueries({ queryKey: ['tags'] });
  };
};

export const useRestoreTodo = () => {
  const refresh = useRefreshTrash();
  return useMutation({
    mutationFn: (id: string) => todoService.restoreTodo(id),
    onSuccess: () => {
      refresh();
      toast.success('Todo restored');
    },
    onError: (e) => toast.error(getErrorMessage(e))
  });
};

export const usePermanentDelete = () => {
  const refresh = useRefreshTrash();
  return useMutation({
    mutationFn: (id: string) => todoService.permanentDelete(id),
    onSuccess: () => {
      refresh();
      toast.success('Deleted forever');
    },
    onError: (e) => toast.error(getErrorMessage(e))
  });
};

export const useEmptyTrash = () => {
  const refresh = useRefreshTrash();
  return useMutation({
    mutationFn: () => todoService.emptyTrash(),
    onSuccess: (n) => {
      refresh();
      toast.success(`Trash emptied (${n} deleted)`);
    },
    onError: (e) => toast.error(getErrorMessage(e))
  });
};

// ---------- Bulk actions ----------
export const useBulk = (onDone?: () => void) => {
  const refresh = useRefreshTrash();
  return useMutation({
    mutationFn: ({ ids, action, value }: { ids: string[]; action: BulkAction; value?: string }) =>
      todoService.bulk(ids, action, value),
    onSuccess: ({ affected, spawned }, { action }) => {
      refresh();
      onDone?.();
      const label: Record<BulkAction, string> = {
        complete: 'marked as done',
        pending: 'marked as pending',
        delete: 'moved to trash',
        priority: 'updated',
        addTag: 'tagged',
        removeTag: 'untagged'
      };
      toast.success(
        `${affected} todo${affected === 1 ? '' : 's'} ${label[action]}${spawned ? ` · ${spawned} repeat${spawned === 1 ? '' : 's'} scheduled` : ''}`
      );
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Bulk action failed'))
  });
};

// ---------- Export / import ----------
export const useExport = () =>
  useMutation({
    mutationFn: (format: 'json' | 'csv') => todoService.exportTodos(format),
    onSuccess: () => toast.success('Download started'),
    onError: (e) => toast.error(getErrorMessage(e, 'Export failed'))
  });

export const useImport = () => {
  const refresh = useRefreshTrash();
  return useMutation({
    mutationFn: (todos: unknown[]) => todoService.importTodos(todos),
    onSuccess: ({ imported, skipped }) => {
      refresh();
      toast.success(`Imported ${imported} todo${imported === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}`);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Import failed'))
  });
};
