import React from 'react';

/**
 * Botão do sistema. Três vozes, nenhuma com gradiente:
 *   primary   — preenchimento sólido no acento institucional
 *   default   — contorno de 1px, fundo transparente
 *   secondary — contorno no acento
 * `danger` e `success` existem porque a plataforma tem ações destrutivas e
 * confirmações — cor sozinha nunca é o sinal, sempre acompanha ícone ou rótulo.
 *
 * Estados cobertos: default · hover · focus-visible · active · disabled · loading.
 */
type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-3.5 text-base',
};

const variantClasses: Record<ButtonVariant, string> = {
  default: 'glass-btn',
  primary: 'glass-btn-primary',
  secondary: 'glass-btn !border-primary-500 !text-primary-500 dark:!border-primary-400 dark:!text-primary-400',
  danger: 'glass-btn !border-signal-danger !text-signal-danger hover:!bg-signal-danger hover:!text-paper',
  success: 'glass-btn !border-signal-success !text-signal-success hover:!bg-signal-success hover:!text-paper',
};

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : leftIcon ? (
        <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>
      ) : null}

      <span>{children}</span>

      {rightIcon && !isLoading && (
        <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
};

export default GlassButton;
