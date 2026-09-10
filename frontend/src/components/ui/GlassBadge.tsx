import React from 'react';

/**
 * Etiqueta de estado. Retângulo de canto contido, não pílula colorida:
 * lavagem clara de fundo + régua de 1px + texto na cor do sinal.
 *
 * O `pulse` foi removido — era um ponto piscando ao infinito, movimento sem
 * significado. Um estado que precisa de atenção usa a cor do sinal e um ícone,
 * não animação.
 */
type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  icon?: React.ReactNode;
  /** @deprecated Sem efeito. Movimento decorativo saiu do sistema. */
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-paper-2 border-rule text-ink-muted dark:bg-dark-card dark:border-dark-border dark:text-dark-muted',
  primary: 'bg-primary-100 border-primary-200 text-primary-600 dark:bg-primary-900 dark:border-primary-700 dark:text-primary-300',
  success: 'bg-signal-success/10 border-signal-success/30 text-signal-success dark:text-emerald-300 dark:border-emerald-400/30',
  warning: 'bg-signal-warning/10 border-signal-warning/30 text-signal-warning dark:text-amber-300 dark:border-amber-400/30',
  danger: 'bg-signal-danger/10 border-signal-danger/30 text-signal-danger dark:text-red-300 dark:border-red-400/30',
  info: 'bg-primary-100 border-primary-200 text-primary-600 dark:bg-primary-900 dark:border-primary-700 dark:text-primary-300',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-2xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1 text-xs',
};

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
}) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-xs border font-medium
        whitespace-nowrap
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
};

export default GlassBadge;
