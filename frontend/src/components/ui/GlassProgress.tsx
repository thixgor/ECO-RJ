import React, { useEffect, useState } from 'react';

interface GlassProgressProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const GlassProgress: React.FC<GlassProgressProps> = ({
  value,
  max = 100,
  showLabel = false,
  label,
  size = 'md',
  animated = true,
  className = '',
}) => {
  const [currentValue, setCurrentValue] = useState(animated ? 0 : value);
  const percentage = Math.min(Math.max((currentValue / max) * 100, 0), 100);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setCurrentValue(value);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setCurrentValue(value);
    }
  }, [value, animated]);

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-sm font-semibold text-primary-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div className={`glass-progress ${sizeClasses[size]}`}>
        <div
          className="glass-progress-bar"
          style={{
            width: `${percentage}%`,
            transition: animated ? 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        />
      </div>
    </div>
  );
};

export default GlassProgress;
