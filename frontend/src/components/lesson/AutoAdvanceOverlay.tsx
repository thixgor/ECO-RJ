import React, { useState, useEffect, useCallback } from 'react';
import { Play, X } from 'lucide-react';

interface AutoAdvanceOverlayProps {
  nextLesson: {
    _id: string;
    titulo: string;
  };
  onNavigate: () => void;
  onCancel: () => void;
  countdownSeconds?: number;
}

const AutoAdvanceOverlay: React.FC<AutoAdvanceOverlayProps> = ({
  nextLesson,
  onNavigate,
  onCancel,
  countdownSeconds = 5
}) => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [progress, setProgress] = useState(0);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel();
  }, [onCancel]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      onNavigate();
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
      setProgress(prev => prev + (100 / countdownSeconds));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, countdownSeconds, onNavigate]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center z-30 cursor-pointer animate-fade-in"
      onClick={handleCancel}
    >
      {/* Cancel hint */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-white/60 text-sm">
        <span>Clique em qualquer lugar para cancelar</span>
        <X className="w-4 h-4" />
      </div>

      {/* Countdown Circle */}
      <div className="relative w-32 h-32 mb-6">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={351.86} // 2 * PI * 56
            strokeDashoffset={351.86 * (1 - progress / 100)}
            className="transition-all duration-1000 ease-linear"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Countdown number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold text-white tabular-nums">
            {countdown}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="text-center px-4 max-w-md">
        <p className="text-white/80 text-lg mb-2">
          Próxima aula em {countdown}...
        </p>
        <h3 className="text-white text-2xl font-bold line-clamp-2 mb-6">
          {nextLesson.titulo}
        </h3>
      </div>

      {/* Play button (clicking navigates immediately) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate();
        }}
        className="flex items-center gap-3 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-full font-semibold text-lg shadow-lg shadow-primary-500/30 hover:scale-105 transition-all duration-200"
      >
        <Play className="w-5 h-5" />
        Assistir Agora
      </button>

      {/* Cancel button */}
      <button
        onClick={handleCancel}
        className="mt-4 px-4 py-2 text-white/60 hover:text-white text-sm transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
};

export default AutoAdvanceOverlay;
