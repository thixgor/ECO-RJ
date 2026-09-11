import React from 'react';

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
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const variantClasses: Record<ButtonVariant, string> = {
  default: 'glass-btn',
  primary: 'glass-btn-primary',
  secondary: `
    glass-btn
    text-primary-600 dark:text-primary-300
    border-primary-300 dark:border-primary-600
    hover:border-primary-400 dark:hover:border-primary-500
  `,
  danger: `
    glass-btn
    !bg-gradient-to-r !from-red-500/80 !to-red-600/60
    !border-red-400/30
    text-white
    hover:!from-red-500/90 hover:!to-red-600/70
    hover:!shadow-[0_8px_32px_rgba(239,68,68,0.35)]
  `,
  success: `
    glass-btn
    !bg-gradient-to-r !from-emerald-500/80 !to-emerald-600/60
    !border-emerald-400/30
    text-white
    hover:!from-emerald-500/90 hover:!to-emerald-600/70
    hover:!shadow-[0_8px_32px_rgba(16,185,129,0.35)]
  `,
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
        ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}

      <span>{children}</span>

      {rightIcon && !isLoading && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};

export default GlassButton;
