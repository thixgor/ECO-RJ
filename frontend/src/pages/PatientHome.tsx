import React, { useState } from 'react';
import { Heart, Activity, MapPin, Phone, CheckCircle, Stethoscope, ArrowRight, MessageCircle } from 'lucide-react';
import { GlassCard, GlassButton } from '../components/ui';

const PROFESSOR_IMAGE = 'https://i.imgur.com/QmeotYH.jpeg';
const WHATSAPP_NUMBER = '5521968084445';

// SVG do coracao/ECG para decoracao
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

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const services: Service[] = [
  {
    icon: <Heart className="w-8 h-8" />,
    title: 'Consulta Cardiologista',
    description: 'Avaliação cardiológica completa com diagnóstico clínico especializado.'
  },
  {
    icon: <Activity className="w-8 h-8" />,
    title: 'Risco Cirúrgico',
    description: 'Avaliação pré-operatória para segurança em procedimentos cirúrgicos.'
  },
  {
    icon: <Stethoscope className="w-8 h-8" />,
    title: 'Ecocardiograma Transtorácico',
    description: 'Exame de ultrassom do coração para avaliação completa da estrutura e função cardíaca.'
  },
  {
    icon: <CheckCircle className="w-8 h-8" />,
    title: 'Doppler de Carótidas e Vertebrais',
    description: 'Avaliação das artérias carótidas e vertebrais para prevenção de AVC.'
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: 'Ecocardiograma Pediátrico (< 14 anos)',
    description: 'Avaliação cardíaca especializada para crianças e adolescentes.'
  },
  {
    icon: <Activity className="w-8 h-8" />,
    title: 'Speckle Tracking',
    description: 'Análise avançada da função cardíaca por deformação miocárdica.'
  },
  {
    icon: <Stethoscope className="w-8 h-8" />,
    title: 'Strain',
    description: 'Avaliação da deformação miocárdica para diagnóstico precoce.'
  },
  {
    icon: <CheckCircle className="w-8 h-8" />,
    title: 'Artéria Renal',
    description: 'Avaliação das artérias renais para diagnóstico de hipertensão renovascular.'
  },
  {
    icon: <Heart className="w-8 h-8" />,
    title: 'Membros Inferiores - Venoso e Arterial',
    description: 'Avaliação completa da circulação venosa e arterial dos membros inferiores.'
  }
];

