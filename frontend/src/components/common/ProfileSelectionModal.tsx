import React, { useEffect, useRef } from 'react';
import { ProfileType } from '../../contexts/UserProfileContext';

interface ProfileSelectionModalProps {
  isOpen: boolean;
  onSelect: (profile: ProfileType) => void;
}

/**
 * Primeira tela que qualquer visitante vê. Uma bifurcação: médico ou paciente.
 *
 * Antes: dois cartões de vidro sobre desfoque preto, cada um com um quadrado
 * de gradiente de 80px, um segundo ícone flutuando no canto, `hover:scale` e
 * sombra colorida. Era a primeira impressão da instituição — e parecia um app
 * de consumo.
 *
 * Agora: duas colunas de papel separadas por régua, escolha dita por
 * tipografia. Sem ícone: a frase já diz o que cada caminho é.
 */
const ProfileSelectionModal: React.FC<ProfileSelectionModalProps> = ({ isOpen, onSelect }) => {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) firstRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-titulo"
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-[var(--color-paper)] animate-fade-in"
    >
      <div className="w-full max-w-3xl">
        <p className="label-caps">Centro de Treinamento em Ecocardiografia</p>

        <h1
          id="perfil-titulo"
          className="font-heading text-3xl sm:text-4xl font-medium tracking-display text-[var(--color-ink-deep)] mt-3"
        >
          ECO RJ
        </h1>

        <p className="mt-3 text-md text-[var(--color-muted)] max-w-measure">
          Duas portas de entrada. Escolha a sua — dá para trocar depois, a qualquer momento.
        </p>

        <hr className="rule-double mt-8 mb-0" />

        <div className="grid sm:grid-cols-2">
          <button
            ref={firstRef}
            onClick={() => onSelect('student')}
            className="group text-left py-8 sm:pr-8 border-b sm:border-b-0 sm:border-r border-[var(--color-rule)] transition-colors duration-micro ease-out hover:bg-[var(--color-paper-2)] sm:hover:pl-4 sm:hover:pr-4"
          >
            <p className="font-mono text-2xs uppercase tracking-label text-[var(--color-accent)]">01</p>
            <h2 className="font-heading text-xl sm:text-2xl font-medium text-[var(--color-ink-deep)] mt-2">
              Sou médico ou aluno
            </h2>
            <p className="mt-3 text-sm text-[var(--color-muted)] leading-relaxed max-w-xs">
              Cursos de ecocardiografia, aulas gravadas e ao vivo, exercícios comentados e
              certificado de conclusão.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
              Acessar a plataforma
              <span aria-hidden="true" className="transition-transform duration-micro ease-out group-hover:translate-x-1">→</span>
            </span>
          </button>

          <button
            onClick={() => onSelect('patient')}
            className="group text-left py-8 sm:pl-8 transition-colors duration-micro ease-out hover:bg-[var(--color-paper-2)] sm:hover:pl-4 sm:hover:pr-4"
          >
            <p className="font-mono text-2xs uppercase tracking-label text-[var(--color-accent)]">02</p>
            <h2 className="font-heading text-xl sm:text-2xl font-medium text-[var(--color-ink-deep)] mt-2">
              Sou paciente
            </h2>
            <p className="mt-3 text-sm text-[var(--color-muted)] leading-relaxed max-w-xs">
              Agendamento de consulta cardiológica, ecocardiograma e diagnóstico vascular
              no Recreio dos Bandeirantes.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
              Agendar consulta ou exame
              <span aria-hidden="true" className="transition-transform duration-micro ease-out group-hover:translate-x-1">→</span>
            </span>
          </button>
        </div>

        <hr className="rule-double" />
      </div>
    </div>
  );
};

export default ProfileSelectionModal;
