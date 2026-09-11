import React from 'react';

interface AnimatedBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'normal' | 'vibrant';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  intensity = 'normal',
}) => {
  const opacityMap = {
    subtle: 'opacity-30',
    normal: 'opacity-50',
    vibrant: 'opacity-70',
  };

  return (
    <div className={`animated-bg ${opacityMap[intensity]} ${className}`}>
      <div className="animated-bg-blob" />
    </div>
  );
};

export default AnimatedBackground;
