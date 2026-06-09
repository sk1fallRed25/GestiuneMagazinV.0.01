import React from 'react';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Se încarcă datele...',
  size = 'md',
  fullPage = false,
  className = ''
}) => {
  const spinnerSizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3.5 p-6 ${className}`}>
      <div
        className={`
          animate-spin rounded-full border-solid border-slate-200 border-t-ui-primary
          ${spinnerSizes[size]}
        `}
        role="status"
        aria-label={message}
      />
      {message && (
        <span className={`font-semibold text-ui-text-muted ${textSizes[size]} select-none`}>
          {message}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-ui-3xl shadow-2xl border border-ui-border max-w-xs w-full">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
