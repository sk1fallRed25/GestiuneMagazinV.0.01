import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  className = ''
}) => {
  return (
    <div
      className={`
        flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6
        border-b border-ui-border mb-6 ${className}
      `}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="p-3 bg-ui-surface-muted border border-ui-border rounded-ui-xl text-ui-primary flex items-center justify-center select-none shadow-sm flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-ui-text">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-ui-text-muted mt-1 font-medium leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-3.5 flex-wrap md:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
};
