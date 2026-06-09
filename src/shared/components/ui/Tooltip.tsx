import React from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = ''
}) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent'
  };

  return (
    <div className="relative inline-flex group focus-within:outline-none">
      {children}
      <div
        className={`
          absolute z-30 invisible group-hover:visible group-focus-within:visible
          bg-slate-800 text-white text-[11px] font-semibold px-2 py-1.5 rounded-ui-md
          shadow-lg whitespace-nowrap pointer-events-none select-none
          transition-all duration-150 scale-95 origin-center group-hover:scale-100
          ${positionClasses[position]}
          ${className}
        `}
        role="tooltip"
      >
        {content}
        <div className={`absolute border-[4px] ${arrowClasses[position]}`} />
      </div>
    </div>
  );
};
