/**
 * Marca d'água + metadados em PDFs, aplicados NO SERVIDOR.
 *
 * Este é o ÚNICO lugar onde a marca d'água é gerada — tanto para os anexos
 * enviados por e-mail quanto para os downloads feitos pelo navegador. Antes o
 * navegador refazia esse trabalho com `pdf-lib`, o que travava o computador do
 * usuário em apostilas grandes e falhava no iOS (blob).
 *
 * ## Por que é leve
 *
 * A marca é desenhada UMA vez em um Form XObject e apenas *referenciada* em
 * cada página (`page.drawPage`). Assim, um PDF de 300 páginas ganha 1 objeto de
 * conteúdo + 300 referências curtas, em vez de 300 cópias de ~13 operações de
 * texto com estados gráficos próprios. O resultado é dramaticamente menor e
 * mais rápido de gerar e de abrir.
 *
 * `pdf-lib` é importado dinamicamente para não pesar no cold start.
 */

/** Acima deste tamanho o PDF é entregue sem marca visível (só metadados são inviáveis também). */
const MAX_WATERMARK_BYTES = Math.max(
  1_000_000,
  Number(process.env.PDF_WATERMARK_MAX_BYTES || 60 * 1024 * 1024)
);

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

export function hasWatermarkIdentity(identity?: WatermarkIdentity | null): boolean {
  if (!identity) return false;
  return !!((identity.nome && identity.nome.trim()) ||
    (identity.cpf && String(identity.cpf).replace(/\D/g, '').length >= 3) ||
    (identity.email && identity.email.trim()));
}

/** Textos derivados da identidade do titular. */
function buildLabels(identity: WatermarkIdentity) {
  const nome = (identity.nome || '').trim();
  const cpf = formatCpf(identity.cpf);
  const email = (identity.email || '').trim();
  const titular = nome || email || 'Titular licenciado';
  const secundario = [cpf ? `CPF ${cpf}` : '', email].filter(Boolean).join('   •   ');
  const idLinha = [nome && `Nome: ${nome}`, cpf && `CPF: ${cpf}`, email && `E-mail: ${email}`]
    .filter(Boolean)
    .join(' | ');
  return { nome, cpf, email, titular, secundario, idLinha };
}

/**
 * Aplica marca d'água e metadados a um PDF. Recebe e devolve Buffer.
 *
 * Em caso de erro (PDF cifrado/corrompido) ou arquivo muito grande, devolve o
 * buffer ORIGINAL — a entrega do produto nunca é bloqueada pela marca d'água.
 */
export async function watermarkPdfBuffer(
  input: Buffer | Uint8Array,
  identity: WatermarkIdentity
): Promise<Buffer> {
  const original = Buffer.isBuffer(input) ? input : Buffer.from(input);

  if (original.length > MAX_WATERMARK_BYTES) {
    console.warn(
      `PDF de ${original.length} bytes acima do limite de marca d'água (${MAX_WATERMARK_BYTES}); enviando original.`
    );
    return original;
  }

  try {
    const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');

    // updateMetadata:false evita que o pdf-lib sobrescreva nossos metadados.
    const pdfDoc = await PDFDocument.load(original, { updateMetadata: false });
    const { nome, cpf, email, titular, secundario, idLinha } = buildLabels(identity);

    const pages = pdfDoc.getPages();

    // Um template por tamanho de página distinto (quase sempre um só). Cada
    // template vira um Form XObject reaproveitado por todas as páginas daquele
    // tamanho — é isso que mantém o arquivo leve.
    const stampDoc = await PDFDocument.create();
    const stampFont = await stampDoc.embedFont(StandardFonts.Helvetica);
    const gray = rgb(0.5, 0.5, 0.5);
    const angle = -30;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    /** Desenha um texto rotacionado, centralizado horizontalmente em (cx, cy). */
    const drawCentered = (page: any, text: string, cx: number, cy: number, size: number, opacity: number) => {
      if (!text) return;
      const w = stampFont.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: cx - (w / 2) * cos,
        y: cy - (w / 2) * sin,
        size,
        font: stampFont,
        color: gray,
        opacity,
        rotate: degrees(angle)
      });
    };

    const stampCache = new Map<string, any>();
    const getStamp = async (width: number, height: number) => {
      const key = `${Math.round(width)}x${Math.round(height)}`;
      const cached = stampCache.get(key);
      if (cached) return cached;

      const stampPage = stampDoc.addPage([width, height]);

      // Grade discreta (2 colunas x 3 linhas): identifica o titular sem poluir.
      const cols = 2;
      const rows = 3;
      const primSize = Math.max(10, Math.min(16, width / 34));
      const secSize = primSize - 3;
      for (let ci = 0; ci < cols; ci++) {
        for (let ri = 0; ri < rows; ri++) {
          const cx = (width / (cols + 1)) * (ci + 1);
          const cy = (height / (rows + 1)) * (ri + 1);
          drawCentered(stampPage, titular, cx, cy + 8, primSize, 0.1);
          if (secundario) drawCentered(stampPage, secundario, cx, cy - 8, secSize, 0.1);
        }
      }

      // Rodapé identificador: pequeno, discreto e difícil de recortar por completo.
      const rodape = [`Licenciado para ${titular}`, secundario].filter(Boolean).join('   —   ');
      const rSize = 6;
      const rW = stampFont.widthOfTextAtSize(rodape, rSize);
      stampPage.drawText(rodape, {
        x: Math.max(6, (width - rW) / 2),
        y: 6,
        size: rSize,
        font: stampFont,
        color: gray,
        opacity: 0.55
      });

      const embedded = await pdfDoc.embedPage(stampPage);
      stampCache.set(key, embedded);
      return embedded;
    };

    for (const page of pages) {
      const { width, height } = page.getSize();
      const stamp = await getStamp(width, height);
      page.drawPage(stamp, { x: 0, y: 0, width, height });
    }

    // Metadados — rastreabilidade mesmo sem a marca visível.
    const tituloOriginal = (pdfDoc.getTitle() || '').trim();
    pdfDoc.setTitle(`${tituloOriginal ? `${tituloOriginal} — ` : ''}Cópia licenciada para ${titular}`);
    pdfDoc.setAuthor(nome || email || 'ECO RJ');
    pdfDoc.setSubject(`Cópia licenciada individualmente. ${idLinha}`);
    pdfDoc.setKeywords([nome, cpf, email, 'ECO RJ', 'licenciado'].filter(Boolean) as string[]);
    pdfDoc.setProducer(`ECO RJ — Cópia licenciada (${idLinha})`);
    pdfDoc.setCreator('ECO RJ - Centro de Treinamento em Ecocardiografia');
    pdfDoc.setModificationDate(new Date());

    const bytes = await pdfDoc.save({ useObjectStreams: true });
    return Buffer.from(bytes);
  } catch (err) {
    console.error('Falha ao aplicar marca d\'água no PDF (enviando original):', err);
    return original;
  }
}
