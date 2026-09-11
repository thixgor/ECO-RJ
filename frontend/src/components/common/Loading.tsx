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
    () => `${sizeClasses[size]} border-primary-200 dark:border-primary-800 border-t-primary-500 rounded-full animate-spin`,
    [size]
  );

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={spinnerClass} />
      {text && <p className="text-[var(--color-text-muted)] text-sm font-medium">{text}</p>}
    </div>
  );
});

Loading.displayName = 'Loading';

/**
 * LoadingPage - Fullscreen loading that covers entire viewport including footer
 * Uses fixed positioning with blur backdrop to hide all content
 */
export const LoadingPage: React.FC<{ text?: string }> = React.memo(({ text = "Carregando..." }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-primary)]/95 dark:bg-[var(--color-bg-primary)]/95 backdrop-blur-sm">
    <Loading size="lg" text={text} />
  </div>
));

LoadingPage.displayName = 'LoadingPage';

/**
 * LoadingOverlay - Similar to LoadingPage but with higher z-index for modal overlays
 */
export const LoadingOverlay: React.FC<{ text?: string }> = React.memo(({ text = "Carregando..." }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-bg-primary)]/95 backdrop-blur-md">
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

/**
 * LoadingMinimal - Minimal loading for Suspense fallback (no text, fast transition)
 * Used for route transitions where we don't want a jarring full-screen loader
 */
export const LoadingMinimal: React.FC = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <Loading size="md" />
  </div>
));

LoadingMinimal.displayName = 'LoadingMinimal';

/**
 * CourseCardSkeleton - Skeleton for course cards during loading
 */
export const CourseCardSkeleton: React.FC = React.memo(() => (
  <div className="card overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200 dark:bg-gray-700" />
    <div className="p-6">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      </div>
    </div>
  </div>
));

CourseCardSkeleton.displayName = 'CourseCardSkeleton';

/**
 * CoursesGridSkeleton - Skeleton for courses grid
 */
export const CoursesGridSkeleton: React.FC<{ count?: number }> = React.memo(({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <CourseCardSkeleton key={i} />
    ))}
  </div>
));

CoursesGridSkeleton.displayName = 'CoursesGridSkeleton';

/**
 * CourseDetailSkeleton - Skeleton for course detail page
 */
export const CourseDetailSkeleton: React.FC = React.memo(() => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
    {/* Back button skeleton */}
    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6" />

    {/* Header */}
    <div className="grid lg:grid-cols-3 gap-8 mb-8">
      <div className="lg:col-span-2">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6" />
        <div className="flex flex-wrap gap-6">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      </div>

      {/* Enrollment Card skeleton */}
      <div className="card p-6">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>

    {/* Lessons skeleton */}
    <div className="card">
      <div className="p-6 border-b border-[var(--glass-border)]">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      </div>
      <div className="divide-y divide-[var(--glass-border)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

CourseDetailSkeleton.displayName = 'CourseDetailSkeleton';

export default Loading;
