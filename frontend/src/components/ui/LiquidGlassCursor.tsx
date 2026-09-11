import React, { useEffect, useRef, useState } from 'react';

interface LiquidGlassCursorProps {
  size?: number;
  enabled?: boolean;
}

export const LiquidGlassCursor: React.FC<LiquidGlassCursorProps> = ({
  size = 32,
  enabled = true
}) => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const targetPos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    const hasMousePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasMousePointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const handleElementCheck = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('a, button, input, textarea, select, [role="button"]');
      setIsHovering(!!isInteractive);
    };

    const animate = () => {
      const dx = targetPos.current.x - currentPos.current.x;
      const dy = targetPos.current.y - currentPos.current.y;

      // Smooth easing
      currentPos.current.x += dx * 0.15;
      currentPos.current.y += dy * 0.15;

      setPosition({ x: currentPos.current.x, y: currentPos.current.y });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousemove', handleElementCheck);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleElementCheck);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, isVisible]);

  if (!enabled) return null;

  const currentSize = isHovering ? size * 1.4 : size;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: currentSize,
        height: currentSize,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 99999,
        transform: `translate(${position.x - currentSize / 2}px, ${position.y - currentSize / 2}px)`,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease, width 0.15s ease, height 0.15s ease',
        // Clean blue glass gradient
        background: `
          radial-gradient(
            circle at 30% 30%,
            rgba(100, 180, 255, 0.35) 0%,
            rgba(80, 150, 230, 0.25) 30%,
            rgba(60, 130, 210, 0.15) 60%,
            rgba(40, 110, 190, 0.08) 100%
          )
        `,
        boxShadow: `
          inset 0 0 8px rgba(255, 255, 255, 0.25),
          0 0 12px rgba(100, 180, 255, 0.2),
          0 0 1px rgba(255, 255, 255, 0.4)
        `,
        border: '1px solid rgba(150, 200, 255, 0.25)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      {/* Specular highlight */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          left: '15%',
          width: '40%',
          height: '30%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, transparent 70%)',
          transform: 'rotate(-20deg)',
        }}
      />
    </div>
  );
};

export default LiquidGlassCursor;
