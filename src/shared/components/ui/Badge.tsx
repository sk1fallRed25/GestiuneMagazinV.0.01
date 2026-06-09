import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'offline' | 'online';
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'default',
  size = 'md',
  showDot = false,
  children,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center font-semibold rounded-full select-none';
  
  const variantStyles = {
    default: 'bg-ui-surface-muted text-ui-text-muted border border-ui-border',
    success: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-900 border border-amber-200',
    danger: 'bg-rose-100 text-rose-900 border border-rose-200',
    info: 'bg-blue-100 text-blue-900 border border-blue-200',
    neutral: 'bg-slate-100 text-slate-800 border border-slate-200',
    offline: 'bg-gray-100 text-gray-700 border border-gray-300 animate-pulse',
    online: 'bg-emerald-100 text-emerald-900 border border-emerald-300'
  };

  const dotStyles = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-500',
    offline: 'bg-gray-400',
    online: 'bg-emerald-500'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5'
  };

  return (
    <span
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />
      )}
      <span>{children}</span>
    </span>
  );
};
