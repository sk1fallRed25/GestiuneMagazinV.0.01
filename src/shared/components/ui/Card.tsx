import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'muted' | 'warning' | 'danger' | 'success';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyle = 'rounded-ui-2xl overflow-hidden transition-all duration-200';
    
    const variantStyles = {
      default: 'bg-white border border-ui-border text-ui-text shadow-sm',
      elevated: 'bg-white border border-ui-border text-ui-text shadow-md hover:shadow-lg',
      muted: 'bg-ui-surface-muted border border-ui-border text-ui-text',
      warning: 'bg-amber-50/50 border border-amber-200 text-amber-950',
      danger: 'bg-rose-50/50 border border-rose-200 text-rose-950',
      success: 'bg-emerald-50/50 border border-emerald-200 text-emerald-950'
    };

    return (
      <div
        ref={ref}
        className={`${baseStyle} ${variantStyles[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ui-border ${className}`}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-base font-bold text-ui-text tracking-tight ${className}`}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-xs text-ui-text-muted mt-1 ${className}`}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`px-6 py-5 ${className}`}
      {...props}
    />
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`px-6 py-4 bg-ui-surface-muted/50 border-t border-ui-border flex items-center justify-end gap-3 ${className}`}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';
