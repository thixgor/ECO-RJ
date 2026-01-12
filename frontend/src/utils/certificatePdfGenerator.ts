import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Certificate, User, Course } from '../types';
import toast from 'react-hot-toast';

const LOGO_URL = 'https://i.imgur.com/vyCPuyf.png';

// Cores do tema ECO RJ
const PRIMARY_BLUE = [30, 144, 255]; // #1E90FF
const DARK_BLUE = [25, 25, 112];     // #191970
const GOLD = [218, 165, 32];         // Dourado para detalhes
const TEXT_DARK = [31, 41, 55];      // Cinza escuro

// Helper para carregar imagem como base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Formatar CPF
const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Formatar data por extenso
const formatDateExtended = (dateStr: string): string => {
  const date = new Date(dateStr);
  const months = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
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
      width: 150,
      margin: 1,
      color: {
        dark: '#191970',
        light: '#FFFFFF'
      }
    });
  } catch {
    return '';
  }
};

export interface CertificateData {
  certificate: Certificate;
  aluno: User;
  curso: Course;
}

export const generateCertificatePDF = async (data: CertificateData): Promise<void> => {
  try {
    const { certificate, aluno, curso } = data;

    // Criar documento A4 paisagem para certificado mais elegante
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;   // 297mm
    const pageHeight = doc.internal.pageSize.height; // 210mm
    const margin = 15;

    // URL de validacao
    const validationUrl = `${window.location.origin}/validar?code=${certificate.codigoValidacao}`;

    // Carregar logo e QR Code em paralelo
    const [logoBase64, qrCodeBase64] = await Promise.all([
      loadImageAsBase64(LOGO_URL),
      generateQRCode(validationUrl)
    ]);

    // ============= FUNDO E BORDAS =============

    // Fundo branco
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Borda externa dourada
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(2);
    doc.rect(margin - 5, margin - 5, pageWidth - 2 * margin + 10, pageHeight - 2 * margin + 10, 'S');

    // Borda interna azul
    doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin, 'S');

    // ============= CABECALHO =============

    let y = margin + 15;

    // Logo centralizado
    if (logoBase64) {
      const logoWidth = 50;
      const logoHeight = 25;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoBase64, 'PNG', logoX, y, logoWidth, logoHeight);
      y += logoHeight + 8;
    } else {
      // Fallback: texto do logo
      doc.setFont('times', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
      doc.text('ECO RJ', pageWidth / 2, y, { align: 'center' });
      y += 12;
    }

    // Linha decorativa
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(1);
    doc.line(margin + 40, y, pageWidth - margin - 40, y);
    y += 8;

    // ============= TITULO =============

    doc.setFont('times', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text('CERTIFICADO', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // ============= CORPO DO CERTIFICADO =============

    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text('Certificamos que', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Nome do aluno em destaque
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text(aluno.nomeCompleto.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Dados pessoais
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`CPF: ${formatCPF(aluno.cpf)}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.text(`Data de Nascimento: ${formatDateSimple(aluno.dataNascimento)}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Texto de conclusao
    doc.setFontSize(14);
    doc.text('concluiu com exito o curso', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Nome do curso em destaque
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);

    // Quebrar titulo se for muito longo
    const cursoTitle = curso.titulo.toUpperCase();
    const maxWidth = pageWidth - 2 * margin - 40;
    const titleLines = doc.splitTextToSize(cursoTitle, maxWidth);
    doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
    y += titleLines.length * 8 + 8;

    // Carga horaria
    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const hoursText = certificate.cargaHoraria < 1
      ? `${Math.round(certificate.cargaHoraria * 60)} minutos`
      : `${certificate.cargaHoraria} horas`;
    doc.text(`com carga horaria total de ${hoursText}.`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Data de emissao
    doc.text(`Data de emissao: ${formatDateExtended(certificate.dataEmissao)}`, pageWidth / 2, y, { align: 'center' });

    // ============= RODAPE =============

    // Posicionar elementos do rodape
    const footerY = pageHeight - margin - 45;

    // QR Code (esquerda)
    if (qrCodeBase64) {
      const qrSize = 35;
      doc.addImage(qrCodeBase64, 'PNG', margin + 20, footerY, qrSize, qrSize);

      // Texto abaixo do QR
      doc.setFontSize(8);
      doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
      doc.text('Escaneie para validar', margin + 20 + qrSize / 2, footerY + qrSize + 5, { align: 'center' });
    }

    // Assinatura (centro)
    const signatureX = pageWidth / 2;

    // Linha de assinatura
    doc.setDrawColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setLineWidth(0.3);
    doc.line(signatureX - 50, footerY + 15, signatureX + 50, footerY + 15);

    // Nome do coordenador
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(DARK_BLUE[0], DARK_BLUE[1], DARK_BLUE[2]);
    doc.text('Ronaldo Campos Rodrigues', signatureX, footerY + 22, { align: 'center' });

    // Cargo
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text('Coordenador', signatureX, footerY + 28, { align: 'center' });
    doc.text('ECO RJ - Centro de Treinamento em Ecocardiografia', signatureX, footerY + 34, { align: 'center' });

    // Codigo de validacao (direita)
    const codeX = pageWidth - margin - 60;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text('Codigo de Validacao:', codeX, footerY + 10, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.text(certificate.codigoValidacao, codeX, footerY + 18, { align: 'center' });

    // ============= RODAPE INSTITUCIONAL =============

    const currentYear = new Date().getFullYear();
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `© ${currentYear} ECO RJ - Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70`,
      pageWidth / 2,
      pageHeight - margin - 3,
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
