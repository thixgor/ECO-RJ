import React, { useState } from 'react';
import { Video, FileText, File, Download, PlayCircle, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractYouTubeId, extractVimeoId } from '../../utils/videoUtils';
import { renderBold } from '../../utils/richText';
import { downloadWatermarkedPdf, hasWatermarkIdentity, type WatermarkIdentity } from '../../utils/pdfWatermark';
import type { MaterialConteudo } from '../../types';

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
  /** Dados do titular para marca d'água nos PDFs baixados (nome, CPF, e-mail). */
  identity?: WatermarkIdentity;
}

const MaterialContentViewer: React.FC<Props> = ({ conteudos, identity }) => {
  const [baixando, setBaixando] = useState<number | null>(null);
  const podeMarcar = hasWatermarkIdentity(identity);

  const handleDownloadPdf = async (c: MaterialConteudo, i: number) => {
    if (!c.downloadUrl) return;
    setBaixando(i);
    try {
      await downloadWatermarkedPdf(c.downloadUrl, identity || {}, c.nomeArquivo || c.titulo);
      toast.success('Download iniciado. O arquivo contém sua marca d\'água pessoal.');
    } catch (err) {
      console.error('Falha ao aplicar marca d\'água — abrindo arquivo original:', err);
      toast.error('Não foi possível personalizar o arquivo; abrindo o download original.');
      // Fallback: abre o download original para não deixar o comprador sem o arquivo.
      window.open(c.downloadUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setBaixando(null);
    }
  };

  if (!conteudos || conteudos.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Nenhum conteúdo disponível neste material.</p>
    );
  }

  return (
    <div className="space-y-5">
      {conteudos.map((c, i) => {
        const embedSrc = c.tipo === 'aula' ? buildEmbedSrc(c.embedVideo) : null;
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
              ) : isPdf && c.downloadUrl && podeMarcar ? (
                <div>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(c, i)}
                    disabled={baixando === i}
                    className="glass-btn-primary inline-flex items-center gap-2 !py-2.5 disabled:opacity-60"
                  >
                    {baixando === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {baixando === i ? 'Preparando arquivo…' : `Baixar ${c.nomeArquivo || c.titulo}`}
                  </button>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Este PDF é personalizado com seu nome, CPF e e-mail (marca d'água).
                  </p>
                </div>
              ) : (
                <a
                  href={c.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`glass-btn-primary inline-flex items-center gap-2 !py-2.5 ${!c.downloadUrl ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Download className="w-4 h-4" />
                  Baixar {c.nomeArquivo || c.titulo}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MaterialContentViewer;
