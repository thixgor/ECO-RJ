import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface LiquidGlassCursorProps {
  size?: number;
  color?: string;
  enabled?: boolean;
}

export const LiquidGlassCursor: React.FC<LiquidGlassCursorProps> = ({
  size = 80,
  // color is available for future customization
  color: _color = 'rgba(135, 206, 235, 0.3)',
  enabled = true
}) => {
  void _color; // Suppress unused variable warning
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Position refs for smooth animation
  const mousePos = useRef<Position>({ x: -200, y: -200 });
  const currentPos = useRef<Position>({ x: -200, y: -200 });
  const velocity = useRef<Position>({ x: 0, y: 0 });
  const animationFrame = useRef<number | null>(null);
  const lastTime = useRef<number>(0);
  const pulsePhase = useRef<number>(0);
  const isIdle = useRef<boolean>(false);
  const idleTimer = useRef<number | null>(null);

  // Check for touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  // Handle mouse/touch movement
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;

    if (clientX !== undefined && clientY !== undefined) {
      mousePos.current = { x: clientX, y: clientY };
      setIsVisible(true);
      isIdle.current = false;

      // Reset idle timer
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      idleTimer.current = window.setTimeout(() => {
        isIdle.current = true;
      }, 100);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!enabled || isTouchDevice) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Smooth interpolation factor
    const smoothness = 0.12;

    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastTime.current;
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isVisible) {
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
      const deformation = Math.min(speed * 0.15, 15);
      const angle = Math.atan2(vel.y, vel.x);

      // Pulse effect when idle
      const pulseAmount = idle ? Math.sin(phase * 2) * 3 : 0;
      const wobble = idle ? Math.sin(phase * 3) * 2 : 0;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      // Draw multiple layers for depth effect
      const layers = 4;
      for (let i = layers - 1; i >= 0; i--) {
        const layerProgress = i / layers;
        const layerSize = baseSize * (1 - layerProgress * 0.3) + pulseAmount;
        const stretchX = 1 + (deformation / baseSize) * (1 - layerProgress);
        const stretchY = 1 - (deformation / baseSize) * 0.3 * (1 - layerProgress);

        ctx.save();
        ctx.scale(stretchX, stretchY);

        // Create gradient for glass effect
        const gradient = ctx.createRadialGradient(
          -layerSize * 0.2 + wobble,
          -layerSize * 0.2,
          0,
          0,
          0,
          layerSize
        );

        // Glass-like colors with depth
        const alpha = 0.15 - layerProgress * 0.03;
        const highlightAlpha = 0.4 - layerProgress * 0.1;

        gradient.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
        gradient.addColorStop(0.2, `rgba(200, 230, 255, ${alpha + 0.1})`);
        gradient.addColorStop(0.5, `rgba(135, 206, 250, ${alpha})`);
        gradient.addColorStop(0.8, `rgba(100, 180, 230, ${alpha * 0.7})`);
        gradient.addColorStop(1, `rgba(70, 150, 200, ${alpha * 0.3})`);

        // Draw blob shape
        ctx.beginPath();
        const points = 60;
        for (let j = 0; j <= points; j++) {
          const t = (j / points) * Math.PI * 2;
          const noiseScale = idle ? 0.08 : 0.05;
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

        // Add subtle border glow
        if (i === 0) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 - speed * 0.01})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw specular highlight
      ctx.save();
      ctx.scale(1 + deformation / baseSize, 1 - deformation / baseSize * 0.3);

      const highlightGradient = ctx.createRadialGradient(
        -baseSize * 0.15 + wobble,
        -baseSize * 0.2,
        0,
        -baseSize * 0.1,
        -baseSize * 0.15,
        baseSize * 0.3
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.ellipse(
        -baseSize * 0.12 + wobble,
        -baseSize * 0.15,
        baseSize * 0.18,
        baseSize * 0.12,
        -0.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = highlightGradient;
      ctx.fill();
      ctx.restore();

      // Draw secondary highlight (caustics simulation)
      ctx.save();
      const causticGradient = ctx.createRadialGradient(
        baseSize * 0.1 + Math.sin(phase) * 5,
        baseSize * 0.15 + Math.cos(phase) * 3,
        0,
        baseSize * 0.1,
        baseSize * 0.15,
        baseSize * 0.2
      );
      causticGradient.addColorStop(0, 'rgba(200, 230, 255, 0.25)');
      causticGradient.addColorStop(1, 'rgba(200, 230, 255, 0)');

      ctx.beginPath();
      ctx.ellipse(
        baseSize * 0.1 + Math.sin(phase) * 5,
        baseSize * 0.12 + Math.cos(phase) * 3,
        baseSize * 0.12,
        baseSize * 0.08,
        0.3,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = causticGradient;
      ctx.fill();
      ctx.restore();

      // Draw refraction ring effect
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const refractionGradient = ctx.createRadialGradient(
        0, 0, baseSize * 0.3,
        0, 0, baseSize * 0.5
      );
      refractionGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      refractionGradient.addColorStop(0.5, 'rgba(200, 230, 255, 0.15)');
      refractionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, baseSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = refractionGradient;
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    // Start animation
    animationFrame.current = requestAnimationFrame(animate);

    // Event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [enabled, isTouchDevice, size, handleMouseMove, handleMouseLeave, handleMouseEnter]);

  // Don't render on touch devices or when disabled
  if (!enabled || isTouchDevice) return null;

  return (
    <canvas
      ref={canvasRef}
      className="liquid-glass-cursor"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    />
  );
};

export default LiquidGlassCursor;
