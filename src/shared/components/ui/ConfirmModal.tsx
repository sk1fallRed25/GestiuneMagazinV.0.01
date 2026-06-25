import React from 'react';
import { Modal } from './Modal';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirmă',
  cancelText = 'Anulează',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel
}) => {
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 focus:ring-indigo-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-red-200 focus:ring-red-500',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 focus:ring-amber-500'
  };

  const footer = (
    <div className="flex gap-3 w-full sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="px-5 py-2.5 bg-slate-105 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 flex-1 sm:flex-initial text-center justify-center flex"
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 disabled:opacity-50 flex-1 sm:flex-initial ${variantClasses[variant]}`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {confirmText}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={footer}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex items-start gap-4">
        {variant === 'danger' && (
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <AlertCircle size={20} />
          </div>
        )}
        {variant === 'warning' && (
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <AlertCircle size={20} />
          </div>
        )}
        <div className="flex-1 text-slate-650 font-semibold leading-relaxed">
          {message}
        </div>
      </div>
    </Modal>
  );
};
