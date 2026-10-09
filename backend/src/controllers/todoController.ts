import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { FilterQuery } from 'mongoose';
import { Todo } from '../models/Todo';
import { uploadDir } from '../middleware/upload';
import { HttpError } from '../utils/HttpError';
import { removeAttachmentFiles } from '../utils/files';
import { AuthRequest, ITodo, Priority, Recurrence } from '../types';

const PRIORITY_RANK: Record<Priority, number> = { low: 1, medium: 2, high: 3 };
const OBJECT_ID = /^[a-f\d]{24}$/i;

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const userId = (req: AuthRequest): string => {
  if (!req.user) throw new HttpError(401, 'Not authorized');
  return req.user.id;
};
const assertId = (id: string): void => {
  if (!OBJECT_ID.test(id)) throw new HttpError(400, 'Invalid todo id');
};

const parsePriority = (v: unknown): Priority => {
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  throw new HttpError(400, 'Priority must be low, medium or high');
};

const parseTags = (v: unknown): string[] => {
  if (!Array.isArray(v)) throw new HttpError(400, 'Tags must be an array');
  const cleaned = v.map((t) => String(t).trim().toLowerCase().slice(0, 30)).filter(Boolean);
  return [...new Set(cleaned)].slice(0, 10);
};

const parseSubtasks = (v: unknown) => {
  if (!Array.isArray(v)) throw new HttpError(400, 'Subtasks must be an array');
  return v
    .map((s) => ({
      ...(typeof s?._id === 'string' && OBJECT_ID.test(s._id) ? { _id: s._id } : {}),
      text: String(s?.text ?? '')
        .trim()
        .slice(0, 200),
      completed: Boolean(s?.completed)
    }))
    .filter((s) => s.text)
    .slice(0, 50);
};

const parseDueDate = (v: unknown): Date | null => {
  if (v === null || v === '') return null;
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid due date');
  return d;
};

const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly'];
const parseRecurrence = (v: unknown): Recurrence => {
  if (RECURRENCES.includes(v as Recurrence)) return v as Recurrence;
  throw new HttpError(400, 'Recurrence must be none, daily, weekly or monthly');
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Adds one recurrence step, clamping month ends (Jan 31 + 1 month -> Feb 28/29)
const addStep = (date: Date, recurrence: Recurrence): Date => {
  const d = new Date(date);
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  else if (recurrence === 'monthly') {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return d;
};

// Next due date: one step after the current due date, never in the past
const nextDueDate = (todo: ITodo): Date => {
  const today = startOfToday();
  let next = addStep(todo.dueDate ? new Date(todo.dueDate) : today, todo.recurrence);
  if (next >= today) return next;

  if (todo.recurrence === 'monthly') {
    for (let i = 0; next < today && i < 1200; i++) next = addStep(next, 'monthly');
    return next;
  }
  // daily / weekly: jump straight to the first occurrence on or after today
  const stepDays = todo.recurrence === 'weekly' ? 7 : 1;
  const steps = Math.floor((today.getTime() - next.getTime()) / 86_400_000 / stepDays);
  next.setDate(next.getDate() + steps * stepDays);
  while (next < today) next = addStep(next, todo.recurrence);
  return next;
};

// When a recurring todo is completed, create the next occurrence (once per todo)
const spawnNextOccurrence = async (todo: ITodo): Promise<ITodo | null> => {
  if (todo.recurrence === 'none' || todo.recurrenceSpawned) return null;
  const next = await Todo.create({
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    priorityRank: todo.priorityRank,
    tags: todo.tags,
    recurrence: todo.recurrence,
    dueDate: nextDueDate(todo),
    subtasks: todo.subtasks.map((s) => ({ text: s.text, completed: false })),
    user: todo.user
  });
  todo.recurrenceSpawned = true;
  await todo.save();
  return next;
};

// Builds the whitelist of updatable fields from a request body (prevents mass-assignment)
const pickFields = (body: Record<string, unknown>): Partial<ITodo> => {
  const out: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (!t) throw new HttpError(400, 'Title is required');
    out.title = t;
  }
  if (body.description !== undefined) out.description = String(body.description);
  if (body.completed !== undefined) out.completed = Boolean(body.completed);
  if (body.priority !== undefined) {
    const p = parsePriority(body.priority);
    out.priority = p;
    out.priorityRank = PRIORITY_RANK[p];
  }
  if (body.tags !== undefined) out.tags = parseTags(body.tags);
  if (body.subtasks !== undefined) out.subtasks = parseSubtasks(body.subtasks);
  if (body.dueDate !== undefined) out.dueDate = parseDueDate(body.dueDate);
  if (body.recurrence !== undefined) out.recurrence = parseRecurrence(body.recurrence);
  return out as Partial<ITodo>;
};

const findOwned = async (req: AuthRequest) => {
  assertId(req.params.id);
  const todo = await Todo.findOne({ _id: req.params.id, user: userId(req), isDeleted: false });
  if (!todo) throw new HttpError(404, 'Todo not found');
  return todo;
};

// @route GET /api/v1/todos?page&limit&search&status&priority&tag&sortBy&dir
export const getTodos = async (req: AuthRequest, res: Response): Promise<void> => {
  const q = req.query;
  const page = Math.max(parseInt(String(q.page ?? '1'), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(q.limit ?? '10'), 10) || 10, 1), 50);

  const filter: FilterQuery<ITodo> = { user: userId(req), isDeleted: false };

  if (q.status === 'completed') filter.completed = true;
  else if (q.status === 'pending') filter.completed = false;
  else if (q.status === 'overdue') {
    filter.completed = false;
    filter.dueDate = { $lt: new Date() };
  }
  if (q.priority === 'low' || q.priority === 'medium' || q.priority === 'high') filter.priority = q.priority;
  if (typeof q.tag === 'string' && q.tag) filter.tags = q.tag.toLowerCase();
  if (typeof q.search === 'string' && q.search.trim()) {
    const rx = new RegExp(escapeRegex(q.search.trim().slice(0, 100)), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }

  const sortFields: Record<string, string> = {
    order: 'order',
    createdAt: 'createdAt',
    dueDate: 'dueDate',
    priority: 'priorityRank',
    title: 'title'
  };
  const sortField = sortFields[String(q.sortBy)] || 'order';
  const defaultDir = sortField === 'title' || sortField === 'dueDate' ? 1 : -1;
  const dir = q.dir === 'asc' ? 1 : q.dir === 'desc' ? -1 : defaultDir;

  const [total, todos] = await Promise.all([
    Todo.countDocuments(filter),
    Todo.find(filter)
      .sort({ [sortField]: dir, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
  ]);

  res.status(200).json({
    success: true,
    count: todos.length,
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
    data: todos
  });
};

// @route GET /api/v1/todos/tags  - distinct tags for the filter dropdown
export const getTags = async (req: AuthRequest, res: Response): Promise<void> => {
  const tags = await Todo.distinct('tags', { user: userId(req), isDeleted: false });
  res.status(200).json({ success: true, data: tags.sort() });
};

export const getTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  const todo = await findOwned(req);
  res.status(200).json({ success: true, message: 'Todo fetched', data: todo });
};

export const createTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.body.title || !String(req.body.title).trim()) throw new HttpError(400, 'Please provide a title');
  const todo = await Todo.create({ ...pickFields(req.body), user: userId(req) });
  res.status(201).json({ success: true, message: 'Todo created successfully', data: todo });
};

