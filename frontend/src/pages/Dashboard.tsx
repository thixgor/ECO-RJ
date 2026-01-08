import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, MessageSquare, TrendingUp, AlertCircle, ArrowRight, Sparkles, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/api';
import { Course } from '../types';
import { GlassCard, GlassButton, GlassProgress, GlassBadge, SkeletonCard, SkeletonCourseItem } from '../components/ui';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Load enrolled courses progress
      if (user?.cursosInscritos && user.cursosInscritos.length > 0) {
        const progressData: Record<string, number> = {};

        // Extrair IDs dos cursos (pode ser string ou objeto Course)
        const cursoIds = user.cursosInscritos.map((curso: string | Course) => {
          if (typeof curso === 'string') {
            return curso;
          }
          return curso._id;
        });

        // Carregar progresso para cada curso
        for (const cursoId of cursoIds) {
          try {
            const response = await courseService.getProgress(cursoId);
            progressData[cursoId] = response.data.progresso;
          } catch {
            progressData[cursoId] = 0;
          }
        }
        setProgress(progressData);

        // Se os cursos já estão populados (objetos), usar diretamente
        // Caso contrário, carregar os detalhes
        const firstCurso = user.cursosInscritos[0];
        if (typeof firstCurso === 'object' && firstCurso._id) {
          // Cursos já populados
          setCourses(user.cursosInscritos as Course[]);
        } else {
          // Carregar detalhes dos cursos
          const coursePromises = cursoIds.map(id => courseService.getById(id));
          const courseResponses = await Promise.all(coursePromises);
          setCourses(courseResponses.map(r => r.data));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
                      ? new Date(user.ultimoLogin).toLocaleDateString('pt-BR', {
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
                      ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
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
