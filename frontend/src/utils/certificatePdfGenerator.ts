import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Certificate, User, Course } from '../types';
import toast from 'react-hot-toast';

// Logo ECO RJ embutida como base64 para evitar problemas de CSP
const LOGO_BASE64 = 'data:image/png;base64,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';

// Cores do tema ECO RJ - Design moderno e elegante
const PRIMARY_BLUE = [30, 144, 255];    // #1E90FF - Azul primário
const DARK_BLUE = [25, 25, 112];        // #191970 - Azul escuro
const ACCENT_BLUE = [135, 206, 235];    // #87CEEB - Azul claro
const TEXT_DARK = [31, 41, 55];         // Cinza escuro para texto
const TEXT_MUTED = [107, 114, 128];     // Cinza médio
const BORDER_LIGHT = [229, 231, 235];   // Cinza claro para bordas


// Formatar CPF
const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Formatar data por extenso com acentuação correta
const formatDateExtended = (dateStr: string): string => {
  const date = new Date(dateStr);
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
};

// Formatar data simples
const formatDateSimple = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

// Gerar QR Code como data URL
const generateQRCode = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1E90FF',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    });
  } catch {
    return '';
  }
};

// Desenhar cantos arredondados decorativos
const drawCornerDecoration = (doc: jsPDF, x: number, y: number, size: number, rotation: number) => {
  doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  doc.setLineWidth(0.8);

  const cos = Math.cos(rotation * Math.PI / 180);
  const sin = Math.sin(rotation * Math.PI / 180);

  // Linha horizontal
  doc.line(x, y, x + size * cos, y + size * sin);
  // Linha vertical
  doc.line(x, y, x - size * sin, y + size * cos);
};

export interface CertificateData {
  certificate: Certificate;
  aluno: User;
  curso: Course;
}

