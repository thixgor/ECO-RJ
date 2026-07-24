/**
 * Marca d'água + metadados em PDFs no SERVIDOR (para os anexos enviados por
 * e-mail ao comprador convidado). Mantém a mesma identidade visual/rastreável
 * do fluxo client-side: poucas repetições por página + metadados do documento.
 *
 * `pdf-lib` é importado dinamicamente para não pesar no cold start das funções.
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

export function hasWatermarkIdentity(identity?: WatermarkIdentity | null): boolean {
  if (!identity) return false;
  return !!((identity.nome && identity.nome.trim()) ||
    (identity.cpf && String(identity.cpf).replace(/\D/g, '').length >= 3) ||
    (identity.email && identity.email.trim()));
}

/**
 * Aplica marca d'água e metadados a um PDF. Recebe e devolve Buffer.
 * Em caso de erro (PDF cifrado/corrompido), devolve o buffer ORIGINAL para
 * não impedir a entrega do arquivo por e-mail.
 */
export async function watermarkPdfBuffer(
  input: Buffer | Uint8Array,
  identity: WatermarkIdentity
): Promise<Buffer> {
  try {
    const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');
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

    const drawCentered = (page: any, text: string, cx: number, cy: number, size: number, opacity: number) => {
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

    const idLinha = [nome && `Nome: ${nome}`, cpf && `CPF: ${cpf}`, email && `E-mail: ${email}`]
      .filter(Boolean)
      .join(' | ');
    const tituloOriginal = (pdfDoc.getTitle() || '').trim();
    pdfDoc.setTitle(`${tituloOriginal ? `${tituloOriginal} — ` : ''}Cópia licenciada para ${titular}`);
    pdfDoc.setAuthor(nome || email || 'ECO RJ');
    pdfDoc.setSubject(`Cópia licenciada individualmente. ${idLinha}`);
    pdfDoc.setKeywords([nome, cpf, email, 'ECO RJ', 'licenciado'].filter(Boolean) as string[]);
    pdfDoc.setProducer(`ECO RJ — Cópia licenciada (${idLinha})`);
    pdfDoc.setCreator('ECO RJ - Centro de Treinamento em Ecocardiografia');
    pdfDoc.setModificationDate(new Date());

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  } catch (err) {
    console.error('Falha ao aplicar marca d\'água no PDF (enviando original):', err);
    return Buffer.isBuffer(input) ? input : Buffer.from(input);
  }
}
