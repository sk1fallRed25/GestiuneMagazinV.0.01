import React from 'react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  description,
  icon,
  action,
  onDismiss,
  className = '',
  children
}) => {
  const baseStyle = 'p-4 rounded-ui-xl border flex gap-3.5 transition-all duration-200';

  const variantStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-950',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    warning: 'bg-amber-50 border-amber-200 text-amber-950',
    danger: 'bg-rose-50 border-rose-200 text-rose-950',
    neutral: 'bg-slate-50 border-slate-200 text-slate-950'
  };

  const defaultIcons = {
    info: (
      <svg className="h-5 w-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    danger: (
      <svg className="h-5 w-5 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    neutral: (
      <svg className="h-5 w-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className={`${baseStyle} ${variantStyles[variant]} ${className}`} role="alert">
      {icon !== null && (icon || defaultIcons[variant])}
      
      <div className="flex-1 flex flex-col gap-0.5">
        {title && (
          <h5 className="font-bold text-sm leading-tight text-current select-none">
            {title}
          </h5>
        )}
        {(description || children) && (
          <div className="text-xs font-medium text-current/90 leading-relaxed">
            {description || children}
          </div>
        )}
      </div>

      {action && (
        <div className="flex-shrink-0 inline-flex items-center">
          {action}
        </div>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-full hover:bg-slate-900/10 text-current/70 hover:text-current transition-colors focus:outline-none focus:ring-1 focus:ring-current"
          aria-label="Închide"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
