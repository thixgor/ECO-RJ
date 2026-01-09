import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, User, Search, Mail, Key, Lock, ChevronDown, Star, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { courseService, siteConfigService } from '../services/api';
import { Course, User as UserType } from '../types';
import { CoursesGridSkeleton } from '../components/common/Loading';

const Courses: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [featuredCourseId, setFeaturedCourseId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Hide scroll hint on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollHint(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadData = async () => {
    try {
      // Carregar cursos e configurações em paralelo
      const [coursesRes, configRes] = await Promise.all([
        courseService.getAll({ ativo: 'true', limit: 1000 }),
        siteConfigService.get().catch(() => null) // Não falhar se config não existir
      ]);

      // Remover possíveis duplicatas baseado no _id
      const uniqueCourses = coursesRes.data.courses.filter(
        (course: Course, index: number, self: Course[]) =>
          index === self.findIndex((c) => c._id === course._id)
      );
      setCourses(uniqueCourses);

      // Verificar curso em destaque
      if (configRes?.data?.featuredCourse?.enabled && configRes.data.featuredCourse.courseId) {
        setFeaturedCourseId(configRes.data.featuredCourse.courseId);
      }
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight * 0.5, behavior: 'smooth' });
  };

  const isVisitor = user?.cargo === 'Visitante' || !isAuthenticated;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-72 animate-pulse" />
        </div>
        {/* Search skeleton */}
        <div className="mb-6">
          <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg max-w-md animate-pulse" />
        </div>
        {/* Grid skeleton */}
        <CoursesGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Nossos Cursos
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Explore nossa seleção de cursos em ecocardiografia
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-[var(--color-text-primary)] transition-all"
          />
        </div>
      </div>

      {/* Compact Visitor Alert - Only on desktop or collapsible on mobile */}
      {isVisitor && (
        <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-800 dark:text-amber-400 text-sm flex-1">
            {isAuthenticated ? (
              <>Você é Visitante. <Link to="/perfil" className="underline font-bold">Aplique uma Serial Key</Link> para acessar as aulas.</>
            ) : (
              <>Você não está logado. <Link to="/registro" className="underline font-bold">Registre-se</Link> para ter acesso completo.</>
            )}
          </p>
        </div>
      )}

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredCourses.map((course) => {
            const instrutor = course.instrutor as UserType;
            const isFeatured = featuredCourseId === course._id;

            return (
              <Link
                key={course._id}
                to={`/cursos/${course._id}`}
                className={`card overflow-hidden hover:-translate-y-1 transition-all duration-300 relative ${isFeatured
                  ? 'ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20'
                  : ''
                  }`}
                style={isFeatured ? {
                  animation: 'featured-glow 2s ease-in-out infinite'
                } : undefined}
              >
                {/* Featured Badge */}
                {isFeatured && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                    <Star className="w-3.5 h-3.5 fill-white" />
                    DESTAQUE
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`h-48 bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center ${isFeatured ? 'ring-1 ring-amber-500/30' : ''
                  }`}>
                  {course.imagemCapa ? (
                    <img
                      src={course.imagemCapa}
                      alt={course.titulo}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      loading="lazy"
                      decoding="async"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  ) : (
                    <BookOpen className="w-16 h-16 text-white/80" />
                  )}
                </div>
                <div className="p-6">
                  <h3 className={`font-heading text-xl font-semibold mb-2 line-clamp-2 ${isFeatured
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-[var(--color-text-primary)]'
                    }`}>
                    {course.titulo}
                  </h3>
                  <p className="text-[var(--color-text-secondary)] text-sm mb-4 line-clamp-2">
                    {course.descricao}
                  </p>
                  <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary-500" />
                      <span>{instrutor?.nomeCompleto || 'Instrutor'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      <span>
                        Início: {new Date(course.dataInicio).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 mb-8">
          <BookOpen className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-[var(--color-text-primary)] mb-2">
            {searchTerm ? 'Nenhum curso encontrado' : 'Nenhum curso disponível'}
          </h3>
          <p className="text-[var(--color-text-muted)]">
            {searchTerm
              ? 'Tente buscar com outros termos'
              : 'Em breve teremos novos cursos disponíveis'}
          </p>
        </div>
      )}

      {/* Info Cards - After courses, more compact */}
      {isVisitor && (
        <div className="grid sm:grid-cols-2 gap-4 pt-6 border-t border-[var(--glass-border)]">
          <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[var(--glass-border)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-[var(--color-text-primary)] text-sm">Como me inscrevo?</h3>
            </div>
            <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">
              Envie um e-mail para{' '}
              <a href="mailto:contato@cursodeecocardiografia.com" className="text-primary-500 font-bold hover:underline">
                contato@cursodeecocardiografia.com
              </a>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[var(--glass-border)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-[var(--color-text-primary)] text-sm">Como recebo acesso?</h3>
            </div>
            <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">
              Você receberá uma <strong>Serial Key</strong> por e-mail para ativar no seu perfil.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Scroll Hint */}
      {showScrollHint && filteredCourses.length > 2 && (
        <button
          onClick={scrollToContent}
          className="fixed bottom-6 right-6 w-12 h-12 bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center animate-bounce sm:hidden z-40"
          aria-label="Rolar para baixo"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Courses;
