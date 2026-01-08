import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular'
}) => {
    const baseClasses = 'skeleton inline-block';
    const variantClasses = {
        rectangular: 'rounded-xl',
        circular: 'rounded-full',
        text: 'rounded-md h-4 w-full'
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            aria-hidden="true"
        />
    );
};

export const SkeletonCard: React.FC = () => (
    <div className="glass-card-static p-6 space-y-4">
        <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2 flex-1">
                <Skeleton className="w-24 h-4" variant="text" />
                <Skeleton className="w-16 h-8" variant="text" />
            </div>
        </div>
    </div>
);

export const SkeletonCourseItem: React.FC = () => (
    <div className="glass-card-static p-4 flex items-start gap-4 !rounded-xl">
        <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
            <Skeleton className="w-3/4 h-5" variant="text" />
            <Skeleton className="w-full h-4" variant="text" />
            <div className="pt-2">
                <Skeleton className="w-full h-2 rounded-full" />
            </div>
        </div>
    </div>
);

export default Skeleton;
