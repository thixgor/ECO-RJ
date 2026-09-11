import React from 'react';
import { Maximize2, X } from 'lucide-react';

interface FloatingMiniPlayerProps {
  embedHtml: string;
  isVisible: boolean;
  onExpand: () => void;
  onClose: () => void;
}

const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({
  embedHtml,
  isVisible,
  onExpand,
  onClose
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        w-72 md:w-80
        rounded-xl overflow-hidden
        shadow-2xl shadow-black/40
        border border-[var(--glass-border)]
        bg-black
        transform transition-all duration-300 ease-out
        ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}
        animate-slide-up
      `}
    >
      {/* Video Container - 16:9 aspect ratio */}
      <div className="relative" style={{ paddingBottom: '56.25%' }}>
        <div
          className="absolute inset-0"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />

        {/* Gradient overlay for controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white/80 hover:text-white transition-all z-10"
          title="Fechar mini-player"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Expand button - Main action */}
        <button
          onClick={onExpand}
          className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/90 hover:bg-primary-500 text-white text-xs font-medium transition-all hover:scale-105 z-10"
          title="Voltar ao tamanho normal"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Expandir</span>
        </button>

        {/* Label */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-white/80 text-xs z-10">
          Mini-player
        </div>
      </div>
    </div>
  );
};

export default FloatingMiniPlayer;
