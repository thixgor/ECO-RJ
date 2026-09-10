import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Rodapé — arquétipo Ft4 "dense typographic colophon".
 *
 * Um bloco denso de colofão, no lugar das quatro colunas de links com fileira
 * de ícones sociais (o "AI footer"). Um rodapé institucional fecha a página
 * declarando quem assina, onde fica e sob que termos — não cataloga um mapa
 * do site que a plataforma não tem.
 */
const Footer: React.FC = () => {
  const ano = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-12">
        {/* Assinatura: a linha que o cliente pediu, por extenso. */}
        <p className="font-heading text-lg sm:text-xl font-medium tracking-display text-[var(--color-ink-deep)] max-w-2xl">
          ECO RJ — Centro de Treinamento em Ecocardiografia
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)] max-w-2xl">
          Atualização em ecocardiografia com integração de conceitos clínicos e de imagem.
          Coordenação do Prof. Ronaldo Campos Rodrigues, Mestre em Cardiologia.
        </p>

        <hr className="rule my-8" />

        {/* Colofão: dados institucionais em mono — o papel do mono é dado. */}
        <div className="grid gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:gap-10">
          <address className="not-italic font-mono text-xs leading-relaxed text-[var(--color-neutral)]">
            Avenida das Américas 19.019 · Recreio Shopping · Sala 336<br />
            Recreio dos Bandeirantes · Rio de Janeiro · RJ<br />
            CNPJ 21.847.609/0001-70<br />
            <a
              href="mailto:contato@cursodeecocardiografia.com"
              className="text-[var(--color-accent)] underline underline-offset-2 decoration-1 hover:decoration-2 transition-[text-decoration-thickness] duration-micro ease-out break-all"
            >
              contato@cursodeecocardiografia.com
            </a>
          </address>

          <nav aria-label="Institucional" className="font-mono text-xs leading-relaxed">
            <Link
              to="/cursos"
              className="block text-[var(--color-neutral)] hover:text-[var(--color-accent)] transition-colors duration-micro ease-out whitespace-nowrap"
            >
              Cursos
            </Link>
            <Link
              to="/termos"
              className="block text-[var(--color-neutral)] hover:text-[var(--color-accent)] transition-colors duration-micro ease-out whitespace-nowrap"
            >
              Termos de serviço
            </Link>
            <Link
              to="/privacidade"
              className="block text-[var(--color-neutral)] hover:text-[var(--color-accent)] transition-colors duration-micro ease-out whitespace-nowrap"
            >
              Política de privacidade
            </Link>
          </nav>
        </div>

        <hr className="rule my-8" />

        <p className="label-caps">
          © {ano} Centro de Treinamento em Ecocardiografia · Todos os direitos reservados
        </p>
      </div>
    </footer>
  );
};

export default Footer;
