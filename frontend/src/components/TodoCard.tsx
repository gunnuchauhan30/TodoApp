import { ChangeEvent, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Priority, Todo } from '../types';
import {
  useDeleteAttachment,
  useDeleteTodo,
  useToggleTodo,
  useUpdateTodo,
  useUploadAttachment
} from '../hooks/useTodos';
import { API_URL } from '../lib/axios';
import { dueLabel, formatBytes, isOverdue } from '../lib/date';
import { CalendarIcon, CheckIcon, ClipIcon, EditIcon, GripIcon, TrashIcon, XIcon } from './Icons';
import { Spinner } from './Spinner';

const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  high: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
};
const PRIORITY_DOT: Record<Priority, string> = { low: 'bg-emerald-500', medium: 'bg-amber-500', high: 'bg-rose-500' };

interface Props {
  todo: Todo;
  dragEnabled: boolean;
  onEdit: (todo: Todo) => void;
  onTagClick: (tag: string) => void;
  selected: boolean;
  selectionActive: boolean;
  onSelect: (id: string) => void;
}

export const TodoCard = ({ todo, dragEnabled, onEdit, onTagClick, selected, selectionActive, onSelect }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo._id,
    disabled: !dragEnabled
  });
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();
  const update = useUpdateTodo({ silent: true });
  const upload = useUploadAttachment();
  const removeAttachment = useDeleteAttachment();
  const fileRef = useRef<HTMLInputElement>(null);

  const overdue = isOverdue(todo);
  const doneSteps = todo.subtasks.filter((s) => s.completed).length;
  const pct = todo.subtasks.length ? Math.round((doneSteps / todo.subtasks.length) * 100) : 0;

  const toggleSubtask = (index: number) =>
    update.mutate({
      id: todo._id,
      data: { subtasks: todo.subtasks.map((s, i) => (i === index ? { ...s, completed: !s.completed } : s)) }
    });

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload.mutate({ id: todo._id, file });
    e.target.value = '';
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-20' : ''}
    >
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -48, scale: 0.97 }}
        transition={{ duration: 0.22 }}
        className={`card flex gap-3 p-4 transition-shadow sm:p-5 ${isDragging ? 'shadow-xl ring-2 ring-brand-500/40' : 'hover:shadow-md'} ${selected ? 'ring-2 ring-brand-500/60' : ''} ${todo.completed ? 'opacity-75' : ''}`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(todo._id)}
          aria-label={`Select ${todo.title}`}
          className={`mt-1 h-4 w-4 shrink-0 cursor-pointer rounded accent-brand-600 transition ${selectionActive || selected ? 'opacity-100' : 'opacity-30 hover:opacity-100 focus:opacity-100'}`}
        />

        {dragEnabled && (
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="-ml-1 mt-0.5 hidden cursor-grab touch-none self-start text-slate-300 hover:text-slate-500 active:cursor-grabbing sm:block dark:text-slate-600"
          >
            <GripIcon />
          </button>
        )}

        <button
          onClick={() => toggle.mutate(todo._id)}
          disabled={toggle.isPending}
          aria-label={todo.completed ? 'Mark as pending' : 'Mark as done'}
          aria-pressed={todo.completed}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
            todo.completed
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-slate-300 hover:border-brand-500 dark:border-slate-600'
          }`}
        >
          {todo.completed && <CheckIcon width={14} height={14} strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`break-words text-base font-semibold leading-snug ${todo.completed ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}
            >
              {todo.title}
            </h3>
            <div className="flex shrink-0 gap-0.5">
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Attach a file"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {upload.isPending ? <Spinner /> : <ClipIcon width={16} height={16} />}
              </button>
              <button
                onClick={() => onEdit(todo)}
                aria-label="Edit todo"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <EditIcon width={16} height={16} />
              </button>
              <button
                onClick={() => remove.mutate(todo._id)}
                disabled={remove.isPending}
                aria-label="Delete todo"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <TrashIcon width={16} height={16} />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf,text/plain"
                onChange={onFile}
              />
            </div>
          </div>

          {todo.description && (
            <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600 dark:text-slate-400">
              {todo.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className={`badge capitalize ${PRIORITY_STYLE[todo.priority]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[todo.priority]}`} />
              {todo.priority}
            </span>
            {todo.dueDate && (
              <span
                className={`badge ${overdue ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                <CalendarIcon width={12} height={12} />
                {dueLabel(todo.dueDate)}
              </span>
            )}
            {todo.recurrence !== 'none' && (
              <span className="badge bg-sky-50 capitalize text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                🔁 {todo.recurrence}
              </span>
            )}
            {todo.tags.map((t) => (
              <button
                key={t}
                onClick={() => onTagClick(t)}
                className="badge bg-brand-50 text-brand-700 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20"
                title={`Filter by #${t}`}
              >
                #{t}
              </button>
            ))}
          </div>

          {todo.subtasks.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {doneSteps}/{todo.subtasks.length} steps
                </span>
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <ul className="space-y-1">
                {todo.subtasks.map((s, i) => (
                  <li key={s._id ?? i}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-0.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => toggleSubtask(i)}
                        className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                      />
                      <span className={s.completed ? 'text-slate-400 line-through' : ''}>{s.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {todo.attachments.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {todo.attachments.map((a) => (
                <li
                  key={a._id}
                  className="flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 text-xs dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <ClipIcon width={12} height={12} className="shrink-0 text-slate-400" />
                  <a
                    href={`${API_URL}${a.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium text-brand-600 hover:underline dark:text-brand-400"
                    title={a.originalName}
                  >
                    {a.originalName}
                  </a>
                  <span className="shrink-0 text-slate-400">{formatBytes(a.size)}</span>
                  <button
                    onClick={() => removeAttachment.mutate({ id: todo._id, attachmentId: a._id })}
                    aria-label={`Remove ${a.originalName}`}
                    className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                  >
                    <XIcon width={12} height={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.article>
    </div>
  );
};
