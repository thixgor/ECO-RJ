import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { GlassButton } from '../components/ui';
import { siteConfigService, courseService } from '../services/api';
import { Course } from '../types';

const PROFESSOR_IMAGE = 'https://i.imgur.com/QmeotYH.jpeg';

/**
 * Página inicial — macroestrutura 15 "Split Studio".
 *
 * Cada bloco divide a tela: afirmação de um lado, prova do outro, e a direção
 * alterna descendo a página. Sem herói centralizado de viewport inteira, sem
 * blob desfocado, sem número inventado.
 *
 * O que saiu e por quê (ver design.md § Banned outright):
 *   · "500+ médicos formados · 20+ cursos · 100h+ conteúdo" — nenhum desses
 *     números veio do banco ou do cliente. Métrica inventada é slop; um buraco
 *     em forma de número é honesto. A seção foi removida inteira, e não
 *     substituída por placeholder, porque a página não precisa dela para vender.
 *   · Cinco estrelas fixas em cada depoimento — ninguém avaliou nada.
 *   · "VOCÊ NÃO PODE PERDER!" com faísca pulsando — voz de infoproduto.
 *   · Ícone ladeando o título dos dois lados (`<Activity/> Título <Heart/>`).
 *   · Coração vermelho gigante a 5% de opacidade no fundo de três seções.
 */

/**
 * Traçado de ECG desenhado à mão, usado UMA vez na página: como divisor entre
 * o herói e o corpo. Não é decoração de fundo — é a régua da seção, e o
 * desenho diz de que assunto a escola trata.
 */
const EcgRule: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 1200 40"
    preserveAspectRatio="none"
    role="presentation"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M0,20 H430 l14,0 l10,-13 l9,26 l11,-19 l10,12 l12,-6 H1200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
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

const CREDENCIAIS = [
  'Mestre em Cardiologia pela UFF',
  'Especialista em Cardiologia pela SBC',
  'Especialista em Ecocardiografia pelo DIC/SBC',
];

const PASSOS = [
  {
    n: '01',
    titulo: 'Entre em contato',
    corpo: (
      <>
        Escreva para{' '}
        <a
          href="mailto:contato@cursodeecocardiografia.com"
          className="link break-all"
        >
          contato@cursodeecocardiografia.com
        </a>{' '}
        dizendo qual curso interessa.
      </>
    ),
  },
  {
    n: '02',
    titulo: 'Receba sua serial key',
    corpo: <>Confirmada a inscrição, chega por e-mail uma chave de ativação de uso único.</>,
  },
  {
    n: '03',
    titulo: 'Ative e comece',
    corpo: <>Aplique a chave no seu perfil. O acesso a aulas, exercícios e fórum abre na hora.</>,
  },
];

