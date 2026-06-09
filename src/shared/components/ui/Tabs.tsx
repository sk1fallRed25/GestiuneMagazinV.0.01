import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'pills'
}) => {
  const containerStyle = 'flex flex-wrap gap-2 border-b border-ui-border pb-1 select-none';

  return (
    <div className={`${containerStyle} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        
        const pillStyles = isActive
          ? 'bg-ui-primary text-white shadow-sm'
          : 'bg-white border border-ui-border text-ui-text hover:bg-ui-surface-muted';
          
        const underlineStyles = isActive
          ? 'border-b-2 border-ui-primary text-ui-primary font-bold'
          : 'text-ui-text-muted hover:text-ui-text border-b-2 border-transparent';

        const baseTabStyle = 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-ui-lg transition-all focus:outline-none focus:ring-2 focus:ring-ui-primary focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed';

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`
              ${baseTabStyle}
              ${variant === 'pills' ? pillStyles : underlineStyles}
            `}
          >
            {tab.icon && <span className="inline-flex flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
