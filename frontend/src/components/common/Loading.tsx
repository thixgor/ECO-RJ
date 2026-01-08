import React, { useMemo } from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4'
};

const Loading: React.FC<LoadingProps> = React.memo(({ size = 'md', text, className = '' }) => {
  const spinnerClass = useMemo(
    () => `${sizeClasses[size]} border-primary-200 border-t-primary-500 rounded-full animate-spin`,
    [size]
  );

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={spinnerClass} />
      {text && <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{text}</p>}
    </div>
  );
});

Loading.displayName = 'Loading';

/**
 * LoadingPage - Fullscreen loading that covers entire viewport including footer
 * Uses fixed positioning with blur backdrop to hide all content
 */
export const LoadingPage: React.FC<{ text?: string }> = React.memo(({ text = "Carregando conteúdo..." }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
    <Loading size="lg" text={text} />
  </div>
));

LoadingPage.displayName = 'LoadingPage';

/**
 * LoadingOverlay - Similar to LoadingPage but with higher z-index for modal overlays
 */
export const LoadingOverlay: React.FC<{ text?: string }> = React.memo(({ text = "Carregando..." }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
    <Loading size="lg" text={text} />
  </div>
));

LoadingOverlay.displayName = 'LoadingOverlay';

/**
 * LoadingInline - For inline loading states that don't need fullscreen
 */
export const LoadingInline: React.FC<LoadingProps> = React.memo((props) => (
  <div className="flex items-center justify-center py-8">
    <Loading {...props} />
  </div>
));

LoadingInline.displayName = 'LoadingInline';

export default Loading;
