import React, { useEffect, useRef, useState } from 'react';

interface LiquidGlassCursorProps {
  size?: number;
  enabled?: boolean;
}

export const LiquidGlassCursor: React.FC<LiquidGlassCursorProps> = ({
  size = 60,
  enabled = true
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const targetPos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const velocity = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    // Check if device has mouse (not touch-only)
    const hasMousePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasMousePointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    // Check if hovering over interactive elements
    const handleElementCheck = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('a, button, input, textarea, select, [role="button"], [onclick]');
      setIsHovering(!!isInteractive);
    };

    // Animation loop for smooth following
    const animate = () => {
      const dx = targetPos.current.x - currentPos.current.x;
      const dy = targetPos.current.y - currentPos.current.y;

      // Smooth easing
      velocity.current.x += dx * 0.15;
      velocity.current.y += dy * 0.15;
      velocity.current.x *= 0.75;
      velocity.current.y *= 0.75;

      currentPos.current.x += velocity.current.x;
      currentPos.current.y += velocity.current.y;

      setPosition({ x: currentPos.current.x, y: currentPos.current.y });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousemove', handleElementCheck);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleElementCheck);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, isVisible]);

  // Don't render on touch devices
  if (!enabled) return null;

  const currentSize = isHovering ? size * 1.3 : size;

  return (
    <div
      ref={cursorRef}
      className="liquid-glass-cursor"
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
        transition: 'opacity 0.3s ease, width 0.2s ease, height 0.2s ease',
        background: `
          radial-gradient(
            circle at 30% 30%,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(200, 230, 255, 0.4) 20%,
            rgba(135, 206, 250, 0.3) 40%,
            rgba(100, 180, 230, 0.2) 60%,
            rgba(70, 150, 200, 0.1) 80%,
            transparent 100%
          )
        `,
        boxShadow: `
          inset 0 0 20px rgba(255, 255, 255, 0.5),
          inset 0 0 40px rgba(135, 206, 250, 0.3),
          0 0 30px rgba(135, 206, 250, 0.2),
          0 0 60px rgba(135, 206, 250, 0.1)
        `,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      {/* Inner highlight */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '35%',
          height: '25%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
          transform: 'rotate(-30deg)',
        }}
      />
      {/* Secondary highlight */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '25%',
          width: '20%',
          height: '15%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(200,230,255,0.6) 0%, rgba(200,230,255,0) 70%)',
          transform: 'rotate(20deg)',
        }}
      />
    </div>
  );
};

export default LiquidGlassCursor;
