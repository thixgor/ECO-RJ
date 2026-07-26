import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Linha de apoio exibida abaixo do título. */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Ações fixas no rodapé (não rolam com o conteúdo). */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  /** Classes extras no corpo rolável (ex.: `space-y-4`). */
  bodyClassName?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-4xl',
};

/**
 * Modal padrão da plataforma.
 *
 * O layout é sempre header / corpo rolável / rodapé fixo com altura máxima
 * limitada à viewport. Isso evita o problema antigo em que formulários longos
 * (ex.: "Novo Curso") estouravam a tela e ficavam sem como rolar ou salvar.
 */
export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  bodyClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Fix for Safari iOS: save the overflow state
      document.body.setAttribute('data-original-overflow', document.body.style.overflow || '');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // Fix for Safari iOS: restore overflow or use empty string
      const originalOverflow = document.body.getAttribute('data-original-overflow');
      document.body.style.overflow = originalOverflow || '';
      document.body.removeAttribute('data-original-overflow');
    };
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const hasHeader = !!title || showCloseButton;

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`modal-content ${sizeClasses[size]} p-0 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in`}
        tabIndex={-1}
      >
        {hasHeader && (
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[var(--glass-border)] flex-shrink-0">
            <div className="min-w-0">
              {title && (
                <h2
                  id="modal-title"
                  className="font-heading text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] truncate"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors duration-200 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex-shrink-0"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-[var(--glass-border)] flex-shrink-0 safe-area-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlassModal;