export const generateCertificatePDF = async (data: CertificateData): Promise<void> => {
  try {
    const { certificate, aluno, curso } = data;

    // Criar documento A4 paisagem para certificado elegante
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;   // 297mm
    const pageHeight = doc.internal.pageSize.height; // 210mm
    const margin = 12;

    // URL de validação - usar ecorj.com
    const validationUrl = `https://ecorj.com/validar?code=${certificate.codigoValidacao}`;

    // Gerar QR Code
    const qrCodeBase64 = await generateQRCode(validationUrl);

    // ============= FUNDO =============

    // Fundo branco limpo
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // ============= BORDA DECORATIVA MODERNA =============

    // Borda externa fina azul claro
    doc.setDrawColor(ACCENT_BLUE[0], ACCENT_BLUE[1], ACCENT_BLUE[2]);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, 'S');

    // Borda interna azul primário
    doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.setLineWidth(1.5);
    doc.rect(margin + 4, margin + 4, pageWidth - 2 * margin - 8, pageHeight - 2 * margin - 8, 'S');

    // Decorações nos cantos (linhas elegantes)
    const cornerSize = 20;
    const cornerOffset = margin + 8;

    // Canto superior esquerdo
    drawCornerDecoration(doc, cornerOffset, cornerOffset, cornerSize, 0);
    // Canto superior direito
    drawCornerDecoration(doc, pageWidth - cornerOffset, cornerOffset, cornerSize, 90);
    // Canto inferior direito
    drawCornerDecoration(doc, pageWidth - cornerOffset, pageHeight - cornerOffset, cornerSize, 180);
    // Canto inferior esquerdo
    drawCornerDecoration(doc, cornerOffset, pageHeight - cornerOffset, cornerSize, 270);

    // ============= CABEÇALHO =============

    let y = margin + 20;

    // Logo centralizado com proporções corretas (embutida como base64)
    const logoHeight = 22;
    const logoWidth = logoHeight * 2.5; // Proporção aproximada 2.5:1
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(LOGO_BASE64, 'PNG', logoX, y, logoWidth, logoHeight);
    y += logoHeight + 6;

    // Subtítulo institucional
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Centro de Treinamento em Ecocardiografia', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Linha decorativa gradiente (simulada com duas linhas)
    const lineWidth = 120;
    const lineStartX = (pageWidth - lineWidth) / 2;
    doc.setDrawColor(ACCENT_BLUE[0], ACCENT_BLUE[1], ACCENT_BLUE[2]);
    doc.setLineWidth(0.8);
    doc.line(lineStartX, y, lineStartX + lineWidth, y);
    doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.setLineWidth(0.3);
    doc.line(lineStartX + 20, y + 2, lineStartX + lineWidth - 20, y + 2);
    y += 12;

    // ============= TÍTULO =============

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(38);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text('CERTIFICADO', pageWidth / 2, y, { align: 'center' });
    y += 16;

    // ============= CORPO DO CERTIFICADO =============

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text('Certificamos que', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Nome do aluno em destaque
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text(aluno.nomeCompleto.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 9;

    // Dados pessoais em linha única
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    const personalInfo = `CPF: ${formatCPF(aluno.cpf)}  •  Data de Nascimento: ${formatDateSimple(aluno.dataNascimento)}`;
    doc.text(personalInfo, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Texto de conclusão
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text('concluiu com êxito o curso', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Nome do curso em destaque
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);

    // Quebrar título se for muito longo
    const cursoTitle = curso.titulo.toUpperCase();
    const maxWidth = pageWidth - 2 * margin - 60;
    const titleLines = doc.splitTextToSize(cursoTitle, maxWidth);
    doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
    y += titleLines.length * 8 + 8;

    // Carga horária
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const hoursText = certificate.cargaHoraria < 1
      ? `${Math.round(certificate.cargaHoraria * 60)} minutos`
      : `${certificate.cargaHoraria} hora${certificate.cargaHoraria !== 1 ? 's' : ''}`;
    doc.text(`com carga horária total de ${hoursText}.`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Data de emissão
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Emitido em ${formatDateExtended(certificate.dataEmissao)}`, pageWidth / 2, y, { align: 'center' });

    // ============= RODAPÉ =============

    const footerY = pageHeight - margin - 48;

    // QR Code (esquerda) - dentro de um card sutil
    if (qrCodeBase64) {
      const qrSize = 32;
      const qrX = margin + 25;

      // Background sutil para o QR
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(qrX - 4, footerY - 2, qrSize + 8, qrSize + 16, 2, 2, 'FD');

      doc.addImage(qrCodeBase64, 'PNG', qrX, footerY, qrSize, qrSize);

      // Texto abaixo do QR
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text('Escaneie para validar', qrX + qrSize / 2, footerY + qrSize + 6, { align: 'center' });
    }

    // Assinatura (centro)
    const signatureX = pageWidth / 2;

    // Linha de assinatura elegante
    doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
    doc.setLineWidth(0.5);
    doc.line(signatureX - 45, footerY + 18, signatureX + 45, footerY + 18);

    // Nome do coordenador
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text('Ronaldo Campos Rodrigues', signatureX, footerY + 25, { align: 'center' });

    // Cargo e instituição
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Coordenador', signatureX, footerY + 31, { align: 'center' });
    doc.text('ECO RJ - Centro de Treinamento em Ecocardiografia', signatureX, footerY + 36, { align: 'center' });

    // Código de validação (direita) - em um card destacado
    const codeX = pageWidth - margin - 55;

    // Background para o código - maior para caber SHA-256 completo
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(codeX - 35, footerY - 2, 70, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Código de Validação', codeX, footerY + 5, { align: 'center' });

    // Código SHA-256 completo em duas linhas (fonte pequena)
    const fullCode = certificate.codigoValidacao;
    const codePart1 = fullCode.substring(0, 32);
    const codePart2 = fullCode.substring(32);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.text(codePart1, codeX, footerY + 13, { align: 'center' });
    doc.text(codePart2, codeX, footerY + 18, { align: 'center' });

    // URL correta em fonte menor
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('ecorj.com/validar', codeX, footerY + 28, { align: 'center' });

    // ============= RODAPÉ INSTITUCIONAL =============
    // Posicionado acima da borda interna para não ser tampado

    const currentYear = new Date().getFullYear();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(
      `© ${currentYear} ECO RJ - Centro de Treinamento em Ecocardiografia  •  CNPJ: 21.847.609/0001-70  •  Todos os direitos reservados`,
      pageWidth / 2,
      pageHeight - margin - 8,
      { align: 'center' }
    );

    // ============= SALVAR =============

    const fileName = `certificado-${aluno.nomeCompleto.replace(/\s+/g, '-').toLowerCase()}-${curso.titulo.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    doc.save(fileName);

    toast.success('Certificado gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar certificado PDF:', error);
    toast.error('Erro ao gerar certificado PDF');
  }
};