export const updateTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  const todo = await findOwned(req);
  const wasCompleted = todo.completed;
  todo.set(pickFields(req.body));
  await todo.save();
  const nextTodo = !wasCompleted && todo.completed ? await spawnNextOccurrence(todo) : null;
  res.status(200).json({ success: true, message: 'Todo updated successfully', data: todo, nextTodo });
};

export const toggleTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  const todo = await findOwned(req);
  todo.completed = !todo.completed;
  await todo.save();
  const nextTodo = todo.completed ? await spawnNextOccurrence(todo) : null;
  res.status(200).json({ success: true, message: 'Todo status toggled', data: todo, nextTodo });
};

// Soft delete: keeps the document (recoverable) but hides it from every query
export const deleteTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  const todo = await findOwned(req);
  todo.isDeleted = true;
  todo.deletedAt = new Date();
  await todo.save();
  res.status(200).json({ success: true, message: 'Todo deleted successfully', data: { id: todo._id } });
};

export const restoreTodo = async (req: AuthRequest, res: Response): Promise<void> => {
  assertId(req.params.id);
  const todo = await Todo.findOne({ _id: req.params.id, user: userId(req), isDeleted: true });
  if (!todo) throw new HttpError(404, 'Deleted todo not found');
  todo.isDeleted = false;
  todo.deletedAt = null;
  await todo.save();
  res.status(200).json({ success: true, message: 'Todo restored', data: todo });
};

