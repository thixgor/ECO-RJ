import React, { useMemo } from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4'
} as const;

const Loading: React.FC<LoadingProps> = React.memo(({ size = 'md', text, className = '' }) => {
  const spinnerClass = useMemo(
    () => `${sizeClasses[size]} border-primary-200 border-t-primary-500 rounded-full animate-spin`,
    [size]
  );

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={spinnerClass} />
      {text && <p className="text-gray-500 text-sm font-medium">{text}</p>}
    </div>
  );
});

Loading.displayName = 'Loading';

export const LoadingPage: React.FC = React.memo(() => (
  <div className="min-h-[70vh] flex items-center justify-center w-full">
    <Loading size="lg" text="Carregando conteúdo..." />
  </div>
));

LoadingPage.displayName = 'LoadingPage';

export const LoadingOverlay: React.FC = React.memo(() => (
  <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
    <Loading size="lg" text="Carregando..." />
  </div>
));

LoadingOverlay.displayName = 'LoadingOverlay';

export default Loading;