const Home: React.FC = () => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [featuredCourse, setFeaturedCourse] = useState<Course | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await siteConfigService.get();
        setConfig(response.data);

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
    loadConfig();
  }, []);

  const depoimentos = config?.testimonials.enabled ? config.testimonials.items : [];

  return (
    <div>
      {/* ── HERÓI · díptico 7/5 ────────────────────────────────────────────
          A altura é a do conteúdo, não a da viewport. Alinhado à esquerda. */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-12 lg:pt-14 pb-16 sm:pb-20 lg:pb-24">
        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16 items-center">
          <div className="reveal" style={{ ['--i' as string]: 0 }}>
            <p className="label-caps">Desde 2016 · Rio de Janeiro</p>

            <h1 className="display mt-4">
              Ecocardiografia com integração clínico-imagem
            </h1>

            <p className="mt-6 text-md sm:text-lg text-[var(--color-muted)] max-w-measure leading-relaxed">
              Cursos de atualização para médicos, conduzidos por quem lê exame e paciente
              na mesma consulta. Aulas gravadas e ao vivo, exercícios comentados e fórum
              com o corpo docente.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/cursos" className="w-full sm:w-auto">
                <GlassButton
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Ver cursos
                </GlassButton>
              </Link>
              <a href="mailto:contato@cursodeecocardiografia.com" className="w-full sm:w-auto">
                <GlassButton size="lg" leftIcon={<Mail className="w-4 h-4" />} className="w-full sm:w-auto">
                  Falar com a equipe
                </GlassButton>
              </a>
            </div>
          </div>

          {/* Prova: a foto de quem assina o curso. Moldura é régua fina. */}
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
              Mestre em Cardiologia · Coordenação
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Divisor: o traçado desenha o assunto da escola. Uma vez na página. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <EcgRule className="w-full h-8 text-[var(--color-rule-strong)]" />
      </div>

      {/* ── CURSO EM DESTAQUE · díptico invertido ─────────────────────── */}
      {config?.featuredCourse.enabled && featuredCourse && (
        <section className="band">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
            <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-14 items-center">
              {featuredCourse.imagemCapa ? (
                <figure className="border border-[var(--color-rule)] bg-[var(--color-paper)] p-1.5">
                  <img
                    src={featuredCourse.imagemCapa}
                    alt=""
                    className="w-full aspect-[3/2] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              ) : (
                <div className="hidden lg:block" />
              )}

              <div className="min-w-0">
                <p className="label-caps">Em destaque</p>
                <h2 className="display-s mt-3">{featuredCourse.titulo}</h2>
                <p className="mt-4 text-[var(--color-muted)] max-w-measure leading-relaxed">
                  {config.featuredCourse.customDescription || featuredCourse.descricao}
                </p>
                <div className="mt-6">
                  <Link to={`/cursos/${featuredCourse._id}`}>
                    <GlassButton variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Ver o curso
                    </GlassButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── COORDENAÇÃO · texto à esquerda, credenciais como ficha ─────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
        <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] gap-10 lg:gap-16">
          <div>
            <p className="label-caps">Coordenação</p>
            <h2 className="display-s mt-3">Prof. Ronaldo Campos Rodrigues</h2>
            <p className="mt-5 text-[var(--color-muted)] max-w-measure leading-relaxed">
              A metodologia do ECO RJ parte do caso clínico e chega à imagem — não o
              contrário. O aluno aprende a interpretar o exame sabendo que pergunta ele
              responde, e o que fazer com a resposta no consultório.
            </p>
          </div>

          {/* Ficha tabular: cada credencial é uma linha com régua. */}
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

      {/* ── VÍDEO ──────────────────────────────────────────────────────── */}
      {config?.demoVideo.enabled && config.demoVideo.embedCode && (
        <section className="band">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
            <p className="label-caps">Apresentação</p>
            <h2 className="display-s mt-3 mb-7">
              {config.demoVideo.title || 'Conheça a plataforma'}
            </h2>
            <figure className="border border-[var(--color-rule)] bg-[var(--color-ink-deep)] p-1.5">
              <div
                className="aspect-video w-full overflow-hidden [&_iframe]:w-full [&_iframe]:h-full"
                dangerouslySetInnerHTML={{ __html: config.demoVideo.embedCode }}
              />
            </figure>
          </div>
        </section>
      )}

      {/* ── DEPOIMENTOS · citação com marginália (T1) ──────────────────── */}
      {depoimentos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
          <p className="label-caps">Ex-alunos</p>
          <h2 className="display-s mt-3 mb-10 max-w-2xl">
            O que dizem quem passou por aqui
          </h2>

          <div className="border-t border-[var(--color-rule)]">
            {depoimentos.map((d) => (
              <article
                key={d.id}
                className="grid sm:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-4 sm:gap-10 py-8 border-b border-[var(--color-rule)]"
              >
                {/* Marginália: a atribuição vive na coluna estreita. */}
                <div className="flex sm:flex-col items-center sm:items-start gap-3">
                  {d.imagem && (
                    <img
                      src={d.imagem}
                      alt=""
                      className="w-11 h-11 sm:w-14 sm:h-14 object-cover border border-[var(--color-rule)] flex-shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-ink)]">{d.nome}</p>
                    {d.cargo && (
                      <p className="font-mono text-2xs uppercase tracking-label text-[var(--color-neutral)] mt-0.5">
                        {d.cargo}
                      </p>
                    )}
                  </div>
                </div>

                <blockquote className="font-heading text-lg sm:text-xl leading-snug text-[var(--color-ink)] max-w-measure">
                  &ldquo;{d.citacao}&rdquo;
                </blockquote>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── COMO SE INSCREVER · sequência de passos (F4) ────────────────
          O rótulo numerado é permitido aqui: os passos são genuinamente
          ordinais — não dá para ativar a chave antes de recebê-la. */}
      <section className="band">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
          <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 lg:gap-16">
            <div>
              <p className="label-caps">Inscrição</p>
              <h2 className="display-s mt-3">Como se inscrever</h2>
              <p className="mt-4 text-sm text-[var(--color-muted)] max-w-sm">
                Três passos. O acesso é liberado por serial key de uso único, emitida por
                nós após a confirmação da inscrição.
              </p>
            </div>

            <ol className="border-t border-[var(--color-rule)]">
              {PASSOS.map((passo) => (
                <li
                  key={passo.n}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 sm:gap-8 py-6 border-b border-[var(--color-rule)]"
                >
                  <span className="font-mono text-sm text-[var(--color-accent)] tabular-nums pt-0.5">
                    {passo.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-medium text-[var(--color-ink-deep)]">
                      {passo.titulo}
                    </h3>
                    <p className="mt-1.5 text-sm sm:text-base text-[var(--color-muted)] leading-relaxed">
                      {passo.corpo}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-8 text-sm text-[var(--color-muted)]">
            Ainda não tem conta?{' '}
            <Link to="/registro" className="link">
              Criar conta gratuita
            </Link>
          </p>
        </div>
      </section>

      {/* ── FECHAMENTO · um botão, não dois ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24">
        <div className="max-w-3xl">
          <h2 className="display">Comece pelo catálogo.</h2>
          <p className="mt-5 text-md text-[var(--color-muted)] max-w-measure leading-relaxed">
            Aulas gravadas e ao vivo sobre os temas centrais da ecocardiografia e da
            imagem cardíaca, com exercícios comentados e certificado ao final.
          </p>
          <div className="mt-8">
            <Link to="/cursos">
              <GlassButton variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Ver cursos
              </GlassButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
