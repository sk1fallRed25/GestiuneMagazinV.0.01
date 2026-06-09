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
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 border border-transparent disabled:bg-slate-200 disabled:text-slate-400 disabled:border-transparent',
      secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 border border-transparent disabled:bg-slate-200 disabled:text-slate-400',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 border border-transparent disabled:bg-slate-200 disabled:text-slate-400',
      warning: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 border border-transparent disabled:bg-slate-200 disabled:text-slate-400',
      ghost: 'text-slate-900 hover:bg-slate-100 focus:ring-indigo-500 border border-transparent disabled:text-slate-400 disabled:bg-transparent',
      link: 'text-indigo-600 hover:underline bg-transparent border-none p-0 focus:ring-indigo-500 disabled:text-slate-400 hover:bg-transparent focus:ring-0 focus:ring-offset-0 disabled:no-underline'
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs rounded-md',
      md: 'h-11 px-4 text-sm rounded-lg min-h-[44px]', // minimum 44px for touch targets
      lg: 'h-12 px-6 text-base rounded-xl min-h-[44px]', // minimum 44px for touch targets
      xl: 'h-14 px-8 text-lg rounded-2xl min-h-[48px]'
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
