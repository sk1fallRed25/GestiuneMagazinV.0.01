import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  'data-testid'?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      type = 'button',
      children,
      'data-testid': dataTestId,
      ...props
    },
    ref
  ) => {
    const baseStyle = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed select-none';
    
    const variantStyles = {
      primary: 'bg-ui-primary text-white hover:bg-ui-primary-hover focus:ring-ui-primary border border-transparent disabled:bg-slate-200 disabled:text-slate-400 disabled:border-transparent',
      secondary: 'bg-white text-ui-text border border-ui-border hover:bg-ui-surface-muted focus:ring-ui-primary disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200',
      danger: 'bg-ui-danger text-white hover:bg-ui-danger-hover focus:ring-ui-danger border border-transparent disabled:bg-slate-200 disabled:text-slate-400',
      success: 'bg-ui-success text-white hover:bg-ui-success-hover focus:ring-ui-success border border-transparent disabled:bg-slate-200 disabled:text-slate-400',
      warning: 'bg-ui-warning text-white hover:bg-ui-warning-hover focus:ring-ui-warning border border-transparent disabled:bg-slate-200 disabled:text-slate-400',
      ghost: 'text-ui-text hover:bg-ui-surface-muted focus:ring-ui-primary border border-transparent disabled:text-slate-400 disabled:bg-transparent',
      link: 'text-ui-primary hover:underline bg-transparent border-none p-0 focus:ring-ui-primary disabled:text-slate-400 hover:bg-transparent focus:ring-0 focus:ring-offset-0 disabled:no-underline'
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs rounded-ui-md',
      md: 'h-11 px-4 text-sm rounded-ui-lg min-h-[44px]', // minimum 44px for touch targets
      lg: 'h-12 px-6 text-base rounded-ui-xl min-h-[44px]', // minimum 44px for touch targets
      xl: 'h-14 px-8 text-lg rounded-ui-2xl min-h-[48px]'
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        data-testid={dataTestId}
        className={`${baseStyle} ${variantStyles[variant]} ${variantStyles[variant] === 'link' ? '' : sizeStyles[size]} ${widthStyle} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
