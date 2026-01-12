import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Certificate, User, Course } from '../types';
import toast from 'react-hot-toast';

// Logo ECO RJ embutida como base64 para evitar problemas de CSP
// Logo ECO RJ via URL Imgur
const LOGO_URL = 'https://i.imgur.com/vyCPuyf.png';

// Função auxiliar para converter imagem URL para Base64
const imageUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Erro ao carregar logo, usando fallback ou ignorando:', error);
    return '';
  }
};

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

    // Carregar logo do Imgur
    let logoBase64 = '';
    try {
      logoBase64 = await imageUrlToBase64(LOGO_URL);
    } catch (e) {
      console.error('Falha ao carregar logo para o certificado:', e);
    }

    // Logo centralizado com proporções corretas
    const logoHeight = 22;
    const logoWidth = logoHeight * 2.5; // Proporção aproximada 2.5:1
    const logoX = (pageWidth - logoWidth) / 2;

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', logoX, y, logoWidth, logoHeight);
    }
    // Se não tiver logo, simplesmente deixa o espaço em branco
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
