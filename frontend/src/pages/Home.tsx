import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Key, CheckCircle, Play, Award, ChevronDown, Heart, Activity, Star, Quote, ChevronRight, Sparkles, Users } from 'lucide-react';
import { GlassCard, GlassButton, GlassBadge } from '../components/ui';
import { siteConfigService, courseService } from '../services/api';
import { Course } from '../types';

const PROFESSOR_IMAGE = 'https://i.imgur.com/QmeotYH.jpeg';

// SVG do coração/ECG para decoração
const HeartbeatLine: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 200 50" className={className} preserveAspectRatio="none">
    <path
      d="M0,25 L40,25 L45,25 L50,10 L55,40 L60,15 L65,35 L70,25 L75,25 L200,25"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface Testimonial {
  id: string;
  nome: string;
  citacao: string;
  imagem?: string;
  cargo?: string;
}

interface SiteConfig {
  featuredCourse: {
    enabled: boolean;
    courseId?: string;
    customDescription?: string;
  };
  testimonials: {
    enabled: boolean;
    items: Testimonial[];
  };
  demoVideo: {
    enabled: boolean;
    embedCode?: string;
    title?: string;
  };
}

const Home: React.FC = () => {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [featuredCourse, setFeaturedCourse] = useState<Course | null>(null);
  const [showTestimonials, setShowTestimonials] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollHint(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await siteConfigService.get();
      setConfig(response.data);

      // Carregar curso em destaque se habilitado
      if (response.data.featuredCourse?.enabled && response.data.featuredCourse?.courseId) {
        try {
          const courseRes = await courseService.getById(response.data.featuredCourse.courseId);
          setFeaturedCourse(courseRes.data);
        } catch (e) {
          console.error('Erro ao carregar curso em destaque:', e);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight * 0.7, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section - Com elementos de cardiologia */}
      <section className="relative min-h-[80dvh] sm:min-h-[85dvh] flex items-center py-12 sm:py-16 overflow-hidden">
        {/* Background com elementos médicos */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradientes */}
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-red-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-primary-300/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />

          {/* Linha de ECG decorativa */}
          <div className="absolute top-20 left-0 right-0 opacity-10">
            <HeartbeatLine className="w-full h-12 text-red-500" />
          </div>
          <div className="absolute bottom-32 left-0 right-0 opacity-5">
            <HeartbeatLine className="w-full h-12 text-primary-500" />
          </div>

          {/* Coração pulsante sutil */}
          <div className="absolute top-1/3 right-10 hidden lg:block">
            <Heart className="w-32 h-32 text-red-500/5 animate-pulse" style={{ animationDuration: '2s' }} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge com ícone de cardiologia */}
            <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
              <Activity className="w-5 h-5 text-red-500" />
              <GlassBadge variant="primary" size="lg">
                Centro de Treinamento em Ecocardiografia
              </GlassBadge>
              <Heart className="w-5 h-5 text-red-500" />
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] mb-4 sm:mb-6 leading-tight">
              Domine a{' '}
              <span className="text-gradient">Ecocardiografia</span>{' '}
              <br className="hidden sm:block" />
              <span className="text-red-500">do Coração</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[var(--color-text-muted)] mb-8 sm:mb-10 leading-relaxed px-2">
              Cursos práticos de <strong className="text-[var(--color-text-primary)]">cardiologia</strong> com integração de conceitos clínicos e de imagem cardíaca.
            </p>

            {/* CTAs principais */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-12">
              <Link to="/cursos" className="w-full sm:w-auto">
                <GlassButton variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="w-full sm:w-auto justify-center">
                  Ver Cursos Disponíveis
                </GlassButton>
              </Link>
              <a href="mailto:contato@cursodeecocardiografia.com" className="w-full sm:w-auto">
                <GlassButton size="lg" leftIcon={<Mail className="w-5 h-5" />} className="w-full sm:w-auto justify-center">
                  Falar com a Equipe
                </GlassButton>
              </a>
            </div>

            {/* Stats compactos com ícones médicos */}
            <div className="flex justify-center gap-6 sm:gap-10 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-5 h-5 text-primary-500" />
                  <p className="text-2xl sm:text-3xl font-bold text-gradient">500+</p>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">Médicos Formados</p>
              </div>
              <div className="w-px bg-[var(--glass-border)]" />
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Heart className="w-5 h-5 text-red-500" />
                  <p className="text-2xl sm:text-3xl font-bold text-gradient">20+</p>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">Cursos</p>
              </div>
              <div className="w-px bg-[var(--glass-border)]" />
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  <p className="text-2xl sm:text-3xl font-bold text-gradient">100h+</p>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">Conteúdo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Scroll Hint */}
        {showScrollHint && (
          <button
            onClick={scrollToContent}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-red-500 text-white rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center animate-bounce sm:hidden z-40"
            aria-label="Rolar para baixo"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </section>

      {/* Curso em Destaque (se habilitado) */}
      {config?.featuredCourse.enabled && featuredCourse && (
        <section className="py-12 sm:py-16 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-y border-amber-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Badge de destaque */}
              <div className="lg:w-1/3 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full mb-4 animate-pulse">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold">VOCÊ NÃO PODE PERDER!</span>
                  <Star className="w-5 h-5" />
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                  Curso em Destaque
                </h2>
                <p className="text-[var(--color-text-muted)]">
                  Oportunidade imperdível para sua carreira
                </p>
              </div>

              {/* Card do curso */}
              <div className="lg:w-2/3">
                <GlassCard className="border-2 border-amber-500/30 hover:border-amber-500/50 transition-colors">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {featuredCourse.imagemCapa && (
                      <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0">
                        <img
                          src={featuredCourse.imagemCapa}
                          alt={featuredCourse.titulo}
                          className="w-full h-full object-cover rounded-xl"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      </div>
                      <h3 className="font-heading text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                        {featuredCourse.titulo}
                      </h3>
                      <p className="text-[var(--color-text-muted)] mb-4 line-clamp-2">
                        {config.featuredCourse.customDescription || featuredCourse.descricao}
                      </p>
                      <Link to={`/cursos/${featuredCourse._id}`}>
                        <GlassButton variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          Quero me inscrever
                        </GlassButton>
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Professor - Seção de Credibilidade */}
      <section className="py-16 sm:py-20 lg:py-24 relative">
        {/* Linha ECG decorativa */}
        <div className="absolute top-10 left-0 right-0 opacity-5 pointer-events-none">
          <HeartbeatLine className="w-full h-8 text-red-500" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard padding="none" className="overflow-hidden">
            <div className="grid lg:grid-cols-5 gap-0">
              {/* Foto do Professor */}
              <div className="lg:col-span-2 relative">
                <div className="aspect-square lg:aspect-auto lg:h-full min-h-[280px] sm:min-h-[320px]">
                  <img
                    src={PROFESSOR_IMAGE}
                    alt="Prof. Ronaldo Campos Rodrigues"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10" />

                  {/* Badge mobile */}
                  <div className="absolute bottom-4 left-4 lg:hidden">
                    <GlassBadge variant="primary" size="lg">
                      <Heart className="w-4 h-4 text-red-400" />
                      Cardiologista
                    </GlassBadge>
                  </div>
                </div>
              </div>

              {/* Info do Professor */}
              <div className="lg:col-span-3 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <GlassBadge variant="primary" className="hidden lg:inline-flex">
                    <Heart className="w-4 h-4 text-red-400" />
                    Coordenação
                  </GlassBadge>
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-2">
                  Prof. Ronaldo Campos Rodrigues
                </h2>
                <p className="text-red-500 font-semibold text-base sm:text-lg mb-4 sm:mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Mestre em Cardiologia
                </p>

                <div className="space-y-3 mb-6 sm:mb-8">
                  {[
                    'Mestre em Cardiologia pela UFF',
                    'Especialista em Cardiologia pela SBC',
                    'Especialista em Ecocardiografia pelo DIC/SBC'
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[var(--color-text-secondary)] text-sm sm:text-base">{item}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[var(--color-text-muted)] text-sm sm:text-base leading-relaxed">
                  Metodologia única que integra conceitos clínicos e de imagem de forma prática e acessível, formando especialistas em <strong>ecocardiografia</strong>.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Vídeo de Demonstração (se habilitado) */}
      {config?.demoVideo.enabled && config.demoVideo.embedCode && (
        <section className="py-16 sm:py-20 bg-[var(--glass-bg)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Play className="w-6 h-6 text-primary-500" />
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                  {config.demoVideo.title || 'Conheça nossa plataforma'}
                </h2>
              </div>
              <p className="text-[var(--color-text-muted)]">
                Veja como funciona nossa metodologia de ensino
              </p>
            </div>

            <GlassCard padding="sm" className="overflow-hidden">
              <div
                className="aspect-video w-full rounded-xl overflow-hidden bg-black"
                dangerouslySetInnerHTML={{ __html: config.demoVideo.embedCode }}
              />
            </GlassCard>
          </div>
        </section>
      )}

      {/* Depoimentos de Ex-Alunos (se habilitado) */}
      {config?.testimonials.enabled && config.testimonials.items.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-24 relative overflow-hidden">
          {/* Background decorativo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-10 sm:mb-14">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Award className="w-6 h-6 text-emerald-500" />
                <GlassBadge variant="primary">Histórias de Sucesso</GlassBadge>
                <Heart className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
                Ex-Alunos que Brilham na Cardiologia
              </h2>
              <p className="text-[var(--color-text-muted)] max-w-2xl mx-auto">
                Profissionais que passaram pelo ECO RJ e hoje são referência na área médica
              </p>
            </div>

            {/* Botão para expandir/colapsar */}
            <div className="flex justify-center mb-8">
              <button
                onClick={() => setShowTestimonials(!showTestimonials)}
                className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500/10 to-primary-500/10 hover:from-emerald-500/20 hover:to-primary-500/20 border border-emerald-500/30 rounded-full transition-all"
              >
                <Users className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-[var(--color-text-primary)]">
                  {showTestimonials ? 'Ocultar Depoimentos' : `Ver ${config.testimonials.items.length} Depoimentos`}
                </span>
                <ChevronRight className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${showTestimonials ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* Grid de depoimentos */}
            {showTestimonials && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {config.testimonials.items.map((testimonial) => (
                  <GlassCard key={testimonial.id} className="flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                      {testimonial.imagem ? (
                        <img
                          src={testimonial.imagem}
                          alt={testimonial.nome}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary-500/30"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center">
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-[var(--color-text-primary)]">{testimonial.nome}</h4>
                        {testimonial.cargo && (
                          <p className="text-sm text-primary-500">{testimonial.cargo}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Quote className="w-8 h-8 text-primary-500/20 mb-2" />
                      <p className="text-[var(--color-text-secondary)] italic leading-relaxed">
                        {testimonial.citacao}
                      </p>
                    </div>
                    <div className="flex gap-1 mt-4 pt-4 border-t border-[var(--glass-border)]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Como Funciona - 3 passos simples */}
      <section className="py-16 sm:py-20 lg:py-24 bg-[var(--glass-bg)] relative">
        {/* Linha ECG decorativa */}
        <div className="absolute bottom-10 left-0 right-0 opacity-5 pointer-events-none">
          <HeartbeatLine className="w-full h-8 text-primary-500" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Activity className="w-6 h-6 text-primary-500" />
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)]">
                Como me inscrevo?
              </h2>
            </div>
            <p className="text-[var(--color-text-muted)] text-base sm:text-lg max-w-xl mx-auto">
              Processo simples em 3 passos para começar sua jornada na cardiologia
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Passo 1 */}
            <div className="text-center">
              <div className="relative mb-4 sm:mb-6 inline-flex">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <Mail className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-dark-card border-2 border-primary-500 flex items-center justify-center font-bold text-primary-500 text-sm">
                  1
                </span>
              </div>
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Entre em Contato
              </h3>
              <p className="text-[var(--color-text-muted)] text-sm sm:text-base leading-relaxed">
                Envie um e-mail para{' '}
                <a href="mailto:contato@cursodeecocardiografia.com" className="text-primary-500 font-medium hover:underline break-all">
                  contato@cursodeecocardiografia.com
                </a>
              </p>
            </div>

            {/* Passo 2 */}
            <div className="text-center">
              <div className="relative mb-4 sm:mb-6 inline-flex">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                  <Key className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-dark-card border-2 border-red-500 flex items-center justify-center font-bold text-red-500 text-sm">
                  2
                </span>
              </div>
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Receba sua Chave
              </h3>
              <p className="text-[var(--color-text-muted)] text-sm sm:text-base leading-relaxed">
                Após confirmar sua inscrição, você receberá uma <strong>Serial Key</strong> exclusiva
              </p>
            </div>

            {/* Passo 3 */}
            <div className="text-center">
              <div className="relative mb-4 sm:mb-6 inline-flex">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Heart className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-dark-card border-2 border-emerald-500 flex items-center justify-center font-bold text-emerald-500 text-sm">
                  3
                </span>
              </div>
              <h3 className="font-heading text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Domine a Cardiologia
              </h3>
              <p className="text-[var(--color-text-muted)] text-sm sm:text-base leading-relaxed">
                Ative a chave no seu perfil e acesse todas as aulas e exercícios
              </p>
            </div>
          </div>

          {/* Info adicional */}
          <div className="mt-10 sm:mt-14 text-center">
            <p className="text-[var(--color-text-muted)] text-sm mb-4">
              Ainda não tem conta?
            </p>
            <Link to="/registro">
              <GlassButton size="md">
                Criar Conta Gratuita
              </GlassButton>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Final - Ver Cursos */}
      <section className="py-16 sm:py-20 lg:py-24 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-20 opacity-10">
            <Heart className="w-40 h-40 text-red-500" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <GlassCard padding="xl" className="text-center border border-red-500/10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-6 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25">
              <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>

            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-3 sm:mb-4">
              Conheça nossos cursos de{' '}
              <span className="text-red-500">Cardiologia</span>
            </h2>
            <p className="text-[var(--color-text-muted)] text-base sm:text-lg mb-6 sm:mb-8 max-w-lg mx-auto">
              Aulas gravadas e ao vivo sobre os temas mais importantes da <strong>ecocardiografia</strong> e imagem cardíaca.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link to="/cursos" className="w-full sm:w-auto">
                <GlassButton variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="w-full sm:w-auto justify-center">
                  Ver Todos os Cursos
                </GlassButton>
              </Link>
              <a href="mailto:contato@cursodeecocardiografia.com" className="w-full sm:w-auto">
                <GlassButton size="lg" leftIcon={<Mail className="w-5 h-5" />} className="w-full sm:w-auto justify-center">
                  Tirar Dúvidas
                </GlassButton>
              </a>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default Home;
