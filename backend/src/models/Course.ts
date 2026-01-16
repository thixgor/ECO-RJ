import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  titulo: string;
  descricao: string;
  instrutor: mongoose.Types.ObjectId;
  dataInicio: Date;
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
    }
  },
  {
    timestamps: true
  }
);

// Index para busca de cursos por aluno autorizado
CourseSchema.index({ alunosAutorizados: 1 });

export default mongoose.model<ICourse>('Course', CourseSchema);
