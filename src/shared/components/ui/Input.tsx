import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
  suffix?: React.ReactNode;
  onClear?: () => void;
  'data-testid'?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      helperText,
      error,
      prefixIcon,
      suffix,
      onClear,
      disabled = false,
      id,
      type = 'text',
      'data-testid': dataTestId,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`w-full flex flex-col gap-1.5 ${disabled ? 'opacity-60' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-ui-text select-none"
          >
            {label}
          </label>
        )}
        
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3.5 flex items-center justify-center text-ui-text-muted pointer-events-none select-none">
              {prefixIcon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            type={type}
            disabled={disabled}
            data-testid={dataTestId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`
              w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white text-ui-text border rounded-ui-lg
              focus:outline-none focus:ring-2 focus:ring-ui-primary focus:ring-offset-1 focus:border-ui-primary
              placeholder:text-slate-400 placeholder:font-normal
              disabled:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200
              transition-colors
              ${prefixIcon ? 'pl-10' : ''}
              ${suffix || onClear ? 'pr-10' : ''}
              ${error ? 'border-ui-danger focus:ring-ui-danger focus:border-ui-danger' : 'border-ui-border hover:border-slate-400'}
              ${className}
            `}
            {...props}
          />
          
          {onClear && props.value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-ui-text focus:outline-none focus:ring-1 focus:ring-ui-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {!onClear && suffix && (
            <div className="absolute right-3.5 flex items-center justify-center text-ui-text-muted select-none">
              {suffix}
            </div>
          )}
        </div>

        {error && (
          <span
            id={`${inputId}-error`}
            className="text-xs font-medium text-ui-danger"
          >
            {error}
          </span>
        )}

        {!error && helperText && (
          <span
            id={`${inputId}-helper`}
            className="text-xs text-ui-text-muted"
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
