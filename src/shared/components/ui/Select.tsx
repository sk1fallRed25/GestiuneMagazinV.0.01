import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  'data-testid'?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      label,
      helperText,
      error,
      options = [],
      placeholder,
      disabled = false,
      id,
      'data-testid': dataTestId,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`w-full flex flex-col gap-1.5 ${disabled ? 'opacity-60' : ''}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-ui-text select-none"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            data-testid={dataTestId}
            aria-invalid={!!error}
            className={`
              w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white text-ui-text border rounded-ui-lg appearance-none
              focus:outline-none focus:ring-2 focus:ring-ui-primary focus:ring-offset-1 focus:border-ui-primary
              disabled:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200
              transition-colors pr-10
              ${error ? 'border-ui-danger focus:ring-ui-danger focus:border-ui-danger' : 'border-ui-border hover:border-slate-400'}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled selected={props.value === undefined || props.value === ''}>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
          
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-ui-text-muted pointer-events-none select-none">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <span
            id={`${selectId}-error`}
            className="text-xs font-medium text-ui-danger"
          >
            {error}
          </span>
        )}

        {!error && helperText && (
          <span
            id={`${selectId}-helper`}
            className="text-xs text-ui-text-muted"
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
