import { FormEvent, KeyboardEvent, useState } from 'react';
import { Priority, Recurrence, Subtask, Todo, TodoInput } from '../types';
import { fromDateInput, toDateInput } from '../lib/date';
import { PlusIcon, XIcon } from './Icons';
import { Spinner } from './Spinner';

interface Props {
  initial?: Todo;
  submitLabel: string;
  onSubmit: (data: TodoInput) => Promise<unknown>;
  onCancel?: () => void;
  resetOnSuccess?: boolean;
  autoFocusTitle?: boolean;
}

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' }
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

export const TodoForm = ({ initial, submitLabel, onSubmit, onCancel, resetOnSuccess, autoFocusTitle }: Props) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence ?? 'none');
  const [dueDate, setDueDate] = useState(toDateInput(initial?.dueDate));
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>(initial?.subtasks ?? []);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
    setTagInput('');
  };

  const addSubtask = () => {
    const text = subtaskInput.trim();
    if (text && subtasks.length < 50) setSubtasks([...subtasks, { text, completed: false }]);
    setSubtaskInput('');
  };

  const onEnter = (fn: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fn();
    }
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setRecurrence('none');
    setDueDate('');
    setTags([]);
    setSubtasks([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please give your todo a title');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // include any half-typed tag / subtask so nothing is silently lost
      const pendingTag = tagInput.trim().toLowerCase().replace(/^#/, '');
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;
      const finalSubtasks = subtaskInput.trim()
        ? [...subtasks, { text: subtaskInput.trim(), completed: false }]
        : subtasks;
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        recurrence,
        dueDate: fromDateInput(dueDate),
        tags: finalTags,
        subtasks: finalSubtasks
      });
      if (resetOnSuccess) {
        reset();
        setTagInput('');
        setSubtaskInput('');
      }
    } catch {
      /* the mutation hook already showed an error toast */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="todo-title" className="label">
          Title
        </label>
        <input
          id="todo-title"
          className={`input ${error ? '!border-red-500' : ''}`}
          placeholder="What needs to be done?"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={!!initial || autoFocusTitle}
        />
        {error && <p className="field-error">{error}</p>}
      </div>

      <div>
        <label htmlFor="todo-desc" className="label">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="todo-desc"
          className="input min-h-[72px] resize-y"
          placeholder="Add some details…"
          value={description}
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Priority</span>
          <div
            className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
            role="radiogroup"
            aria-label="Priority"
          >
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={priority === p.value}
                onClick={() => setPriority(p.value)}
                className={`rounded-lg py-1.5 text-sm font-medium transition ${
                  priority === p.value
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="todo-due" className="label">
            Due date
          </label>
          <input
            id="todo-due"
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="todo-repeat" className="label">
          Repeat
        </label>
        <select
          id="todo-repeat"
          className="input"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
        >
          {RECURRENCES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {recurrence !== 'none' && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            When you mark this done, the next one is created automatically.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="todo-tags" className="label">
          Tags
        </label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-2 focus-within:ring-2 focus-within:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900">
          {tags.map((t) => (
            <span key={t} className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
              #{t}
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
                <XIcon width={12} height={12} />
              </button>
            </span>
          ))}
          <input
            id="todo-tags"
            className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder-slate-400"
            placeholder={tags.length ? 'Add another…' : 'work, home, shopping (press Enter)'}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onEnter(addTag)}
            onBlur={addTag}
          />
        </div>
      </div>

      <div>
        <label htmlFor="todo-subtask" className="label">
          Checklist
        </label>
        {subtasks.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {subtasks.map((s, i) => (
              <li
                key={s._id ?? i}
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-800/60"
              >
                <span className={`flex-1 ${s.completed ? 'text-slate-400 line-through' : ''}`}>{s.text}</span>
                <button
                  type="button"
                  aria-label="Remove subtask"
                  onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500"
                >
                  <XIcon width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            id="todo-subtask"
            className="input"
            placeholder="Add a step…"
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={onEnter(addSubtask)}
          />
          <button type="button" className="btn-ghost !px-3" onClick={addSubtask} aria-label="Add subtask">
            <PlusIcon />
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
          {submitting ? <Spinner /> : <PlusIcon width={16} height={16} />}
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
