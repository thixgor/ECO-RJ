import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: `
    bg-[var(--glass-bg)]
    border border-[var(--glass-border)]
    text-[var(--color-text-secondary)]
  `,
  primary: `
    bg-primary-500/20
    border border-primary-400/30
    text-primary-600 dark:text-primary-300
  `,
  success: `
    bg-emerald-500/20
    border border-emerald-400/30
    text-emerald-600 dark:text-emerald-300
  `,
  warning: `
    bg-amber-500/20
    border border-amber-400/30
    text-amber-600 dark:text-amber-300
  `,
  danger: `
    bg-red-500/20
    border border-red-400/30
    text-red-600 dark:text-red-300
  `,
  info: `
    bg-blue-500/20
    border border-blue-400/30
    text-blue-600 dark:text-blue-300
  `,
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
  pulse = false,
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full
        font-medium
        backdrop-blur-sm
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`
            animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
            ${variant === 'success' ? 'bg-emerald-400' :
              variant === 'danger' ? 'bg-red-400' :
              variant === 'warning' ? 'bg-amber-400' :
              variant === 'primary' ? 'bg-primary-400' :
              variant === 'info' ? 'bg-blue-400' : 'bg-gray-400'}
          `} />
          <span className={`
            relative inline-flex rounded-full h-2 w-2
            ${variant === 'success' ? 'bg-emerald-500' :
              variant === 'danger' ? 'bg-red-500' :
              variant === 'warning' ? 'bg-amber-500' :
              variant === 'primary' ? 'bg-primary-500' :
              variant === 'info' ? 'bg-blue-500' : 'bg-gray-500'}
          `} />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default GlassBadge;
