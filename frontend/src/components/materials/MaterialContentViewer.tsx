import React, { useState } from 'react';
import { Video, FileText, File, Download, PlayCircle, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractYouTubeId, extractVimeoId } from '../../utils/videoUtils';
import { renderBold } from '../../utils/richText';
import DownloadTermsModal from './DownloadTermsModal';
import type { MaterialConteudo } from '../../types';

/** Dados do titular exibidos no termo (a marca d'água é aplicada no servidor). */
export interface MaterialIdentity {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
}

/** Converte um embed/URL em uma src de iframe utilizável (YouTube/Vimeo/URL direta). */
function buildEmbedSrc(embed?: string): string | null {
  if (!embed) return null;
  const yt = extractYouTubeId(embed);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
  const vm = extractVimeoId(embed);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  // Se já for uma URL http(s), usa direto
  if (/^https?:\/\//i.test(embed.trim())) return embed.trim();
  return null;
}

const iconFor = (tipo: string) => {
  if (tipo === 'aula') return <Video className="w-4 h-4" />;
  if (tipo === 'pdf') return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
};

interface Props {
  conteudos: MaterialConteudo[];
  /** Dados do titular exibidos no termo de download. */
  identity?: MaterialIdentity;
}

const MaterialContentViewer: React.FC<Props> = ({ conteudos, identity }) => {
  // Conteúdo aguardando aceite do termo de download.
  const [pendente, setPendente] = useState<MaterialConteudo | null>(null);
  const [baixando, setBaixando] = useState(false);

  /**
   * Entrega o arquivo.
   *
   * O servidor já devolve o PDF com marca d'água e `Content-Disposition:
   * attachment`, então basta navegar até a URL. Não usamos `blob:` nem
   * `pdf-lib` no navegador — era isso que travava computadores lentos e
   * quebrava no iOS/Safari ("WebKitBlobResource error 1").
   */
  const entregarArquivo = (c: MaterialConteudo) => {
    if (!c.downloadUrl) return;
    setBaixando(true);
    try {
      const sep = c.downloadUrl.includes('?') ? '&' : '?';
      const url = `${c.downloadUrl}${sep}aceite=1`;
      const a = document.createElement('a');
      a.href = url;
      // Mesma origem + Content-Disposition: attachment → o navegador baixa
      // sem sair da página, inclusive no Safari iOS.
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Download iniciado. O arquivo leva sua marca d\'água pessoal.');
      setPendente(null);
    } catch (err) {
      console.error('Falha ao iniciar o download:', err);
      toast.error('Não foi possível iniciar o download. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  };

  if (!conteudos || conteudos.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Nenhum conteúdo disponível neste material.</p>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {conteudos.map((c, i) => {
          const embedSrc = c.tipo === 'aula' ? buildEmbedSrc(c.embedVideo) : null;
          const isArquivo = c.tipo === 'pdf' || c.tipo === 'arquivo';
          const isPdf = c.tipo === 'pdf';
          return (
            <div key={c._id || i} className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--glass-border)]">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  {iconFor(c.tipo)}
                  {c.tipo === 'aula' ? 'Aula' : c.tipo === 'pdf' ? 'PDF' : 'Arquivo'}
                </span>
                <h4 className="font-semibold text-[var(--color-text-primary)] text-sm flex-1 truncate">{c.titulo}</h4>
                {typeof c.duracao === 'number' && c.duracao > 0 && (
                  <span className="text-xs text-[var(--color-text-muted)]">{c.duracao} min</span>
                )}
              </div>

              <div className="p-4">
                {c.descricao && (
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">{renderBold(c.descricao)}</p>
                )}

                {c.tipo === 'aula' ? (
                  embedSrc ? (
                    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        src={embedSrc}
                        title={c.titulo}
                        className="absolute inset-0 w-full h-full"
                        frameBorder={0}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                      <PlayCircle className="w-4 h-4" /> Vídeo indisponível no momento.
                    </div>
                  )
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setPendente(c)}
                      disabled={!c.downloadUrl || (baixando && pendente === c)}
                      className="glass-btn-primary inline-flex items-center gap-2 !py-2.5 disabled:opacity-60"
                    >
                      {baixando && pendente === c
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                      Baixar {c.nomeArquivo || c.titulo}
                    </button>
                    {isArquivo && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {isPdf
                          ? 'Cópia individual: o PDF é gerado com seu nome, CPF e e-mail em marca d\'água.'
                          : 'Uso pessoal e exclusivo — o download é registrado no seu acesso.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DownloadTermsModal
        isOpen={!!pendente}
        onClose={() => { if (!baixando) setPendente(null); }}
        onAccept={() => pendente && entregarArquivo(pendente)}
        nomeArquivo={pendente?.nomeArquivo || pendente?.titulo}
        titular={identity}
        baixando={baixando}
      />
    </>
  );
};

export default MaterialContentViewer;
