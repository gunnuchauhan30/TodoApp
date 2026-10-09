import { ReactNode } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

interface Props {
  open: boolean;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}

export const ConfirmModal = ({
  open,
  title,
  confirmLabel,
  danger,
  busy,
  disabled,
  onConfirm,
  onClose,
  children
}: Props) => (
  <Modal open={open} title={title} onClose={onClose}>
    <div className="space-y-5">
      <div className="text-sm text-slate-600 dark:text-slate-300">{children}</div>
      <div className="flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className={danger ? 'btn bg-red-600 text-white hover:bg-red-700' : 'btn-primary'}
          onClick={onConfirm}
          disabled={busy || disabled}
        >
          {busy && <Spinner />} {confirmLabel}
        </button>
      </div>
    </div>
  </Modal>
);
