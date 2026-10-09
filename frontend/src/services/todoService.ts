import { api } from '../lib/axios';
import {
  TodosResponse,
  TodosResponseSchema,
  TodoResponse,
  TodoResponseSchema,
  TagsResponseSchema,
  TrashResponseSchema,
  BulkAction,
  TodoInput,
  TodoQuery
} from '../types';

const BASE = '/api/v1/todos';

export const todoService = {
  getTodos: async (q: TodoQuery): Promise<TodosResponse> => {
    const params: Record<string, string | number> = { page: q.page, limit: q.limit, sortBy: q.sortBy };
    if (q.search) params.search = q.search;
    if (q.status !== 'all') params.status = q.status;
    if (q.priority) params.priority = q.priority;
    if (q.tag) params.tag = q.tag;
    if (q.dir) params.dir = q.dir;
    return TodosResponseSchema.parse((await api.get(BASE, { params })).data);
  },

  getTags: async (): Promise<string[]> => TagsResponseSchema.parse((await api.get(`${BASE}/tags`)).data).data,

  createTodo: async (data: TodoInput): Promise<TodoResponse> =>
    TodoResponseSchema.parse((await api.post(BASE, data)).data),

  updateTodo: async (id: string, data: Partial<TodoInput>): Promise<TodoResponse> =>
    TodoResponseSchema.parse((await api.put(`${BASE}/${id}`, data)).data),

  deleteTodo: async (id: string) => (await api.delete(`${BASE}/${id}`)).data,

  restoreTodo: async (id: string): Promise<TodoResponse> =>
    TodoResponseSchema.parse((await api.patch(`${BASE}/${id}/restore`)).data),

  toggleTodo: async (id: string): Promise<TodoResponse> =>
    TodoResponseSchema.parse((await api.patch(`${BASE}/${id}/toggle`)).data),

  reorder: async (ids: string[]) => (await api.patch(`${BASE}/reorder`, { ids })).data,

  uploadAttachment: async (id: string, file: File): Promise<TodoResponse> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`${BASE}/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return TodoResponseSchema.parse(res.data);
  },

  deleteAttachment: async (id: string, attachmentId: string): Promise<TodoResponse> =>
    TodoResponseSchema.parse((await api.delete(`${BASE}/${id}/attachments/${attachmentId}`)).data),

  getTrash: async () => TrashResponseSchema.parse((await api.get(`${BASE}/trash`)).data).data,

  permanentDelete: async (id: string) => (await api.delete(`${BASE}/${id}/permanent`)).data,

  emptyTrash: async (): Promise<number> => (await api.delete(`${BASE}/trash`)).data.data.deleted as number,

  bulk: async (ids: string[], action: BulkAction, value?: string) =>
    (await api.post(`${BASE}/bulk`, { ids, action, value })).data.data as { affected: number; spawned: number },

  // Downloads the export through axios so the auth header is sent
  exportTodos: async (format: 'json' | 'csv'): Promise<void> => {
    const res = await api.get(`${BASE}/export`, { params: { format }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  importTodos: async (todos: unknown[]): Promise<{ imported: number; skipped: number }> => {
    let imported = 0;
    let skipped = 0;
    for (let i = 0; i < todos.length; i += 500) {
      const res = await api.post(`${BASE}/import`, { todos: todos.slice(i, i + 500) });
      imported += res.data.data.imported;
      skipped += res.data.data.skipped;
    }
    return { imported, skipped };
  }
};