const PatientHome: React.FC = () => {
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);

  const openWhatsApp = (type: 'free' | 'private') => {
    const message = type === 'free'
      ? 'Olá, quero marcar uma consulta Gratuita no ECO RJ.'
      : 'Olá, quero marcar uma consulta Privada no ECO RJ.';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
    setShowWhatsAppOptions(false);
  };

  const openGoogleMaps = () => {
    window.open('https://maps.google.com/?q=-23.0217124,-43.4894209', '_blank');
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative min-h-[80dvh] sm:min-h-[85dvh] flex items-center py-12 sm:py-16 overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

          {/* Coracao pulsante sutil */}
          <div className="absolute top-1/3 right-10 hidden lg:block">
            <Heart className="w-32 h-32 text-red-500/5 animate-pulse" style={{ animationDuration: '2s' }} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
              <Activity className="w-5 h-5 text-red-500" />
              <span className="px-4 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-sm font-medium border border-red-500/20">
                Centro de Exames em Ecocardiografia
              </span>
              <Heart className="w-5 h-5 text-red-500" />
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] mb-4 sm:mb-6 leading-tight">
              Tenha acesso aos{' '}
              <span className="text-red-500">melhores exames</span>{' '}
              <br className="hidden sm:block" />
              em Ecocardiografia
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[var(--color-text-muted)] mb-8 sm:mb-10 leading-relaxed px-2">
              <strong className="text-[var(--color-text-primary)]">Diagnóstico vascular</strong> e avaliação cardiovascular completa
              com equipamentos de última geração e equipe especializada.
            </p>

            {/* CTA Principal */}
            <div className="flex flex-col items-center gap-4">
              <GlassButton
                variant="primary"
                size="lg"
                leftIcon={<MessageCircle className="w-5 h-5" />}
                onClick={() => setShowWhatsAppOptions(true)}
                className="!bg-gradient-to-r !from-green-500 !to-green-600 hover:!from-green-600 hover:!to-green-700 !shadow-green-500/30"
              >
                Agendar Consulta via WhatsApp
              </GlassButton>

              <GlassCard
                onClick={openGoogleMaps}
                className="!cursor-pointer hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-primary-500" />
                  <div className="text-left">
                    <p className="text-[var(--color-text-primary)] font-semibold">Nossa Localização</p>
                    <p className="text-[var(--color-text-muted)] text-sm">Recreio Shopping - Sala 336</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Options Modal */}
      {showWhatsAppOptions && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowWhatsAppOptions(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-heading text-xl font-bold text-[var(--color-text-primary)] mb-2">
                Agendar Consulta
              </h3>
              <p className="text-[var(--color-text-muted)] text-sm">
                Escolha o tipo de consulta desejada
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => openWhatsApp('free')}
                className="w-full p-4 rounded-xl border-2 border-green-500/30 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">Consulta Gratuita</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Atendimento distribuido pela ECO RJ</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => openWhatsApp('private')}
                className="w-full p-4 rounded-xl border-2 border-primary-500/30 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">Consulta Privada</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Com Prof. Mestre Ronaldo Campos Rodrigues</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowWhatsAppOptions(false)}
              className="w-full mt-4 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Services Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-[var(--glass-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Stethoscope className="w-6 h-6 text-primary-500" />
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)]">
                Nossos Serviços
              </h2>
            </div>
            <p className="text-[var(--color-text-muted)] text-base sm:text-lg max-w-xl mx-auto">
              Exames e avaliações realizados com equipamentos de ponta
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <GlassCard key={index} className="text-center hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
                  {service.icon}
                </div>
                <h3 className="font-heading text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {service.description}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Professor Section */}
      <section className="py-16 sm:py-20 lg:py-24">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10" />
                </div>
              </div>

              {/* Info do Professor */}
              <div className="lg:col-span-3 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-sm font-medium w-fit mb-3">
                  <Heart className="w-4 h-4" />
                  Cardiologista
                </span>

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

                <GlassButton
                  variant="primary"
                  leftIcon={<MessageCircle className="w-5 h-5" />}
                  onClick={() => setShowWhatsAppOptions(true)}
                  className="w-fit !bg-gradient-to-r !from-green-500 !to-green-600 hover:!from-green-600 hover:!to-green-700"
                >
                  Agendar com Prof. Ronaldo
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-[var(--glass-bg)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="w-6 h-6 text-primary-500" />
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                Nossa Localização
              </h2>
            </div>
          </div>

          <GlassCard padding="none" className="overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="p-6 sm:p-8 flex flex-col justify-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
                  <MapPin className="w-7 h-7" />
                </div>

                <address className="not-italic text-[var(--color-text-secondary)] text-base sm:text-lg leading-relaxed mb-6">
                  <strong className="text-[var(--color-text-primary)] block mb-3 text-lg sm:text-xl">Recreio Shopping - Sala 336</strong>
                  <p className="mb-1">Av. das Americas, 19.019</p>
                  <p className="mb-1">Recreio dos Bandeirantes</p>
                  <p className="mb-1">Rio de Janeiro - RJ</p>
                  <p>CEP: 22790-701</p>
                </address>

                <div className="flex flex-col gap-3">
                  <GlassButton
                    variant="primary"
                    leftIcon={<MapPin className="w-5 h-5" />}
                    onClick={openGoogleMaps}
                  >
                    Ver no Google Maps
                  </GlassButton>
                  <GlassButton
                    leftIcon={<Phone className="w-5 h-5" />}
                    onClick={() => window.open('tel:+5521968084445', '_self')}
                  >
                    (21) 968084445
                  </GlassButton>
                </div>
              </div>

              <div className="min-h-[300px]">
                <iframe
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-43.504,-23.034,-43.474,-23.009&layer=mapnik&marker=-23.0217124,-43.4894209"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '300px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full min-h-[300px] lg:min-h-full"
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 lg:py-24 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <GlassCard padding="xl" className="text-center border border-green-500/20">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 sm:mb-6 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>

            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-3 sm:mb-4">
              Agende sua consulta{' '}
              <span className="text-green-500">agora</span>
            </h2>
            <p className="text-[var(--color-text-muted)] text-base sm:text-lg mb-6 sm:mb-8 max-w-lg mx-auto">
              Nossa equipe esta pronta para atender voce com excelencia e cuidado.
            </p>

            <GlassButton
              variant="primary"
              size="lg"
              leftIcon={<MessageCircle className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              onClick={() => setShowWhatsAppOptions(true)}
              className="!bg-gradient-to-r !from-green-500 !to-green-600 hover:!from-green-600 hover:!to-green-700 !shadow-green-500/30"
            >
              Falar no WhatsApp
            </GlassButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default PatientHome;
