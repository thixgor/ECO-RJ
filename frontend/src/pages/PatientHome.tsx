import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, ArrowRight, MessageCircle, X } from 'lucide-react';
import { GlassButton } from '../components/ui';

const PROFESSOR_IMAGE = 'https://i.imgur.com/QmeotYH.jpeg';
const WHATSAPP_NUMBER = '5521968084445';
const MAPS_URL = 'https://maps.google.com/?q=-23.0217124,-43.4894209';

/**
 * Página do paciente — macroestrutura 15 "Split Studio" no herói, com o
 * catálogo de exames em 13 "Index-First": uma lista com régua, não nove
 * quadrados de gradiente com ícone repetido.
 *
 * Correção institucional: o nome é **Centro de Treinamento em Ecocardiografia**.
 * Não existe "Centro de Exames em Ecocardiografia" — era o texto do selo aqui.
 *
 * O que saiu: três blobs desfocados, o coração pulsando a 5% de opacidade,
 * dois traçados de ECG de enfeite, `` em todo cartão, e o botão
 * de WhatsApp em gradiente verde com sombra colorida.
 */

interface Exame {
  nome: string;
  descricao: string;
}

const EXAMES: Exame[] = [
  { nome: 'Consulta cardiológica', descricao: 'Avaliação cardiológica completa com diagnóstico clínico especializado.' },
  { nome: 'Risco cirúrgico', descricao: 'Avaliação pré-operatória para segurança em procedimentos cirúrgicos.' },
  { nome: 'Ecocardiograma transtorácico', descricao: 'Ultrassom do coração para avaliação da estrutura e da função cardíaca.' },
  { nome: 'Ecocardiograma pediátrico', descricao: 'Avaliação cardíaca especializada para crianças e adolescentes até 14 anos.' },
  { nome: 'Speckle tracking', descricao: 'Análise avançada da função cardíaca por deformação miocárdica.' },
  { nome: 'Strain', descricao: 'Avaliação da deformação miocárdica para diagnóstico precoce.' },
  { nome: 'Doppler de carótidas e vertebrais', descricao: 'Avaliação das artérias carótidas e vertebrais para prevenção de AVC.' },
  { nome: 'Doppler de artéria renal', descricao: 'Avaliação das artérias renais para diagnóstico de hipertensão renovascular.' },
  { nome: 'Doppler de membros inferiores', descricao: 'Avaliação da circulação venosa e arterial dos membros inferiores.' },
];

const CREDENCIAIS = [
  'Mestre em Cardiologia pela UFF',
  'Especialista em Cardiologia pela SBC',
  'Especialista em Ecocardiografia pelo DIC/SBC',
];

