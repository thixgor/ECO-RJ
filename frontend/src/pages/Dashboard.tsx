import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, MessageSquare, TrendingUp, AlertCircle, ArrowRight, Sparkles, User, Video, Calendar, PlayCircle, X, Bell, Globe, Users, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { courseService, lessonService, announcementService } from '../services/api';
import { Course, Lesson, Announcement, LastWatchedLesson } from '../types';
import { GlassCard, GlassButton, GlassProgress, GlassBadge, SkeletonCard, SkeletonCourseItem } from '../components/ui';
import { formatDuration } from '../utils/formatDuration';
import ResumeLastLessonCard from '../components/dashboard/ResumeLastLessonCard';
import toast from 'react-hot-toast';
import { formatarDataCom, formatarHora } from '../utils/datetime';

// Interface para aulas ao vivo do dia
interface LiveLessonEvent {
  lesson: Lesson;
  course: Course;
  startsAt: Date;
  minutesUntilStart: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [liveLessonsToday, setLiveLessonsToday] = useState<LiveLessonEvent[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [notifiedLessons, setNotifiedLessons] = useState<Set<string>>(new Set());
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [lastWatchedLesson, setLastWatchedLesson] = useState<LastWatchedLesson | null>(null);
  const [isLoadingLastWatched, setIsLoadingLastWatched] = useState(true);

  // Espelho do usuário atual, lido dentro de `loadData` sem entrar nas suas
  // dependências (só a lista de cursos deve disparar uma nova carga).
  const userRef = useRef(user);
  userRef.current = user;

  // IDs dos cursos inscritos, em uma chave ESTÁVEL.
  //
  // `loadData` dependia do objeto `user` inteiro. Como o AuthContext substitui
  // esse objeto ao revalidar o perfil no início da sessão, a identidade mudava e
  // o efeito refazia a carga toda — N requisições de progresso + N de curso
  // disparadas duas vezes em todo acesso ao dashboard. Comparando a lista de IDs
  // como string, a carga só se repete quando os cursos realmente mudam.
  const cursoIdsKey = useMemo(() => {
    const ids = (user?.cursosInscritos || []).map((curso: string | Course) =>
      typeof curso === 'string' ? curso : curso._id
    );
    return ids.join(',');
  }, [user?.cursosInscritos]);

  // Carregar dados com otimização - usar Promise.all para paralelizar
  const loadData = useCallback(async () => {
    const cursoIds = cursoIdsKey ? cursoIdsKey.split(',') : [];
    if (cursoIds.length === 0) {
      setCourses([]);
      setProgress({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Carregar tudo em paralelo para otimizar
      const [progressResults, courseResults] = await Promise.all([
        // Carregar progresso de todos os cursos em paralelo
        Promise.all(
          cursoIds.map(async (cursoId) => {
            try {
              const response = await courseService.getProgress(cursoId);
              return { id: cursoId, progress: response.data.progresso };
            } catch {
              return { id: cursoId, progress: 0 };
            }
          })
        ),
        // Carregar detalhes dos cursos se necessário.
        // `/auth/me` já popula os cursos com título e capa; quando vierem
        // populados aproveitamos e evitamos N requisições.
        (async () => {
          const inscritos = userRef.current?.cursosInscritos || [];
          const primeiro = inscritos[0];
          if (typeof primeiro === 'object' && primeiro?._id) {
            return inscritos as Course[];
          }
          const responses = await Promise.all(cursoIds.map((id) => courseService.getById(id)));
          return responses.map((r) => r.data);
        })()
      ]);

      // Processar resultados de progresso
      const progressData: Record<string, number> = {};
      progressResults.forEach(({ id, progress }) => {
        progressData[id] = progress;
      });

      setProgress(progressData);
      setCourses(courseResults);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursoIdsKey]);

  // Carregar aulas ao vivo do dia usando a API dedicada
  const loadLiveLessonsToday = useCallback(async () => {
    try {
      const response = await lessonService.getLiveToday();
      const lessons = response.data.lessons || [];

      // Mapear aulas para eventos com informações do curso
      const events: LiveLessonEvent[] = lessons.map((lesson: any) => {
        const course = lesson.cursoId as Course;
        const startsAt = new Date(lesson.dataHoraInicio!);
        const now = new Date();
        const minutesUntilStart = Math.floor((startsAt.getTime() - now.getTime()) / 60000);

        return {
          lesson,
          course: course!,
          startsAt,
          minutesUntilStart
        };
      }).filter((e: LiveLessonEvent) => e.course);

      // Ordenar por horário de início
      events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

      setLiveLessonsToday(events);
    } catch (error) {
      console.error('Erro ao carregar aulas ao vivo:', error);
    }
  }, []);

  // Carregar avisos do usuario
  const loadAnnouncements = useCallback(async () => {
    setIsLoadingAnnouncements(true);
    try {
      const response = await announcementService.getUserAnnouncements();
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  }, []);

  // Carregar última aula assistida
  const loadLastWatchedLesson = useCallback(async () => {
    setIsLoadingLastWatched(true);
    try {
      const response = await lessonService.getLastWatched();
      setLastWatchedLesson(response.data.lastWatched || null);
    } catch (error) {
      console.error('Erro ao carregar última aula:', error);
    } finally {
      setIsLoadingLastWatched(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadAnnouncements();
    loadLiveLessonsToday();
    loadLastWatchedLesson();
  }, [loadData, loadAnnouncements, loadLiveLessonsToday, loadLastWatchedLesson]);

  // Atualizar minutesUntilStart a cada minuto e verificar notificações
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveLessonsToday(prev => {
        const now = new Date();
        return prev.map(event => ({
          ...event,
          minutesUntilStart: Math.floor((event.startsAt.getTime() - now.getTime()) / 60000)
        }));
      });
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, []);

  // Sistema de notificações para aulas ao vivo
  useEffect(() => {
    const checkNotifications = () => {
      liveLessonsToday.forEach(event => {
        const key = `${event.lesson._id}`;
        const minutes = event.minutesUntilStart;

        // Notificar em 1h, 30min, 10min, 5min e 1min antes
        const notifyAt = [60, 30, 10, 5, 1];

        notifyAt.forEach(threshold => {
          const notifyKey = `${key}-${threshold}`;
          if (minutes <= threshold && minutes > threshold - 1 && !notifiedLessons.has(notifyKey)) {
            // Disparar notificação
            let message: string;
            if (minutes <= 1) {
              message = `A aula "${event.lesson.titulo}" está começando agora!`;
            } else if (threshold === 60) {
              message = `A aula "${event.lesson.titulo}" começa em 1 hora!`;
            } else {
              message = `A aula "${event.lesson.titulo}" começa em ${threshold} minutos!`;
            }

            toast(message, {
              icon: '🔴',
              duration: 8000,
              style: {
                background: '#1e40af',
                color: '#fff',
              },
            });

            setNotifiedLessons(prev => new Set([...prev, notifyKey]));
          }
        });
      });
    };

    // Verificar imediatamente e a cada 30 segundos
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, [liveLessonsToday, notifiedLessons]);

  // Fechar notificação de aula
  const dismissLessonNotification = (lessonId: string) => {
    setDismissedNotifications(prev => new Set([...prev, lessonId]));
  };

  // Filtrar eventos não dispensados - mostrar aulas do dia até a duração terminar
  const visibleLiveLessons = useMemo(() => {
    return liveLessonsToday.filter(event => {
      if (dismissedNotifications.has(event.lesson._id)) return false;

      const duracao = event.lesson.duracao;

      // Se não tem duração definida (0 ou undefined), mostrar o dia todo
      if (!duracao || duracao === 0) {
        return true;
      }

      // Se tem duração, calcular quando termina
      const minutosAteTerminar = event.minutesUntilStart + duracao;

      // Mostrar enquanto não terminou
      return minutosAteTerminar > 0;
    });
  }, [liveLessonsToday, dismissedNotifications]);

  const isVisitante = user?.cargo === 'Visitante';
  const firstName = user?.nomeCompleto ? (
    ['Prof.', 'Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(user.nomeCompleto.split(' ')[0])
      ? user.nomeCompleto.split(' ').slice(0, 2).join(' ')
      : user.nomeCompleto.split(' ')[0]
  ) : 'Usuário';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-[var(--color-text-primary)]">
            Olá, <span className="text-gradient">{firstName}</span>
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            Bem-vindo de volta! Continue de onde parou.
          </p>
        </div>

        <GlassBadge variant="primary" size="lg" icon={<Sparkles className="w-4 h-4" />}>
          {user?.cargo}
        </GlassBadge>
      </div>

      {/* Alert for visitors */}
      {isVisitante && (
        <GlassCard hover={false} padding="lg" className="border-l-4 border-l-amber-400">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--color-text-primary)]">Acesso Limitado</h3>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">
                Você está como Visitante. Para acessar as aulas e exercícios, aplique uma serial key válida no seu perfil.
              </p>
              <Link to="/perfil" className="inline-flex items-center gap-2 mt-3 text-primary-500 hover:text-primary-600 font-medium text-sm transition-colors">
                Ir para o Perfil
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Announcements Section */}
      {!isLoadingAnnouncements && announcements.length > 0 && (
        <GlassCard hover={false} padding="none" className="overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-primary-500/10 to-transparent border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
                  Avisos
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {announcements.length} aviso{announcements.length > 1 ? 's' : ''} para você
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[var(--glass-border)]">
            {announcements.map((announcement) => {
              const isHighPriority = announcement.prioridade === 'alta';
              const isNormalPriority = announcement.prioridade === 'normal';
              const cursosAlvo = announcement.cursosAlvo as Course[];

              const getTipoIcon = () => {
                switch (announcement.tipo) {
                  case 'geral':
                    return <Globe className="w-4 h-4" />;
                  case 'alunos':
                    return <Users className="w-4 h-4" />;
                  case 'curso_especifico':
                    return <BookOpen className="w-4 h-4" />;
                  default:
                    return <Info className="w-4 h-4" />;
                }
              };

              const getTipoLabel = () => {
                switch (announcement.tipo) {
                  case 'geral':
                    return 'Aviso Geral';
                  case 'alunos':
                    return 'Para Alunos';
                  case 'curso_especifico':
                    return cursosAlvo.length > 0
                      ? cursosAlvo.map(c => typeof c === 'string' ? c : c.titulo).join(', ')
                      : 'Curso Especifico';
                  default:
                    return 'Aviso';
                }
              };

              return (
                <div
                  key={announcement._id}
                  className={`p-4 transition-colors ${
                    isHighPriority ? 'bg-red-500/5 border-l-4 border-l-red-500' :
                    isNormalPriority ? 'bg-amber-500/5 border-l-4 border-l-amber-500' :
                    'border-l-4 border-l-gray-300 dark:border-l-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Priority Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isHighPriority ? 'bg-red-500/20' :
                      isNormalPriority ? 'bg-amber-500/20' :
                      'bg-gray-500/20'
                    }`}>
                      <Bell className={`w-5 h-5 ${
                        isHighPriority ? 'text-red-500' :
                        isNormalPriority ? 'text-amber-500' :
                        'text-gray-500'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-[var(--color-text-primary)]">
                          {announcement.titulo}
                        </h3>
                        {isHighPriority && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                            Importante
                          </span>
                        )}
                      </div>

                      <p className="text-[var(--color-text-muted)] text-sm whitespace-pre-line">
                        {announcement.conteudo}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-xs text-[var(--color-text-muted)]">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${
                          announcement.tipo === 'geral' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                          announcement.tipo === 'alunos' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                        }`}>
                          {getTipoIcon()}
                          {getTipoLabel()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatarDataCom(announcement.createdAt, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Eventos do Dia - Aulas ao Vivo */}
      {visibleLiveLessons.length > 0 && (
        <GlassCard hover={false} padding="none" className="border-l-4 border-l-red-500 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-red-500/10 to-transparent border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-500" />
                  Eventos do Dia
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {visibleLiveLessons.length} aula{visibleLiveLessons.length > 1 ? 's' : ''} ao vivo programada{visibleLiveLessons.length > 1 ? 's' : ''} para hoje
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[var(--glass-border)]">
            {visibleLiveLessons.map((event) => {
              const duracao = event.lesson.duracao;
              const hasDuration = duracao && duracao > 0;
              const isStartingSoon = event.minutesUntilStart <= 10 && event.minutesUntilStart > 0;
              // Aula começou (minutesUntilStart <= 0)
              const hasStarted = event.minutesUntilStart <= 0;
              // Se tem duração, está "ao vivo" até terminar; se não tem, está "ao vivo" o dia todo
              const isLive = hasStarted && (!hasDuration || event.minutesUntilStart > -duracao!);
              const isPast = hasDuration && event.minutesUntilStart <= -duracao!;

              const formatTimeUntil = () => {
                if (isPast) return 'Encerrada';
                if (hasStarted) return 'A aula já começou';
                if (event.minutesUntilStart < 60) {
                  return `Começa em ${event.minutesUntilStart} min`;
                }
                const hours = Math.floor(event.minutesUntilStart / 60);
                const mins = event.minutesUntilStart % 60;
                return `Começa em ${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
              };

              return (
                <div
                  key={event.lesson._id}
                  className={`p-4 transition-colors ${isLive ? 'bg-red-500/5' : isStartingSoon ? 'bg-amber-500/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isLive ? 'bg-red-500 animate-pulse' :
                      isStartingSoon ? 'bg-amber-500' :
                      isPast ? 'bg-gray-400' : 'bg-primary-500'
                    }`}>
                      {isLive ? (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                          <Video className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <PlayCircle className="w-6 h-6 text-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                          {event.lesson.titulo}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isLive ? 'bg-red-500 text-white animate-pulse' :
                          isStartingSoon ? 'bg-amber-500 text-white' :
                          isPast ? 'bg-gray-400 text-white' : 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400'
                        }`}>
                          {formatTimeUntil()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-sm text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {event.course?.titulo || 'Curso'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatarHora(event.startsAt)}
                          {event.lesson.duracao ? ` (${formatDuration(event.lesson.duracao)})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isPast && (
                        <Link
                          to={`/aulas/${event.lesson._id}`}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            isLive
                              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                              : isStartingSoon
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                          }`}
                        >
                          {isLive ? 'Assistir Agora' : 'Acessar Aula'}
                        </Link>
                      )}
                      <button
                        onClick={() => dismissLessonNotification(event.lesson._id)}
                        className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        title="Dispensar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <GlassCard padding="lg" className="group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] text-sm">Cursos Inscritos</p>
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">{courses.length}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard padding="lg" className="group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] text-sm">Aulas Assistidas</p>
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">{user?.aulasAssistidas?.length || 0}</p>
                </div>
              </div>
            </GlassCard>

            <Link to="/exercicios" className="block">
              <GlassCard padding="lg" className="group h-full">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-[var(--color-text-muted)] text-sm">Exercícios</p>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">{user?.exerciciosRespondidos?.length || 0}</p>
                  </div>
                </div>
              </GlassCard>
            </Link>

            <GlassCard padding="lg" className="group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] text-sm">Fórum</p>
                  <Link to="/forum" className="text-lg font-bold text-primary-500 hover:text-primary-600 transition-colors">
                    Acessar
                  </Link>
                </div>
              </div>
            </GlassCard>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Courses */}
        <div className="lg:col-span-2">
          <GlassCard hover={false} padding="none">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">Meus Cursos</h2>
                <Link to="/cursos" className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors">
                  Ver todos
                </Link>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  <SkeletonCourseItem />
                  <SkeletonCourseItem />
                </div>
              ) : courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.map((course, index) => (
                    <Link
                      key={course._id}
                      to={`/cursos/${course._id}`}
                      className="block"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <GlassCard padding="md" className="!rounded-xl">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-400/20 to-primary-600/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {course.imagemCapa ? (
                              <img
                                src={course.imagemCapa}
                                alt={course.titulo}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <BookOpen className="w-8 h-8 text-primary-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{course.titulo}</h3>
                            <p className="text-sm text-[var(--color-text-muted)] line-clamp-1">{course.descricao}</p>
                            <div className="mt-3">
                              <GlassProgress
                                value={progress[course._id] || 0}
                                showLabel
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-[var(--glass-bg)] flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-10 h-10 text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-[var(--color-text-muted)] mb-6">Você ainda não está inscrito em nenhum curso</p>
                  <GlassButton variant="primary" onClick={() => window.location.href = '/cursos'}>
                    <BookOpen className="w-5 h-5" />
                    Explorar Cursos
                  </GlassButton>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Resume Last Lesson */}
          <ResumeLastLessonCard
            lastLesson={lastWatchedLesson}
            isLoading={isLoadingLastWatched}
          />

          {/* Quick Actions */}
          <GlassCard hover={false} padding="none">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">Ações Rápidas</h2>
            </div>
            <div className="p-4 space-y-2">
              <Link
                to="/cursos"
                className="nav-link-glass"
              >
                <BookOpen className="w-5 h-5 text-primary-500" />
                <span>Ver Todos os Cursos</span>
              </Link>
              <Link
                to="/exercicios"
                className="nav-link-glass"
              >
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span>Meus Exercícios</span>
              </Link>
              <Link
                to="/forum"
                className="nav-link-glass"
              >
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <span>Acessar Fórum</span>
              </Link>
              <Link
                to="/perfil"
                className="nav-link-glass"
              >
                <User className="w-5 h-5 text-emerald-500" />
                <span>Meu Perfil</span>
              </Link>
            </div>
          </GlassCard>

          {/* User Info */}
          <GlassCard hover={false} padding="none">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">Informações</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Último acesso</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {user?.ultimoLogin
                      ? formatarDataCom(user.ultimoLogin, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                      : 'Primeiro acesso'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Membro desde</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {user?.createdAt
                      ? formatarDataCom(user.createdAt, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
