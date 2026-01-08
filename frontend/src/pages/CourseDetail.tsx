import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, User, PlayCircle, Clock, Lock, CheckCircle, ArrowLeft, FolderOpen, ChevronDown, FileText, Video, Layers } from 'lucide-react';
import { courseService, lessonService, courseTopicService, courseSubtopicService } from '../services/api';
import { Course, Lesson, User as UserType, CourseTopic, CourseSubtopic } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LoadingPage } from '../components/common/Loading';
import toast from 'react-hot-toast';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<CourseTopic[]>([]);
  const [subtopics, setSubtopics] = useState<CourseSubtopic[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubtopics, setExpandedSubtopics] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({ totalAulas: 0, aulasAssistidas: 0, progresso: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const isEnrolled = user?.cursosInscritos?.some(
    (c) => (typeof c === 'string' ? c : c._id) === id
  );

  // Administrador tem acesso irrestrito, outros precisam verificar
  const isAdmin = user?.cargo === 'Administrador';
  const canViewLessons = isAdmin || ['Aluno', 'Instrutor'].includes(user?.cargo || '');

  // Toggle functions - MUST be defined before any conditional returns
  const toggleTopic = useCallback((e: React.MouseEvent, topicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTopics(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(topicId)) {
        newExpanded.delete(topicId);
      } else {
        newExpanded.add(topicId);
      }
      return newExpanded;
    });
  }, []);

  const toggleSubtopic = useCallback((e: React.MouseEvent, subtopicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSubtopics(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(subtopicId)) {
        newExpanded.delete(subtopicId);
      } else {
        newExpanded.add(subtopicId);
      }
      return newExpanded;
    });
  }, []);

  useEffect(() => {
    if (id) loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const [courseResponse, lessonsResponse, topicsResponse, subtopicsResponse] = await Promise.all([
        courseService.getById(id!),
        lessonService.getByCourse(id!).catch(() => ({ data: [] })),
        courseTopicService.getByCourse(id!).catch(() => ({ data: [] })),
        courseSubtopicService.getByCourse(id!).catch(() => ({ data: [] }))
      ]);

      setCourse(courseResponse.data);
      const lessonsData = lessonsResponse.data || [];
      setLessons(lessonsData);
      setTopics(topicsResponse.data || []);
      setSubtopics(subtopicsResponse.data || []);

      // Expand all topics and subtopics by default
      const allTopicIds = (topicsResponse.data || []).map((t: CourseTopic) => t._id);
      setExpandedTopics(new Set(allTopicIds));
      const allSubtopicIds = (subtopicsResponse.data || []).map((s: CourseSubtopic) => s._id);
      setExpandedSubtopics(new Set(allSubtopicIds));

      // Update metadata
      const title = `${courseResponse.data.titulo} | ECO RJ`;
      const description = courseResponse.data.descricao || '';
      document.title = title;

      const updateMeta = (property: string, content: string) => {
        const meta = document.querySelector(`meta[property="${property}"]`);
        if (meta) meta.setAttribute('content', content);
      };

      updateMeta('og:title', title);
      updateMeta('og:description', description);
      updateMeta('twitter:title', title);
      updateMeta('twitter:description', description);
      if (courseResponse.data.imagemCapa) {
        updateMeta('og:image', courseResponse.data.imagemCapa);
        updateMeta('twitter:image', courseResponse.data.imagemCapa);
      }

      if (isAuthenticated && isEnrolled) {
        try {
          const progressResponse = await courseService.getProgress(id!);
          setProgress(progressResponse.data);
        } catch {
          // Ignore progress errors
        }
      }
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      toast.error('Erro ao carregar curso');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/cursos/${id}` } });
      return;
    }

    setIsEnrolling(true);
    try {
      await courseService.enroll(id!);
      await refreshUser();
      toast.success('Inscrição realizada com sucesso!');
      loadCourse();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao se inscrever');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua inscrição?')) return;

    try {
      await courseService.unenroll(id!);
      await refreshUser();
      toast.success('Inscrição cancelada');
      loadCourse();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao cancelar inscrição');
    }
  };

  if (isLoading) {
    return <LoadingPage text="Carregando curso..." />;
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Curso não encontrado</h2>
        <Link to="/cursos" className="btn btn-primary">
          Ver todos os cursos
        </Link>
      </div>
    );
  }

  const instrutor = course.instrutor as UserType;

  // Organize lessons by topics and subtopics
  const lessonsWithoutTopic = lessons.filter(l => !(l as any).topicoId);
  const topicsWithContent = topics.map(topic => {
    const topicLessons = lessons.filter(l => {
      const topicoId = (l as any).topicoId;
      return topicoId && (typeof topicoId === 'string' ? topicoId === topic._id : topicoId._id === topic._id);
    });

    const topicSubtopics = subtopics.filter(s => {
      const tid = typeof s.topicoId === 'string' ? s.topicoId : s.topicoId._id;
      return tid === topic._id;
    });

    return {
      topic,
      lessonsNotInSubtopic: topicLessons.filter(l => !(l as any).subtopicoId),
      subtopics: topicSubtopics.map(subtopic => ({
        subtopic,
        lessons: topicLessons.filter(l => {
          const sid = (l as any).subtopicoId;
          return sid && (typeof sid === 'string' ? sid === subtopic._id : sid._id === subtopic._id);
        })
      }))
    };
  });

  // Render a single lesson item
  const renderLessonItem = (lesson: Lesson, index: number, showNumber = true) => {
    const isWatched = user?.aulasAssistidas?.includes(lesson._id);
    // Administrador tem acesso irrestrito (não precisa estar inscrito)
    const canAccess = isAdmin || (canViewLessons && isEnrolled);

    return (
      <div key={lesson._id} className="group w-full">
        {canAccess ? (
          <Link
            to={`/aulas/${lesson._id}`}
            className="w-full p-4 flex items-center gap-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              {isWatched ? (
                <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lesson.tipo === 'ao_vivo'
                  ? 'bg-red-100 dark:bg-red-500/20'
                  : lesson.tipo === 'material'
                    ? 'bg-purple-100 dark:bg-purple-500/20'
                    : 'bg-primary-100 dark:bg-primary-500/20'
                  }`}>
                  {lesson.tipo === 'ao_vivo' ? (
                    <Video className="w-5 h-5 text-red-500" />
                  ) : lesson.tipo === 'material' ? (
                    <FileText className="w-5 h-5 text-purple-500" />
                  ) : (
                    <PlayCircle className="w-5 h-5 text-primary-500" />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="font-medium text-[var(--color-text-primary)] group-hover:text-primary-500 transition-colors block">
                {showNumber ? `${index + 1}. ` : ''}{lesson.titulo}
              </span>
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mt-1">
                <span className={`px-2 py-0.5 rounded text-xs ${lesson.tipo === 'ao_vivo'
                  ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                  : lesson.tipo === 'material'
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>
                  {lesson.tipo === 'ao_vivo' ? 'Ao Vivo' : lesson.tipo === 'material' ? 'Material' : 'Gravada'}
                </span>
                {(lesson.duracao ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lesson.duracao} min
                  </span>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <div className="w-full p-4 flex items-center gap-4 bg-gray-50/30 dark:bg-white/5 opacity-75">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <span className="font-medium text-[var(--color-text-muted)] block">
                {showNumber ? `${index + 1}. ` : ''}{lesson.titulo}
              </span>
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mt-1">
                <span className={`px-2 py-0.5 rounded text-xs ${lesson.tipo === 'ao_vivo'
                  ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                  : lesson.tipo === 'material'
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>
                  {lesson.tipo === 'ao_vivo' ? 'Ao Vivo' : lesson.tipo === 'material' ? 'Material' : 'Gravada'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Back button */}
      <Link to="/cursos" className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-primary-500 mb-6 group transition-colors">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Voltar para cursos
      </Link>

      {/* Header */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            {course.titulo}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg mb-6">
            {course.descricao}
          </p>
          <div className="flex flex-wrap gap-6 text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              <span>{instrutor?.nomeCompleto || 'Instrutor'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <span>Início: {new Date(course.dataInicio).toLocaleDateString('pt-BR')}</span>
            </div>
            {(course as any).totalAulasRegulares > 0 && (
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary-500" />
                <span>{(course as any).totalAulasRegulares} aula{(course as any).totalAulasRegulares !== 1 ? 's' : ''}</span>
              </div>
            )}
            {(course as any).totalMateriais > 0 && (
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <span>{(course as any).totalMateriais} material{(course as any).totalMateriais !== 1 ? 'is' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Enrollment Card */}
        <div className="card p-6">
          <div className="h-40 bg-gradient-to-br from-primary-300 to-primary-500 rounded-lg mb-4 flex items-center justify-center">
            {course.imagemCapa ? (
              <img src={course.imagemCapa} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" decoding="async" />
            ) : (
              <BookOpen className="w-16 h-16 text-white/80" />
            )}
          </div>

          {isEnrolled ? (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--color-text-secondary)]">Seu progresso</span>
                  <span className="font-medium text-primary-500">{progress.progresso}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress.progresso}%` }}
                  />
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {progress.aulasAssistidas} de {progress.totalAulas} aulas
                </p>
              </div>
              <button
                onClick={handleUnenroll}
                className="btn btn-outline w-full"
              >
                Cancelar Inscrição
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              className={`btn btn-primary w-full ${!isEnrolling && (course as any).temAcessoConteudo ? 'animate-pulse-glow' : ''}`}
            >
              {isEnrolling ? 'Inscrevendo...' : 'Inscrever-se'}
            </button>
          )}
        </div>
      </div>

      {/* Lessons */}
      <div className="card">
        <div className="p-6 border-b border-[var(--glass-border)]">
          <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">Conteúdo do Curso</h2>
          {topics.length > 0 && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {topics.length} tópico{topics.length > 1 ? 's' : ''}
              {(course as any).totalAulasRegulares > 0 && ` • ${(course as any).totalAulasRegulares} aula${(course as any).totalAulasRegulares > 1 ? 's' : ''}`}
              {(course as any).totalMateriais > 0 && ` • ${(course as any).totalMateriais} material${(course as any).totalMateriais > 1 ? 'is' : ''}`}
            </p>
          )}
        </div>

        {(lessons.length > 0 || topics.length > 0) ? (
          <div>
            {/* Lessons without topic (at the top) */}
            {lessonsWithoutTopic.length > 0 && (
              <div className="divide-y divide-[var(--glass-border)]">
                {lessonsWithoutTopic.map((lesson, index) => renderLessonItem(lesson, index))}
              </div>
            )}

            {/* Topics with their lessons and subtopics */}
            {topicsWithContent.map(({ topic, lessonsNotInSubtopic, subtopics }) => (
              <div key={topic._id} className="border-t border-[var(--glass-border)]">
                {/* Topic header */}
                <button
                  onClick={(e) => toggleTopic(e, topic._id)}
                  className="w-full p-4 flex items-center gap-3 bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-[var(--color-text-primary)]">
                      {topic.titulo}
                    </h3>
                    {topic.descricao && (
                      <p className="text-sm text-[var(--color-text-muted)] line-clamp-1">{topic.descricao}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {lessonsNotInSubtopic.length + subtopics.reduce((acc, s) => acc + s.lessons.length, 0)} aulas
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform duration-200 ${expandedTopics.has(topic._id) ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Topic content (Lessons and Subtopics) */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-in-out bg-gray-50/50 dark:bg-white/[0.02] ${expandedTopics.has(topic._id) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden min-h-0">
                    {/* Lessons directly in topic */}
                    {lessonsNotInSubtopic.length > 0 && (
                      <div className="divide-y divide-[var(--glass-border)]">
                        {lessonsNotInSubtopic.map((lesson, index) => (
                          <div key={lesson._id} className="pl-4">
                            {renderLessonItem(lesson, index, false)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subtopics */}
                    {subtopics.map(({ subtopic, lessons: subtopicLessons }) => (
                      <div key={subtopic._id} className="border-t border-[var(--glass-border)] ml-6 border-l border-amber-500/20">
                        {/* Subtopic header */}
                        <button
                          onClick={(e) => toggleSubtopic(e, subtopic._id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 active:scale-[0.99] rounded-lg"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Layers className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                              {subtopic.titulo}
                            </h4>
                            <p className="text-[10px] text-[var(--color-text-muted)]">
                              {subtopicLessons.length} aula{subtopicLessons.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 ${expandedSubtopics.has(subtopic._id) ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Subtopic lessons */}
                        <div
                          className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${expandedSubtopics.has(subtopic._id) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        >
                          <div className="overflow-hidden">
                            {subtopicLessons.length > 0 ? (
                              <div className="divide-y divide-[var(--glass-border)]">
                                {subtopicLessons.map((lesson, index) => (
                                  <div key={lesson._id} className="pl-4">
                                    {renderLessonItem(lesson, index, false)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 text-center text-xs text-[var(--color-text-muted)] italic">
                                Nenhuma aula neste subtópico
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            Nenhuma aula disponível ainda
          </div>
        )}
      </div>

      {!canViewLessons && isAuthenticated && (
        <div className="mt-8 space-y-6 animate-slide-up">
          {/* Main Warning */}
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-amber-900 dark:text-amber-400 font-medium text-lg">
                Você precisa ser um Aluno para acessar as aulas.
              </p>
              <p className="text-amber-800 dark:text-amber-400/80 mt-1">
                Se você já possui uma Serial Key, <Link to="/perfil" className="underline font-bold hover:text-amber-600 transition-colors">aplique-a no seu perfil</Link> para ter acesso completo.
              </p>
            </div>
          </div>

          {/* Tutorial Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-[var(--glass-border)] hover:border-primary-500/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-[var(--color-text-primary)]">Não é um aluno ainda?</h3>
              </div>
              <div className="space-y-4">
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  Para se inscrever e receber o acesso, entre em contato com nossa equipe através do e-mail:
                </p>
                <div className="p-3 bg-primary-500/5 rounded-lg border border-primary-500/20 text-center">
                  <a href="mailto:contato@cursodeecocardiografia.com" className="text-sm font-bold text-primary-500 hover:underline">
                    contato@cursodeecocardiografia.com
                  </a>
                </div>
                <p className="text-[var(--color-text-muted)] text-xs leading-relaxed italic">
                  Nossa equipe responderá prontamente com os valores e detalhes do curso.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-[var(--glass-border)] hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-[var(--color-text-primary)]">Como o curso chega a mim?</h3>
              </div>
              <div className="space-y-4">
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  Após a confirmação da inscrição, você receberá uma chave de licença exclusiva:
                </p>
                <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Serial Key de Ativação</span>
                </div>
                <p className="text-[var(--color-text-muted)] text-xs leading-relaxed italic">
                  Basta inserir essa chave no seu perfil para liberar as aulas instantaneamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
