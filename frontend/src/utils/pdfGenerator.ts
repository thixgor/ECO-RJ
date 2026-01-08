import jsPDF from 'jspdf';
import { exerciseService } from '../services/api';
import { Exercise } from '../types';
import toast from 'react-hot-toast';

export const generateExercisePDF = async (exercise: Exercise) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);

        // Cores
        const primaryColor = [29, 78, 216]; // blue-700 (#1d4ed8)
        const lightColor = [240, 245, 255]; // blue-50
        const textColor = [31, 41, 55];     // gray-800
        const secondaryColor = [107, 114, 128]; // gray-500

        // Helper para adicionar cabeçalho em cada página
        const addHeader = (pageNum: number) => {
            // Faixa Azul
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, pageWidth, 40, 'F');

            // Título Institucional
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.text('ECO RJ', margin, 20);

            // Subtítulo
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('Centro de Treinamento em Ecocardiografia', margin, 32);

            // Rodapé
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.setFontSize(9);
            doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, margin, pageHeight - 10);
        };

        // 1. Capa / Informações Iniciais
        addHeader(1);

        let y = 60;

        // Título do Exercício
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        const titleLines = doc.splitTextToSize(exercise.titulo, contentWidth);
        doc.text(titleLines, margin, y);
        y += (titleLines.length * 8) + 5;

        // Info Adicional (Aula)
        if (exercise.aulaId && typeof exercise.aulaId !== 'string') {
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Referente à aula: ${(exercise.aulaId as any).titulo}`, margin, y);
            y += 15;
        } else {
            y += 5;
        }

        // Linha divisória
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 20;

        // Buscar questões completas
        const response = await exerciseService.getById(exercise._id);
        const fullExercise = response.data;
        let pageCount = 1;

        // Iterar Questões
        for (let i = 0; i < fullExercise.questoes.length; i++) {
            const q = fullExercise.questoes[i];
            const cleanQuestionText = q.pergunta.replace(/<[^>]+>/g, ''); // Remove HTML simples se houver

            // Verificar quebra de página (estimativa segura)
            if (y > pageHeight - 50) {
                doc.addPage();
                pageCount++;
                addHeader(pageCount);
                y = 60;
            }

            // Caixa do Número da Questão
            doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.roundedRect(margin, y - 5, contentWidth, 12, 1, 1, 'FD');

            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`QUESTÃO ${i + 1}   |   ${q.pontos} Ponto${q.pontos > 1 ? 's' : ''}`, margin + 5, y + 2.5);
            y += 15;

            // Enunciado
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            const splitQuestion = doc.splitTextToSize(cleanQuestionText, contentWidth);
            doc.text(splitQuestion, margin, y);
            y += (splitQuestion.length * 5) + 5;

            // Opções
            if (q.opcoes && q.opcoes.length > 0) {
                y += 2;
                doc.setFontSize(10);
                q.opcoes.forEach((opt: string, optIdx: number) => {
                    const letter = String.fromCharCode(65 + optIdx); // A, B, C...
                    const optText = doc.splitTextToSize(opt, contentWidth - 15);

                    // Check page break para opções
                    if (y + (optText.length * 5) > pageHeight - 30) {
                        doc.addPage();
                        pageCount++;
                        addHeader(pageCount);
                        y = 60;
                    }

                    // Círculo da opção
                    doc.setDrawColor(200, 200, 200);
                    doc.circle(margin + 2.5, y - 1, 2.5);
                    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
                    doc.text(letter, margin + 1.2, y);

                    // Texto da opção
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                    doc.text(optText, margin + 10, y);

                    y += (optText.length * 5) + 4;
                });
            } else if (fullExercise.tipo === 'dissertativo') {
                // Linhas para escrever
                y += 5;
                doc.setDrawColor(220, 220, 220);
                for (let l = 0; l < 5; l++) {
                    if (y > pageHeight - 30) {
                        doc.addPage();
                        pageCount++;
                        addHeader(pageCount);
                        y = 60;
                    }
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 8;
                }
            }

            y += 10; // Espaço entre questões
        }

        // Salvar com o ID do exercício
        doc.save(`${exercise._id}.pdf`);
        toast.success('PDF gerado com sucesso!');
    } catch (error) {
        console.error(error);
        toast.error('Erro ao gerar PDF detalhado');
    }
};
