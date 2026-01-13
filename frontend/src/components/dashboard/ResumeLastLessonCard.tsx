import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, BookOpen, Video, FileText, Loader2 } from 'lucide-react';
import { GlassCard, GlassProgress } from '../ui';
import { LastWatchedLesson } from '../../types';
import { formatDuration } from '../../utils/formatDuration';

interface ResumeLastLessonCardProps {
  lastLesson: LastWatchedLesson | null;
  isLoading: boolean;
}

const ResumeLastLessonCard: React.FC<ResumeLastLessonCardProps> = ({ lastLesson, isLoading }) => {
  if (isLoading) {
    return (
      <GlassCard hover={false} padding="lg" className="relative overflow-hidden">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      </GlassCard>
    );
  }

  if (!lastLesson) {
    return null;
  }

  const getTypeIcon = () => {
    switch (lastLesson.tipo) {
      case 'ao_vivo':
        return <Video className="w-5 h-5" />;
      case 'material':
        return <FileText className="w-5 h-5" />;
      default:
        return <Play className="w-5 h-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (lastLesson.tipo) {
      case 'ao_vivo':
        return 'Ao Vivo';
      case 'material':
        return 'Material';
      default:
        return 'Gravada';
    }
  };

  return (
    <Link to={`/aulas/${lastLesson._id}`} className="block group">
      <GlassCard
        hover={true}
        padding="none"
        className="relative overflow-hidden border-l-4 border-l-primary-500"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="p-4 relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white">
              <Play className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-primary-500 uppercase tracking-wide">
              Continuar de onde parou
            </span>
          </div>

          {/* Content */}
          <div className="space-y-2">
            {/* Lesson Title */}
            <h3 className="font-semibold text-[var(--color-text-primary)] line-clamp-2 group-hover:text-primary-500 transition-colors">
              {lastLesson.titulo}
            </h3>

            {/* Course Name */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="line-clamp-1">{lastLesson.cursoTitulo}</span>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--glass-bg)]">
                {getTypeIcon()}
                {getTypeLabel()}
              </span>
              {lastLesson.duracao && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(lastLesson.duracao)}
                </span>
              )}
            </div>

            {/* Progress Bar (if available) */}
            {lastLesson.progresso !== undefined && lastLesson.progresso > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1">
                  <span>Progresso</span>
                  <span>{Math.round(lastLesson.progresso)}%</span>
                </div>
                <GlassProgress value={lastLesson.progresso} size="sm" />
              </div>
            )}
          </div>

          {/* Play Button */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">
              {new Date(lastLesson.assistidaEm).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short'
              })}
            </span>
            <div className="flex items-center gap-2 text-primary-500 font-medium text-sm group-hover:gap-3 transition-all">
              <span>Retomar</span>
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 ml-0.5" />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
};

export default ResumeLastLessonCard;
