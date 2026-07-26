import React, { useEffect, useState } from 'react';
import { ShieldAlert, FileSignature, Loader2, Fingerprint } from 'lucide-react';
import { GlassModal, GlassButton } from '../ui';
import { materialService } from '../../services/api';

export interface DownloadTerms {
  versao: string;
  titulo: string;
  secoes: Array<{ titulo: string; texto: string }>;
  confirmacao: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado quando o usuário aceita os termos. */
  onAccept: () => void;
  /** Nome do arquivo que será baixado (exibido no cabeçalho). */
  nomeArquivo?: string;
  /** Dados que serão gravados na marca d'água, para o usuário conferir. */
  titular?: { nome?: string | null; cpf?: string | null; email?: string | null };
  /** true enquanto o download está sendo preparado. */
  baixando?: boolean;
}

/** Máscara de CPF apenas para exibição. */
const maskCpf = (cpf?: string | null) => {
  const d = String(cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return cpf || '';
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/**
 * Termo de licença de uso / direitos autorais exibido ANTES de baixar um
 * material. O aceite é obrigatório e fica registrado no servidor.
 */
const DownloadTermsModal: React.FC<Props> = ({
  isOpen, onClose, onAccept, nomeArquivo, titular, baixando
}) => {
  const [terms, setTerms] = useState<DownloadTerms | null>(null);
  const [loading, setLoading] = useState(false);
  const [aceite, setAceite] = useState(false);

  // Carrega os termos na primeira abertura (ficam em cache no estado).
  useEffect(() => {
    if (!isOpen || terms || loading) return;
    setLoading(true);
    materialService.getDownloadTerms()
      .then((res) => setTerms(res.data))
      .catch(() => setTerms(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cada abertura recomeça sem aceite marcado.
  useEffect(() => {
    if (isOpen) setAceite(false);
  }, [isOpen]);

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={terms?.titulo || 'Termo de Licença de Uso e Direitos Autorais'}
      description={nomeArquivo ? `Antes de baixar: ${nomeArquivo}` : 'Leia e aceite antes de baixar'}
      size="2xl"
      closeOnOverlayClick={!baixando}
      footer={
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-primary-500 flex-shrink-0"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">
              {terms?.confirmacao
                || 'Declaro que li e aceito o Termo de Licença de Uso e que este material é para meu uso pessoal e exclusivo.'}
            </span>
          </label>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <GlassButton variant="secondary" onClick={onClose} disabled={baixando}>
              Cancelar
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={onAccept}
              disabled={!aceite || baixando || loading}
              isLoading={baixando}
              leftIcon={<FileSignature className="w-4 h-4" />}
            >
              {baixando ? 'Preparando arquivo…' : 'Aceito e quero baixar'}
            </GlassButton>
          </div>
        </div>
      }
    >
      {/* Aviso de rastreabilidade — o ponto mais importante para o usuário */}
      <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
        <p className="flex items-start gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          Esta cópia é única e rastreável até você.
        </p>
        {(titular?.nome || titular?.cpf || titular?.email) && (
          <div className="mt-3 pl-7 text-xs text-amber-800/90 dark:text-amber-300/80 space-y-0.5">
            <p className="flex items-center gap-1.5 font-semibold">
              <Fingerprint className="w-3.5 h-3.5" /> Dados gravados na marca d'água:
            </p>
            {titular?.nome && <p>Nome: {titular.nome}</p>}
            {titular?.cpf && <p>CPF: {maskCpf(titular.cpf)}</p>}
            {titular?.email && <p>E-mail: {titular.email}</p>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : terms ? (
        <div className="space-y-4">
          {terms.secoes.map((s) => (
            <div key={s.titulo}>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{s.titulo}</h4>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mt-1">{s.texto}</p>
            </div>
          ))}
          <p className="text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--glass-border)]">
            Versão do termo: {terms.versao} · CENTRO DE TREINAMENTO EM ECOCARDIOGRAFIA · CNPJ 21.847.609/0001-70
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Não foi possível carregar o texto completo do termo. Ao prosseguir, você declara que o material
          é protegido por direitos autorais, que a cópia é para uso pessoal e exclusivo e que o
          compartilhamento é proibido.
        </p>
      )}
    </GlassModal>
  );
};

export default DownloadTermsModal;
