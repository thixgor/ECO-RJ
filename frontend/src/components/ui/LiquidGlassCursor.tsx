import React, { useEffect, useRef, useState } from 'react';

interface LiquidGlassCursorProps {
  size?: number;
  enabled?: boolean;
}

export const LiquidGlassCursor: React.FC<LiquidGlassCursorProps> = ({
  size = 24,
  enabled = true
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trailPosition, setTrailPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });

  const targetPos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const vel = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    // Check if device has mouse
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
      const isInteractive = target.closest('a, button, input, textarea, select, [role="button"], [onclick]');
      setIsHovering(!!isInteractive);
    };

    const animate = () => {
      // Main cursor - fast follow
      const dx = targetPos.current.x - currentPos.current.x;
      const dy = targetPos.current.y - currentPos.current.y;

      vel.current.x += dx * 0.2;
      vel.current.y += dy * 0.2;
      vel.current.x *= 0.65;
      vel.current.y *= 0.65;

      currentPos.current.x += vel.current.x;
      currentPos.current.y += vel.current.y;

      // Trail - slower follow for liquid effect
      const tdx = currentPos.current.x - trailPos.current.x;
      const tdy = currentPos.current.y - trailPos.current.y;
      trailPos.current.x += tdx * 0.08;
      trailPos.current.y += tdy * 0.08;

      setPosition({ x: currentPos.current.x, y: currentPos.current.y });
      setTrailPosition({ x: trailPos.current.x, y: trailPos.current.y });
      setVelocity({ x: vel.current.x, y: vel.current.y });

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

  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
  const scale = isHovering ? 1.5 : 1 + Math.min(speed * 0.02, 0.3);
  const stretchX = 1 + Math.min(Math.abs(velocity.x) * 0.015, 0.2);
  const stretchY = 1 - Math.min(Math.abs(velocity.x) * 0.008, 0.1);
  const rotation = Math.atan2(velocity.y, velocity.x) * (180 / Math.PI);

  return (
    <>
      {/* Outer trail - very subtle blur ring */}
      <div
        ref={trailRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99998,
          transform: `translate(${trailPosition.x - (size * 1.8) / 2}px, ${trailPosition.y - (size * 1.8) / 2}px)`,
          opacity: isVisible ? 0.4 : 0,
          transition: 'opacity 0.3s ease',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Main cursor - subtle glass orb */}
      <div
        ref={cursorRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: `
            translate(${position.x - size / 2}px, ${position.y - size / 2}px)
            scale(${scale})
            scaleX(${stretchX})
            scaleY(${stretchY})
            rotate(${rotation}deg)
          `,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s ease',
          // Subtle glass effect with refraction-like border
          background: `
            radial-gradient(
              circle at 35% 35%,
              rgba(255, 255, 255, 0.15) 0%,
              rgba(255, 255, 255, 0.05) 40%,
              transparent 70%
            )
          `,
          // Refraction border effect - light bends at edges
          boxShadow: `
            inset 0 0 ${size * 0.3}px rgba(255, 255, 255, 0.1),
            inset 0 0 ${size * 0.1}px rgba(255, 255, 255, 0.15),
            0 0 1px rgba(255, 255, 255, 0.3),
            0 0 ${size * 0.15}px rgba(135, 206, 250, 0.08)
          `,
          border: '0.5px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(1px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(1px) saturate(1.1)',
        }}
      >
        {/* Tiny specular highlight */}
        <div
          style={{
            position: 'absolute',
            top: '18%',
            left: '22%',
            width: '28%',
            height: '20%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, transparent 70%)',
            transform: 'rotate(-25deg)',
          }}
        />
      </div>

      {/* Inner dot - precise pointer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 4,
          height: 4,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 100000,
          transform: `translate(${position.x - 2}px, ${position.y - 2}px)`,
          opacity: isVisible && !isHovering ? 0.6 : 0,
          transition: 'opacity 0.15s ease',
          background: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 0 2px rgba(0,0,0,0.2)',
        }}
      />
    </>
  );
};

export default LiquidGlassCursor;
