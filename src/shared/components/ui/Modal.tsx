import React, { useEffect, useRef } from 'react';

export interface ModalProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  open: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  description,
  children,
  footer,
  open,
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  size = 'md',
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Focus lock
  useEffect(() => {
    if (!open) return;
    
    // Focus the modal container on open
    modalRef.current?.focus();
    
    // Disable body scrolling
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative w-full bg-white rounded-ui-3xl shadow-2xl border border-ui-border
          flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200
          focus:outline-none ${sizeClasses[size]} ${className}
        `}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-ui-border flex items-start justify-between gap-4">
          <div className="flex-1">
            {title && (
              <h2 id="modal-title" className="text-lg font-bold text-ui-text">
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="text-xs text-ui-text-muted mt-1">
                {description}
              </p>
            )}
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-ui-surface-muted text-slate-400 hover:text-ui-text transition-colors focus:outline-none focus:ring-2 focus:ring-ui-primary"
            aria-label="Închide"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1 text-sm text-ui-text leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-ui-surface-muted/50 border-t border-ui-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
