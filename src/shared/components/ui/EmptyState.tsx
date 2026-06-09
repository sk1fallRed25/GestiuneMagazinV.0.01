import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
  compact = false
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        border border-dashed border-ui-border rounded-ui-2xl bg-white
        ${compact ? 'p-6 min-h-[160px]' : 'p-12 min-h-[320px]'}
        ${className}
      `}
    >
      {icon && (
        <div className={`text-slate-400 select-none ${compact ? 'mb-2.5' : 'mb-4'}`}>
          {icon}
        </div>
      )}
      <h3 className={`font-bold text-ui-text tracking-tight ${compact ? 'text-sm' : 'text-base'}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-ui-text-muted mt-1 max-w-sm ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {description}
        </p>
      )}
      {action && (
        <div className={compact ? 'mt-4' : 'mt-6'}>
          {action}
        </div>
      )}
    </div>
  );
};