const PatientHome: React.FC = () => {
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc fecha o diálogo — toda camada modal precisa de saída pelo teclado.
  useEffect(() => {
    if (!showWhatsAppOptions) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowWhatsAppOptions(false);
    };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [showWhatsAppOptions]);

  const openWhatsApp = (type: 'free' | 'private') => {
    const message =
      type === 'free'
        ? 'Olá, quero marcar uma consulta gratuita no ECO RJ.'
        : 'Olá, quero marcar uma consulta privada no ECO RJ.';
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    setShowWhatsAppOptions(false);
  };

  return (
    <div>
      {/* ── HERÓI · díptico 7/5 ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10 sm:pb-14">
        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16 items-center">
          <div className="reveal" style={{ ['--i' as string]: 0 }}>
            <p className="label-caps">Centro de Treinamento em Ecocardiografia</p>

            <h1 className="display mt-4">Exames de coração e vasos, no Recreio</h1>

            <p className="mt-6 text-md sm:text-lg text-[var(--color-muted)] max-w-measure leading-relaxed">
              Ecocardiografia e diagnóstico vascular conduzidos pelo Prof. Ronaldo Campos
              Rodrigues, Mestre em Cardiologia. Consulta, exame e laudo no mesmo endereço.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <GlassButton
                variant="primary"
                size="lg"
                leftIcon={<MessageCircle className="w-4 h-4" />}
                onClick={() => setShowWhatsAppOptions(true)}
                className="w-full sm:w-auto"
              >
                Agendar pelo WhatsApp
              </GlassButton>
              <a href="tel:+5521968084445" className="w-full sm:w-auto">
                <GlassButton size="lg" leftIcon={<Phone className="w-4 h-4" />} className="w-full sm:w-auto">
                  (21) 96808-4445
                </GlassButton>
              </a>
            </div>

            <p className="mt-6 font-mono text-2xs uppercase tracking-label text-[var(--color-neutral)] leading-relaxed">
              Recreio Shopping · Sala 336 · Av. das Américas 19.019
            </p>
          </div>

          <figure className="reveal lg:justify-self-end w-full" style={{ ['--i' as string]: 1 }}>
            <div className="border border-[var(--color-rule)] p-1.5 bg-[var(--color-paper)]">
              <img
                src={PROFESSOR_IMAGE}
                alt="Prof. Ronaldo Campos Rodrigues"
                className="w-full aspect-[4/5] object-cover"
                fetchPriority="high"
                decoding="async"
              />
            </div>
            <figcaption className="mt-3 font-mono text-2xs uppercase tracking-label text-[var(--color-neutral)] leading-relaxed">
              Prof. Ronaldo Campos Rodrigues<br />
              Mestre em Cardiologia
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── EXAMES · índice com régua ───────────────────────────────────── */}
      <section className="band">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
          <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 lg:gap-16">
            <div>
              <p className="label-caps">Serviços</p>
              <h2 className="display-s mt-3">Exames realizados</h2>
              <p className="mt-4 text-sm text-[var(--color-muted)] max-w-sm">
                Nove modalidades de exame cardiovascular e vascular, todas com laudo do
                próprio corpo clínico.
              </p>
            </div>

            <dl className="border-t border-[var(--color-rule)]">
              {EXAMES.map((exame, i) => (
                <div
                  key={exame.nome}
                  className="grid sm:grid-cols-[auto_minmax(0,5fr)_minmax(0,7fr)] gap-2 sm:gap-6 py-4 border-b border-[var(--color-rule)]"
                >
                  <span className="font-mono text-2xs text-[var(--color-neutral)] tabular-nums pt-1 hidden sm:block">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <dt className="font-medium text-[var(--color-ink)]">{exame.nome}</dt>
                  <dd className="text-sm text-[var(--color-muted)] leading-relaxed">{exame.descricao}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── QUEM ATENDE ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
        <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] gap-10 lg:gap-16">
          <div>
            <p className="label-caps">Quem atende</p>
            <h2 className="display-s mt-3">Prof. Ronaldo Campos Rodrigues</h2>
            <p className="mt-5 text-[var(--color-muted)] max-w-measure leading-relaxed">
              Cardiologista e ecocardiografista, coordena o centro desde 2016. O mesmo
              médico que conduz a consulta é quem realiza e assina o exame.
            </p>
            <div className="mt-7">
              <GlassButton
                variant="primary"
                leftIcon={<MessageCircle className="w-4 h-4" />}
                onClick={() => setShowWhatsAppOptions(true)}
              >
                Agendar consulta
              </GlassButton>
            </div>
          </div>

          <dl className="lg:pt-9">
            {CREDENCIAIS.map((item, i) => (
              <div
                key={item}
                className={`flex gap-5 py-4 border-t border-[var(--color-rule)] ${
                  i === CREDENCIAIS.length - 1 ? 'border-b' : ''
                }`}
              >
                <dt className="font-mono text-2xs text-[var(--color-neutral)] pt-1 flex-shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </dt>
                <dd className="text-sm sm:text-base text-[var(--color-ink)]">{item}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── ENDEREÇO · endereço à esquerda, mapa real à direita ─────────── */}
      <section className="band">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
          <p className="label-caps">Endereço</p>
          <h2 className="display-s mt-3 mb-8">Recreio Shopping · Sala 336</h2>

          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-12 items-start">
            <div>
              <address className="not-italic font-mono text-sm leading-relaxed text-[var(--color-muted)]">
                Av. das Américas, 19.019<br />
                Recreio dos Bandeirantes<br />
                Rio de Janeiro · RJ<br />
                CEP 22790-701
              </address>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <GlassButton leftIcon={<MapPin className="w-4 h-4" />} onClick={() => window.open(MAPS_URL, '_blank')}>
                  Ver no mapa
                </GlassButton>
                <a href="tel:+5521968084445">
                  <GlassButton leftIcon={<Phone className="w-4 h-4" />} fullWidth>
                    Ligar
                  </GlassButton>
                </a>
              </div>
            </div>

            <figure className="border border-[var(--color-rule)] p-1.5 bg-[var(--color-paper)]">
              <iframe
                title="Mapa — Recreio Shopping, Sala 336"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-43.504,-23.034,-43.474,-23.009&layer=mapnik&marker=-23.0217124,-43.4894209"
                className="w-full block aspect-[4/3] lg:aspect-[16/10]"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* ── FECHAMENTO · um botão ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24">
        <div className="max-w-3xl">
          <h2 className="display">Agende pelo WhatsApp.</h2>
          <p className="mt-5 text-md text-[var(--color-muted)] max-w-measure leading-relaxed">
            A equipe responde em horário comercial e confirma data, horário e preparo do
            exame na mesma conversa.
          </p>
          <div className="mt-8">
            <GlassButton
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setShowWhatsAppOptions(true)}
            >
              Falar no WhatsApp
            </GlassButton>
          </div>
        </div>
      </section>

      {/* ── DIÁLOGO · tipo de consulta ──────────────────────────────────── */}
      {showWhatsAppOptions && (
        <div className="modal-overlay" onClick={() => setShowWhatsAppOptions(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wpp-titulo"
            tabIndex={-1}
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-rule)]">
              <div>
                <p className="label-caps">Agendamento</p>
                <h2 id="wpp-titulo" className="font-heading text-lg font-medium text-[var(--color-ink-deep)] mt-1">
                  Que tipo de consulta?
                </h2>
              </div>
              <button
                onClick={() => setShowWhatsAppOptions(false)}
                aria-label="Fechar"
                className="p-2 -mr-2 -mt-1 text-[var(--color-neutral)] hover:text-[var(--color-ink)] transition-colors duration-micro ease-out touch-target"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 grid gap-3">
              <button
                onClick={() => openWhatsApp('free')}
                className="text-left p-4 border border-[var(--color-rule-strong)] rounded-sm hover:border-[var(--color-accent)] transition-colors duration-micro ease-out"
              >
                <p className="font-medium text-[var(--color-ink)]">Consulta gratuita</p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Atendimento distribuído pelo ECO RJ.
                </p>
              </button>

              <button
                onClick={() => openWhatsApp('private')}
                className="text-left p-4 border border-[var(--color-rule-strong)] rounded-sm hover:border-[var(--color-accent)] transition-colors duration-micro ease-out"
              >
                <p className="font-medium text-[var(--color-ink)]">Consulta privada</p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Com o Prof. Ronaldo Campos Rodrigues.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientHome;
