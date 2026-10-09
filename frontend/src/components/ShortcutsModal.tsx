import { Modal } from './Modal';

const SHORTCUTS: [string, string][] = [
  ['N', 'New todo'],
  ['/', 'Focus search'],
  ['A', 'Select / unselect all on this page'],
  ['Esc', 'Clear selection or close dialogs'],
  ['?', 'Show this help']
];

export const ShortcutsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Modal open={open} title="Keyboard shortcuts" onClose={onClose}>
    <ul className="space-y-2">
      {SHORTCUTS.map(([key, text]) => (
        <li key={key} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-600 dark:text-slate-300">{text}</span>
          <kbd className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs dark:border-slate-600 dark:bg-slate-800">
            {key}
          </kbd>
        </li>
      ))}
    </ul>
  </Modal>
);
