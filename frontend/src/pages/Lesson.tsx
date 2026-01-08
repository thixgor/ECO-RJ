import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, BookOpen, FileText, Play, ExternalLink, Download, Layers } from 'lucide-react';
import { lessonService, exerciseService } from '../services/api';
import { Lesson as LessonType, Exercise, Course } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { generateExercisePDF } from '../utils/pdfGenerator';
import { LoadingPage } from '../components/common/Loading';
import VideoWatermark from '../components/common/VideoWatermark';
import toast from 'react-hot-toast';

const Lesson: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonType | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  const isWatched = user?.aulasAssistidas?.includes(id || '');

  useEffect(() => {
    if (id) loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      const [lessonResponse, exercisesResponse] = await Promise.all([
        lessonService.getById(id!),
        exerciseService.getByLesson(id!)
      ]);

      setLesson(lessonResponse.data);
      setExercises(exercisesResponse.data);

      // Update metadata
      const title = `${lessonResponse.data.titulo} | ECO RJ`;
      const description = lessonResponse.data.descricao || '';
      document.title = title;

      const updateMeta = (property: string, content: string) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        if (meta) meta.setAttribute('content', content);
      };

      updateMeta('og:title', title);
      updateMeta('og:description', description);
      updateMeta('twitter:title', title);
      updateMeta('twitter:description', description);
    } catch (error: any) {
      console.error('Erro ao carregar aula:', error);
      if (error.response?.status === 403) {
        toast.error('Você não tem permissão para acessar esta aula');
        navigate('/perfil');
      } else {
        toast.error('Erro ao carregar aula');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsWatched = async () => {
    if (isWatched) return;

    setIsMarking(true);
    try {
      await lessonService.markAsWatched(id!);
      await refreshUser();
      toast.success('Aula marcada como assistida!');
    } catch (error) {
      toast.error('Erro ao marcar aula');
    } finally {
      setIsMarking(false);
    }
  };

  if (isLoading) {
    return <LoadingPage text="Carregando aula..." />;
  }

  if (!lesson) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Aula não encontrada</h2>
        <Link to="/cursos" className="btn btn-primary">
          Ver cursos
        </Link>
      </div>
    );
  }

  const curso = lesson.cursoId as Course;

  // Extract video ID from embed or URL
  const getVideoEmbed = () => {
    let embedCode = lesson.embedVideo || '';

    if (!embedCode) return '';

    // If it's a YouTube URL, convert to embed
    if (embedCode.includes('youtube.com/watch')) {
      const videoId = embedCode.split('v=')[1]?.split('&')[0];
      embedCode = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    } else if (embedCode.includes('youtu.be/')) {
      const videoId = embedCode.split('youtu.be/')[1]?.split('?')[0];
      embedCode = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    } else if (embedCode.includes('vimeo.com/')) {
      const videoId = embedCode.split('vimeo.com/')[1]?.split(/[?\/]/)[0];
      embedCode = `<iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    } else {
      // Process existing iframe embeds
      embedCode = embedCode.replace(/<iframe/gi, '<iframe style="position:absolute;top:0;left:0;width:100%;height:100%;"');
    }

    return embedCode;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Back button */}
      {curso && (
        <Link
          to={`/cursos/${typeof curso === 'string' ? curso : curso._id}`}
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-primary-500 mb-6 group transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para o curso
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {getVideoEmbed() && (
            <div className="card overflow-hidden">
              <div
                id="video-container"
                className="relative w-full"
                style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}
              >
                <div
                  className="absolute inset-0 bg-gray-900"
                  dangerouslySetInnerHTML={{ __html: getVideoEmbed() }}
                />
                <VideoWatermark />
              </div>
            </div>
          )}

          {/* Lesson Info */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {(lesson as any).topicoId && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 uppercase tracking-wider">
                      <BookOpen className="w-3 h-3" />
                      {(lesson as any).topicoId.titulo || (lesson as any).topicoId}
                    </div>
                  )}
                  {(lesson as any).subtopicoId && (
                    <>
                      <span className="text-gray-400 text-xs">/</span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                        <Layers className="w-3 h-3" />
                        {(lesson as any).subtopicoId.titulo || (lesson as any).subtopicoId}
                      </div>
                    </>
                  )}
                </div>
                <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  {lesson.titulo}
                </h1>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                  <span className={`px-2 py-0.5 rounded text-xs ${lesson.tipo === 'ao_vivo'
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    }`}>
                    {lesson.tipo === 'ao_vivo' ? 'Ao Vivo' : 'Gravada'}
                  </span>
                  {(lesson.duracao ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.duracao} min
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleMarkAsWatched}
                disabled={isWatched || isMarking}
                className={`btn ${isWatched
                  ? 'bg-green-100 text-green-600 cursor-default'
                  : 'btn-primary'
                  }`}
              >
                {isWatched ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Assistida
                  </>
                ) : isMarking ? (
                  'Marcando...'
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Marcar como Assistida
                  </>
                )}
              </button>
            </div>

            {lesson.descricao && (
              <p className="text-[var(--color-text-secondary)]">{lesson.descricao}</p>
            )}

            {/* Custom Buttons */}
            {lesson.botoesPersonalizados && lesson.botoesPersonalizados.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-8">
                {lesson.botoesPersonalizados.map((btn, idx) => (
                  <a
                    key={idx}
                    href={btn.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-white/5 border-2 border-primary-500 rounded-xl text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-700 dark:hover:text-primary-300 transition-all shadow-sm hover:shadow-md text-base group"
                  >
                    <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {btn.nome}
                  </a>
                ))}
              </div>
            )}

            {lesson.notasAula && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-[var(--glass-border)]">
                <h3 className="font-medium mb-2 flex items-center gap-2 text-[var(--color-text-primary)]">
                  <FileText className="w-4 h-4 text-primary-500" />
                  {lesson.tipo === 'material' ? 'Notas do Material' : 'Notas da Aula'}
                </h3>
                <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{lesson.notasAula}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Info */}
          {curso && (
            <div className="card p-6">
              <h3 className="font-heading font-semibold mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
                <BookOpen className="w-5 h-5 text-primary-500" />
                Curso
              </h3>
              <Link
                to={`/cursos/${typeof curso === 'string' ? curso : curso._id}`}
                className="text-primary-500 hover:underline font-medium"
              >
                {typeof curso === 'string' ? 'Ver curso' : curso.titulo}
              </Link>
            </div>
          )}

          {/* Exercises */}
          <div className="card">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h3 className="font-heading font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
                <Play className="w-5 h-5 text-primary-500" />
                Exercícios ({exercises.length})
              </h3>
            </div>
            <div className="divide-y divide-[var(--glass-border)]">
              {exercises.length > 0 ? (
                exercises.map((exercise) => (
                  <div key={exercise._id} className="flex items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                    <Link
                      to={`/exercicios/${exercise._id}`}
                      className="p-4 flex-1"
                    >
                      <p className="font-medium text-[var(--color-text-primary)] group-hover:text-primary-500 transition-colors">{exercise.titulo}</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {exercise.tipo === 'multipla_escolha' && 'Múltipla Escolha'}
                        {exercise.tipo === 'verdadeiro_falso' && 'Verdadeiro ou Falso'}
                        {exercise.tipo === 'dissertativo' && 'Dissertativo'}
                        {' · '}
                        {exercise.questoes.length} questões
                      </p>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        generateExercisePDF(exercise);
                      }}
                      className="mr-4 p-2 text-[var(--color-text-muted)] hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Baixar PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-[var(--color-text-muted)]">
                  Nenhum exercício disponível
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
