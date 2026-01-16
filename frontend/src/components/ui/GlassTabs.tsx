import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface GlassTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const GlassTabs: React.FC<GlassTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex gap-2 p-1 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-[var(--glass-border)] ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${isActive
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/50 dark:hover:bg-white/10'
              }
            `}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`
                px-1.5 py-0.5 text-xs rounded-full
                ${isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-[var(--color-text-muted)]'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default GlassTabs;
