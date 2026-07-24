/**
 * Marca d'água + metadados em PDFs, aplicados NO NAVEGADOR (client-side).
 *
 * Ao baixar um material em PDF, o arquivo é personalizado com os dados do
 * titular (nome, CPF e e-mail) de duas formas complementares:
 *   1) Marca d'água visível — poucas repetições por página (o suficiente para
 *      identificar o titular sem "travar"/inflar o PDF).
 *   2) Metadados do documento (Autor, Assunto, Palavras-chave, Produtor) —
 *      rastreável mesmo se a página for recortada.
 *
 * A biblioteca `pdf-lib` é importada dinamicamente para não pesar no bundle
 * principal — só é carregada quando um download de PDF acontece.
 */

export interface WatermarkIdentity {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
}

/** Formata um CPF (11 dígitos) como 000.000.000-00; devolve como veio se inválido. */
export function formatCpf(cpf?: string | null): string {
  if (!cpf) return '';
  const d = String(cpf).replace(/\D/g, '');
  if (d.length !== 11) return String(cpf).trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Há dados suficientes para identificar o titular? (basta um deles). */
export function hasWatermarkIdentity(identity?: WatermarkIdentity | null): boolean {
  if (!identity) return false;
  return !!((identity.nome && identity.nome.trim()) ||
    (identity.cpf && String(identity.cpf).replace(/\D/g, '').length >= 3) ||
    (identity.email && identity.email.trim()));
}

/**
 * Aplica marca d'água e metadados a um PDF (bytes de entrada) e devolve os
 * bytes do PDF resultante.
 */
export async function watermarkPdfBytes(
  input: ArrayBuffer | Uint8Array,
  identity: WatermarkIdentity
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');

  // updateMetadata:false evita que o pdf-lib sobrescreva nossos metadados.
  const pdfDoc = await PDFDocument.load(input, { updateMetadata: false });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const nome = (identity.nome || '').trim();
  const cpf = formatCpf(identity.cpf);
  const email = (identity.email || '').trim();

  const titular = nome || email || 'Titular licenciado';
  const secundario = [cpf ? `CPF ${cpf}` : '', email].filter(Boolean).join('   •   ');

  const gray = rgb(0.5, 0.5, 0.5);
  const angle = -30;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Desenha um texto ROTACIONADO, centralizado horizontalmente em (cx, cy).
  const drawCentered = (
    page: any,
    text: string,
    cx: number,
    cy: number,
    size: number,
    opacity: number
  ) => {
    if (!text) return;
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: cx - (w / 2) * cos,
      y: cy - (w / 2) * sin,
      size,
      font,
      color: gray,
      opacity,
      rotate: degrees(angle)
    });
  };

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();

    // Poucas repetições (grade 2x3 = até 6 blocos) — deter sem inflar o arquivo.
    const cols = 2;
    const rows = 3;
    const primSize = Math.max(10, Math.min(16, width / 34));
    const secSize = primSize - 3;
    for (let ci = 0; ci < cols; ci++) {
      for (let ri = 0; ri < rows; ri++) {
        const cx = (width / (cols + 1)) * (ci + 1);
        const cy = (height / (rows + 1)) * (ri + 1);
        drawCentered(page, titular, cx, cy + 8, primSize, 0.1);
        if (secundario) drawCentered(page, secundario, cx, cy - 8, secSize, 0.1);
      }
    }

    // Rodapé identificador em cada página (pequeno, discreto, difícil de recortar por completo).
    const rodape = [`Licenciado para ${titular}`, secundario].filter(Boolean).join('   —   ');
    const rSize = 6;
    const rW = font.widthOfTextAtSize(rodape, rSize);
    page.drawText(rodape, {
      x: Math.max(6, (width - rW) / 2),
      y: 6,
      size: rSize,
      font,
      color: gray,
      opacity: 0.55
    });
  }

  // Metadados — rastreabilidade mesmo sem a marca visível.
  const idLinha = [nome && `Nome: ${nome}`, cpf && `CPF: ${cpf}`, email && `E-mail: ${email}`]
    .filter(Boolean)
    .join(' | ');
  const tituloOriginal = (pdfDoc.getTitle() || '').trim();
  try {
    pdfDoc.setTitle(`${tituloOriginal ? `${tituloOriginal} — ` : ''}Cópia licenciada para ${titular}`);
    pdfDoc.setAuthor(nome || email || 'ECO RJ');
    pdfDoc.setSubject(`Cópia licenciada individualmente. ${idLinha}`);
    pdfDoc.setKeywords([nome, cpf, email, 'ECO RJ', 'licenciado'].filter(Boolean) as string[]);
    pdfDoc.setProducer(`ECO RJ — Cópia licenciada (${idLinha})`);
    pdfDoc.setCreator('ECO RJ - Centro de Treinamento em Ecocardiografia');
    pdfDoc.setModificationDate(new Date());
  } catch {
    /* metadados são best-effort */
  }

  return pdfDoc.save();
}

