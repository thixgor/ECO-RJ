import mongoose, { Document, Schema } from 'mongoose';
import { fimDoDiaBR } from '../utils/datetime';

export interface ICourse extends Document {
  titulo: string;
  descricao: string;
  instrutor: mongoose.Types.ObjectId;
  dataInicio: Date;
  dataTermino?: Date; // Data de término do curso. Ao ser atingida, o acesso dos alunos é interrompido e um e-mail é enviado.
  dataLimiteInscricao?: Date;
  imagemCapa?: string;
  aulas: mongoose.Types.ObjectId[];
  ativo: boolean;
  ordem: number; // Ordem de exibição na listagem
  tipo: 'online' | 'presencial'; // Tipo do curso
  // Controle de acesso
  acessoRestrito: boolean; // se true, apenas alunos autorizados podem ver
  alunosAutorizados: mongoose.Types.ObjectId[]; // lista de alunos com acesso
  exibirDuracao: boolean; // se true, exibe "xh e ymin de conteúdo" na página do curso
  certificadoDisponivel: boolean; // se true, certificado disponível para o curso (default: true)
  emissaoCertificadoImediata: boolean; // se true, emite certificado automaticamente ao concluir 100%
  // Configuração de venda (Sistema de Pagamentos)
  venda: {
    disponivel: boolean; // se true, o curso pode ser comprado
    preco: number; // preço base em BRL (reais, com 2 casas decimais)
    descontoAtivado: {
      ativo: boolean;
      tipo: 'percentual' | 'fixo';
      valor: number; // percentual (0-100) ou valor fixo em BRL
    };
    validadeAcessoDias: number; // validade (em dias) da serial key gerada na compra (0 = sem expiração)
  };
  terminoNotificado?: boolean; // controle interno: e-mail de término já foi enviado aos alunos
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    titulo: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true
    },
    descricao: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true
    },
    instrutor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instrutor é obrigatório']
    },
    dataInicio: {
      type: Date,
      required: [true, 'Data de início é obrigatória']
    },
    dataTermino: {
      type: Date
    },
    dataLimiteInscricao: {
      type: Date
    },
    imagemCapa: {
      type: String
    },
    aulas: [{
      type: Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    ativo: {
      type: Boolean,
      default: true
    },
    ordem: {
      type: Number,
      default: 0
    },
    tipo: {
      type: String,
      enum: ['online', 'presencial'],
      default: 'online'
    },
    acessoRestrito: {
      type: Boolean,
      default: false
    },
    alunosAutorizados: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    exibirDuracao: {
      type: Boolean,
      default: true
    },
    certificadoDisponivel: {
      type: Boolean,
      default: true
    },
    emissaoCertificadoImediata: {
      type: Boolean,
      default: false
    },
    venda: {
      disponivel: { type: Boolean, default: false },
      preco: { type: Number, default: 0, min: 0 },
      descontoAtivado: {
        ativo: { type: Boolean, default: false },
        tipo: { type: String, enum: ['percentual', 'fixo'], default: 'percentual' },
        valor: { type: Number, default: 0, min: 0 }
      },
      validadeAcessoDias: { type: Number, default: 365, min: 0 }
    },
    terminoNotificado: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index para busca de cursos por aluno autorizado
CourseSchema.index({ alunosAutorizados: 1 });
// Index para o job de término (buscar cursos vencidos ainda não notificados)
CourseSchema.index({ dataTermino: 1, terminoNotificado: 1 });

/**
 * Retorna true se o curso já atingiu sua data de término.
 * A partir desse momento o acesso dos alunos ao conteúdo é interrompido.
 *
 * O prazo vale até o FIM do dia informado, no horário de Brasília. O campo é
 * preenchido por um `<input type="date">`, que envia `2026-08-19T00:00:00.000Z`:
 * comparar direto com `Date.now()` cortava o acesso às 21h do dia 18/08 — quase
 * 27 horas antes do prazo prometido ao aluno.
 */
export function isCourseExpired(course: { dataTermino?: Date | string | null } | null | undefined): boolean {
  if (!course || !course.dataTermino) return false;
  const limite = fimDoDiaBR(course.dataTermino);
  if (!limite) return false;
  return Date.now() > limite.getTime();
}

/**
 * Instante em que o curso efetivamente expira (fim do dia de término em
 * Brasília). Serve para montar queries — ex.: "cursos já encerrados".
 */
export function courseExpiryInstant(dataTermino?: Date | string | null): Date | null {
  return fimDoDiaBR(dataTermino);
}

export default mongoose.model<ICourse>('Course', CourseSchema);