// @route PATCH /api/v1/todos/reorder  body: { ids: string[] } in the desired visual order.
// Reassigns the existing `order` values among those todos so position changes persist.
export const reorderTodos = async (req: AuthRequest, res: Response): Promise<void> => {
  const { ids } = req.body;
  if (
    !Array.isArray(ids) ||
    ids.length < 2 ||
    ids.length > 100 ||
    !ids.every((i) => typeof i === 'string' && OBJECT_ID.test(i))
  ) {
    throw new HttpError(400, 'ids must be an array of 2-100 valid todo ids');
  }
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'ids must be unique');

  const docs = await Todo.find({ _id: { $in: ids }, user: userId(req), isDeleted: false }).select('order');
  if (docs.length !== ids.length) throw new HttpError(404, 'One or more todos were not found');

  const orders = docs.map((d) => d.order).sort((a, b) => b - a);
  await Todo.bulkWrite(
    ids.map((id: string, i: number) => ({
      updateOne: { filter: { _id: id, user: userId(req) }, update: { $set: { order: orders[i] } } }
    }))
  );
  res.status(200).json({ success: true, message: 'Todos reordered' });
};

// @route POST /api/v1/todos/:id/attachments  (multipart, field name "file")
export const addAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  const todo = await findOwned(req).catch((e) => {
    if (req.file) fs.unlink(req.file.path, () => undefined);
    throw e;
  });
  if (!req.file) throw new HttpError(400, 'Please attach a file (field name: file)');
  if (todo.attachments.length >= 5) {
    fs.unlink(req.file.path, () => undefined);
    throw new HttpError(400, 'A todo can have at most 5 attachments');
  }

  todo.attachments.push({
    filename: req.file.filename,
    originalName: req.file.originalname.slice(0, 200),
    url: `/uploads/${req.file.filename}`,
    size: req.file.size,
    mimeType: req.file.mimetype
  });
  await todo.save();
  res.status(201).json({ success: true, message: 'Attachment uploaded', data: todo });
};

export const deleteAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  const todo = await findOwned(req);
  const att = todo.attachments.find((a) => String(a._id) === req.params.attachmentId);
  if (!att) throw new HttpError(404, 'Attachment not found');

  fs.unlink(path.join(uploadDir, path.basename(att.filename)), () => undefined);
  todo.attachments = todo.attachments.filter((a) => String(a._id) !== req.params.attachmentId);
  await todo.save();
  res.status(200).json({ success: true, message: 'Attachment removed', data: todo });
};

// ---------------------------------------------------------------------------
// Trash (soft-deleted todos)
// ---------------------------------------------------------------------------

// @route GET /api/v1/todos/trash
export const getTrash = async (req: AuthRequest, res: Response): Promise<void> => {
  const todos = await Todo.find({ user: userId(req), isDeleted: true })
    .sort({ deletedAt: -1 })
    .limit(200);
  res.status(200).json({ success: true, count: todos.length, data: todos });
};

// @route DELETE /api/v1/todos/:id/permanent  (only works on todos already in the trash)
export const permanentDelete = async (req: AuthRequest, res: Response): Promise<void> => {
  assertId(req.params.id);
  const todo = await Todo.findOne({ _id: req.params.id, user: userId(req), isDeleted: true });
  if (!todo) throw new HttpError(404, 'Todo not found in trash');
  removeAttachmentFiles(todo.attachments.map((a) => a.filename));
  await todo.deleteOne();
  res.status(200).json({ success: true, message: 'Todo permanently deleted', data: { id: todo._id } });
};

// @route DELETE /api/v1/todos/trash
export const emptyTrash = async (req: AuthRequest, res: Response): Promise<void> => {
  const todos = await Todo.find({ user: userId(req), isDeleted: true });
  removeAttachmentFiles(todos.flatMap((t) => t.attachments.map((a) => a.filename)));
  const { deletedCount } = await Todo.deleteMany({ user: userId(req), isDeleted: true });
  res.status(200).json({ success: true, message: 'Trash emptied', data: { deleted: deletedCount } });
};

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------

const BULK_ACTIONS = ['complete', 'pending', 'delete', 'priority', 'addTag', 'removeTag'];

// @route POST /api/v1/todos/bulk  body: { ids: string[], action, value? }
export const bulkUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  const { ids, action, value } = req.body;
  if (
    !Array.isArray(ids) ||
    ids.length < 1 ||
    ids.length > 100 ||
    !ids.every((i) => typeof i === 'string' && OBJECT_ID.test(i))
  ) {
    throw new HttpError(400, 'ids must be an array of 1-100 valid todo ids');
  }
  if (!BULK_ACTIONS.includes(action)) throw new HttpError(400, `action must be one of: ${BULK_ACTIONS.join(', ')}`);

  const filter = { _id: { $in: ids }, user: userId(req), isDeleted: false };
  let affected = 0;
  let spawned = 0;

  if (action === 'complete') {
    // Load documents so recurring todos can spawn their next occurrence
    for (const todo of await Todo.find({ ...filter, completed: false })) {
      todo.completed = true;
      await todo.save();
      if (await spawnNextOccurrence(todo)) spawned++;
      affected++;
    }
  } else if (action === 'pending') {
    affected = (await Todo.updateMany(filter, { $set: { completed: false } })).modifiedCount;
  } else if (action === 'delete') {
    affected = (await Todo.updateMany(filter, { $set: { isDeleted: true, deletedAt: new Date() } })).modifiedCount;
  } else if (action === 'priority') {
    const p = parsePriority(value);
    affected = (await Todo.updateMany(filter, { $set: { priority: p, priorityRank: PRIORITY_RANK[p] } })).modifiedCount;
  } else {
    const [tag] = parseTags([value]);
    if (!tag) throw new HttpError(400, 'A tag is required');
    const op = action === 'addTag' ? { $addToSet: { tags: tag } } : { $pull: { tags: tag } };
    affected = (await Todo.updateMany(filter, op)).modifiedCount;
  }

  res.status(200).json({ success: true, message: `${affected} todo(s) updated`, data: { affected, spawned } });
};

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------