/**
 * Entrega os bytes ao usuário como um arquivo.
 *
 * No iOS/Safari o download de `blob:` via `<a download>` NÃO funciona — o
 * Safari ignora o atributo `download`, tenta NAVEGAR para a URL do blob e
 * falha com "WebKitBlobResource error 1". Por isso, quando o Web Share API
 * suporta compartilhar arquivos (iOS 15+), usamos a folha nativa
 * ("Salvar em Arquivos", enviar por e-mail, etc.). Nos demais navegadores
 * (desktop/Android) usamos o download clássico por âncora.
 *
 * @returns true se entregue via Web Share; false se via download por âncora.
 */
export async function saveBytesAsFile(
  bytes: Uint8Array | Blob,
  filename: string,
  mimeType = 'application/pdf'
): Promise<boolean> {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type: mimeType });

  // Caminho confiável no iOS/Safari: Web Share API com arquivo.
  try {
    const nav = navigator as Navigator & {
      canShare?: (data?: any) => boolean;
      share?: (data?: any) => Promise<void>;
    };
    if (typeof File !== 'undefined' && nav.canShare && nav.share) {
      const file = new File([blob], filename, { type: mimeType });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename });
        return true;
      }
    }
  } catch (err: any) {
    // Usuário fechou a folha de compartilhamento: entrega concluída (não baixa de novo).
    if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
      if (err.name === 'AbortError') return true;
      // NotAllowedError (ativação expirada) → cai para o download por âncora.
    }
  }

  // Download clássico (desktop/Android/navegadores com suporte a `download`).
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  return false;
}

/** Garante que o nome do arquivo termine em .pdf. */
function ensurePdfName(name?: string, fallback = 'material'): string {
  const base = (name || fallback).trim() || fallback;
  return /\.pdf$/i.test(base) ? base : `${base.replace(/[^\w.\-() ]+/g, '_')}.pdf`;
}

/**
 * Baixa um PDF de material APLICANDO a marca d'água + metadados no navegador.
 *
 * Em caso de falha (rede/CORS/PDF protegido), faz fallback abrindo a URL
 * original para não deixar o comprador sem o arquivo.
 *
 * @returns true se o arquivo com marca d'água foi gerado; false se caiu no fallback.
 */
export async function downloadWatermarkedPdf(
  downloadUrl: string,
  identity: WatermarkIdentity,
  filename?: string
): Promise<boolean> {
  const nomeArquivo = ensurePdfName(filename);
  // O endpoint de download aceita ?raw=1 para transmitir os bytes pela nossa
  // API (mesma origem), evitando problemas de CORS ao ler o arquivo do Blob.
  const rawUrl = downloadUrl.includes('?') ? `${downloadUrl}&raw=1` : `${downloadUrl}?raw=1`;
  const res = await fetch(rawUrl, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Falha ao obter o arquivo (HTTP ${res.status})`);
  const buffer = await res.arrayBuffer();
  const bytes = await watermarkPdfBytes(buffer, identity);
  await saveBytesAsFile(bytes, nomeArquivo);
  return true;
}
