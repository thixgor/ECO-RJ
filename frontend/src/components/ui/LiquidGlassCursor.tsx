import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface LiquidGlassCursorProps {
  size?: number;
  enabled?: boolean;
}

export const LiquidGlassCursor: React.FC<LiquidGlassCursorProps> = ({
  size = 80,
  enabled = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Position refs for smooth animation
  const mousePos = useRef<Position>({ x: -200, y: -200 });
  const currentPos = useRef<Position>({ x: -200, y: -200 });
  const velocity = useRef<Position>({ x: 0, y: 0 });
  const animationFrame = useRef<number | null>(null);
  const lastTime = useRef<number>(0);
  const pulsePhase = useRef<number>(0);
  const isIdle = useRef<boolean>(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMouseMoved = useRef<boolean>(false);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };

    if (!hasMouseMoved.current) {
      hasMouseMoved.current = true;
      currentPos.current = { x: e.clientX, y: e.clientY };
    }

    setIsVisible(true);
    isIdle.current = false;

    // Reset idle timer
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    idleTimer.current = setTimeout(() => {
      isIdle.current = true;
    }, 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (!hasMouseMoved.current) {
      currentPos.current = { x: e.clientX, y: e.clientY };
    }
    setIsVisible(true);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!enabled) return;

    // Check if it's primarily a touch device (no mouse)
    // We check if there's a fine pointer (mouse) available
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!hasFinePointer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for sharpness
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Smooth interpolation factor
    const smoothness = 0.12;

    const animate = (timestamp: number) => {
      const deltaTime = Math.min(timestamp - lastTime.current, 50); // Cap delta time
      lastTime.current = timestamp;

      // Calculate target velocity
      const targetVelX = (mousePos.current.x - currentPos.current.x) * smoothness;
      const targetVelY = (mousePos.current.y - currentPos.current.y) * smoothness;

      // Smooth velocity changes
      velocity.current.x += (targetVelX - velocity.current.x) * 0.3;
      velocity.current.y += (targetVelY - velocity.current.y) * 0.3;

      // Apply velocity
      currentPos.current.x += velocity.current.x;
      currentPos.current.y += velocity.current.y;

      // Update pulse phase
      pulsePhase.current += deltaTime * 0.003;

      // Clear canvas
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isVisible && hasMouseMoved.current) {
        drawLiquidGlass(ctx, currentPos.current, velocity.current, pulsePhase.current, isIdle.current);
      }

      animationFrame.current = requestAnimationFrame(animate);
    };

    const drawLiquidGlass = (
      ctx: CanvasRenderingContext2D,
      pos: Position,
      vel: Position,
      phase: number,
      idle: boolean
    ) => {
      const baseSize = size;

      // Calculate deformation based on velocity
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      const deformation = Math.min(speed * 0.2, 20);
      const angle = Math.atan2(vel.y, vel.x);

      // Pulse effect when idle
      const pulseAmount = idle ? Math.sin(phase * 2) * 4 : 0;
      const wobble = idle ? Math.sin(phase * 3) * 3 : 0;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      // Draw outer glow
      const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseSize * 0.8);
      glowGradient.addColorStop(0, 'rgba(135, 206, 250, 0.15)');
      glowGradient.addColorStop(0.5, 'rgba(135, 206, 250, 0.05)');
      glowGradient.addColorStop(1, 'rgba(135, 206, 250, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, baseSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Draw multiple layers for depth effect
      const layers = 3;
      for (let i = layers - 1; i >= 0; i--) {
        const layerProgress = i / layers;
        const layerSize = baseSize * (1 - layerProgress * 0.25) + pulseAmount;
        const stretchX = 1 + (deformation / baseSize) * (1 - layerProgress);
        const stretchY = 1 - (deformation / baseSize) * 0.25 * (1 - layerProgress);

        ctx.save();
        ctx.scale(stretchX, stretchY);

        // Create gradient for glass effect
        const gradient = ctx.createRadialGradient(
          -layerSize * 0.15 + wobble,
          -layerSize * 0.15,
          0,
          0,
          0,
          layerSize * 0.5
        );

        // Glass-like colors with more opacity
        const alpha = 0.25 - layerProgress * 0.05;
        const highlightAlpha = 0.5 - layerProgress * 0.1;

        gradient.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
        gradient.addColorStop(0.3, `rgba(200, 230, 255, ${alpha + 0.15})`);
        gradient.addColorStop(0.6, `rgba(135, 206, 250, ${alpha})`);
        gradient.addColorStop(0.85, `rgba(100, 180, 230, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(70, 150, 200, ${alpha * 0.2})`);

        // Draw blob shape
        ctx.beginPath();
        const points = 48;
        for (let j = 0; j <= points; j++) {
          const t = (j / points) * Math.PI * 2;
          const noiseScale = idle ? 0.1 : 0.06;
          const noise = Math.sin(t * 3 + phase) * noiseScale * layerSize +
                       Math.sin(t * 5 - phase * 1.5) * noiseScale * 0.5 * layerSize;
          const r = layerSize * 0.5 + noise;
          const x = Math.cos(t) * r;
          const y = Math.sin(t) * r;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Fill with gradient
        ctx.fillStyle = gradient;
        ctx.fill();

        // Add border glow on outer layer
        if (i === 0) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 - speed * 0.01})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw main specular highlight
      ctx.save();
      ctx.scale(1 + deformation / baseSize, 1 - deformation / baseSize * 0.25);

      const highlightGradient = ctx.createRadialGradient(
        -baseSize * 0.12 + wobble,
        -baseSize * 0.15,
        0,
        -baseSize * 0.08,
        -baseSize * 0.12,
        baseSize * 0.25
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      highlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.ellipse(
        -baseSize * 0.1 + wobble,
        -baseSize * 0.12,
        baseSize * 0.15,
        baseSize * 0.1,
        -0.4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = highlightGradient;
      ctx.fill();
      ctx.restore();

      // Draw secondary caustic highlight
      ctx.save();
      const causticGradient = ctx.createRadialGradient(
        baseSize * 0.08 + Math.sin(phase) * 4,
        baseSize * 0.1 + Math.cos(phase) * 3,
        0,
        baseSize * 0.08,
        baseSize * 0.1,
        baseSize * 0.15
      );
      causticGradient.addColorStop(0, 'rgba(200, 240, 255, 0.35)');
      causticGradient.addColorStop(1, 'rgba(200, 240, 255, 0)');

      ctx.beginPath();
      ctx.ellipse(
        baseSize * 0.08 + Math.sin(phase) * 4,
        baseSize * 0.08 + Math.cos(phase) * 3,
        baseSize * 0.1,
        baseSize * 0.06,
        0.3,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = causticGradient;
      ctx.fill();
      ctx.restore();

      // Draw inner refraction ring
      ctx.save();
      const refractionGradient = ctx.createRadialGradient(
        0, 0, baseSize * 0.25,
        0, 0, baseSize * 0.45
      );
      refractionGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      refractionGradient.addColorStop(0.5, 'rgba(200, 230, 255, 0.12)');
      refractionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, baseSize * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = refractionGradient;
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    // Start animation
    lastTime.current = performance.now();
    animationFrame.current = requestAnimationFrame(animate);

    // Event listeners on document for full coverage
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [enabled, size, handleMouseMove, handleMouseLeave, handleMouseEnter]);

  // Check if fine pointer is available (has mouse)
  const [hasMouse, setHasMouse] = useState(true);

  useEffect(() => {
    const checkMouse = () => {
      setHasMouse(window.matchMedia('(pointer: fine)').matches);
    };
    checkMouse();

    const mediaQuery = window.matchMedia('(pointer: fine)');
    mediaQuery.addEventListener('change', checkMouse);
    return () => mediaQuery.removeEventListener('change', checkMouse);
  }, []);

  // Don't render when disabled or no mouse
  if (!enabled || !hasMouse) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
      }}
    />
  );
};

export default LiquidGlassCursor;