const csvCell = (v: unknown): string => {
  let str = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// @route GET /api/v1/todos/export?format=json|csv
export const exportTodos = async (req: AuthRequest, res: Response): Promise<void> => {
  const todos = await Todo.find({ user: userId(req), isDeleted: false })
    .sort({ order: -1 })
    .lean();
  const rows = todos.map((t) => ({
    title: t.title,
    description: t.description ?? '',
    completed: t.completed,
    priority: t.priority,
    tags: t.tags,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : '',
    recurrence: t.recurrence ?? 'none',
    subtasks: t.subtasks.map((s) => ({ text: s.text, completed: s.completed }))
  }));
  const stamp = new Date().toISOString().slice(0, 10);

  if (req.query.format === 'csv') {
    const header = ['title', 'description', 'completed', 'priority', 'tags', 'dueDate', 'recurrence', 'subtasks'];
    const lines = rows.map((r) =>
      [
        r.title,
        r.description,
        r.completed,
        r.priority,
        r.tags.join(';'),
        r.dueDate,
        r.recurrence,
        r.subtasks.map((s) => `${s.completed ? '[x]' : '[ ]'} ${s.text.replace(/\|/g, '/')}`).join(' | ')
      ]
        .map(csvCell)
        .join(',')
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="todos-${stamp}.csv"`);
    res.status(200).send('\uFEFF' + [header.join(','), ...lines].join('\r\n'));
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="todos-${stamp}.json"`);
  res.status(200).json({ version: 1, exportedAt: new Date().toISOString(), todos: rows });
};

const toBool = (v: unknown): boolean =>
  v === true || ['true', '1', 'yes', 'y', 'done'].includes(String(v).trim().toLowerCase());

// Accepts an array, or a string like "[x] done step | [ ] open step"
const subtasksFromImport = (v: unknown): unknown => {
  if (Array.isArray(v) || v === undefined || v === null) return v ?? [];
  return String(v)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ completed: /^\[x\]/i.test(part), text: part.replace(/^\[( |x)\]\s*/i, '') }));
};

// @route POST /api/v1/todos/import  body: { todos: object[] }  (max 500). Invalid rows are skipped.
export const importTodos = async (req: AuthRequest, res: Response): Promise<void> => {
  const list = req.body.todos;
  if (!Array.isArray(list) || list.length < 1 || list.length > 500)
    throw new HttpError(400, 'Provide 1-500 todos to import');

  const docs: Record<string, unknown>[] = [];
  let skipped = 0;
  const base = Date.now() + list.length;

  list.forEach((raw: unknown, i: number) => {
    try {
      if (!raw || typeof raw !== 'object') throw new Error('bad row');
      const t = raw as Record<string, unknown>;
      if (!String(t.title ?? '').trim()) throw new Error('missing title');
      const tags = typeof t.tags === 'string' ? t.tags.split(/[;,]/) : (t.tags ?? []);
      const body: Record<string, unknown> = {
        title: t.title,
        description: t.description ?? '',
        completed: toBool(t.completed),
        tags,
        subtasks: subtasksFromImport(t.subtasks),
        dueDate: t.dueDate ? t.dueDate : null,
        recurrence: t.recurrence ? String(t.recurrence).toLowerCase() : 'none',
        priority: t.priority ? String(t.priority).toLowerCase() : 'medium'
      };
      // spreadsheet-safe text: drop the leading apostrophe added on export
      for (const k of ['title', 'description'] as const) {
        body[k] = String(body[k]).replace(/^'(?=[=+\-@])/, '');
      }
      docs.push({ ...pickFields(body), user: userId(req), order: base - i });
    } catch {
      skipped++;
    }
  });

  if (docs.length) await Todo.insertMany(docs);
  res
    .status(201)
    .json({ success: true, message: `Imported ${docs.length} todo(s)`, data: { imported: docs.length, skipped } });
};
