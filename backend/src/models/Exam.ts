import mongoose, { Document, Schema } from 'mongoose';

// Interface para prova/avaliação
export interface IExam extends Document {
  titulo: string;
  descricao?: string;
  instrucoes?: string;
  // Questões podem ser referências ao banco de questões
  questoesRef: mongoose.Types.ObjectId[];
  // Ou podem ser de exercícios existentes
  exerciciosRef: mongoose.Types.ObjectId[];
  cursoId?: mongoose.Types.ObjectId;
  cargosPermitidos: string[];
  tentativasPermitidas: number;
  tempoLimite?: number; // em minutos
  dataInicio?: Date;
  dataFim?: Date;
  embaralharQuestoes: boolean;
  embaralharOpcoes: boolean;
  mostrarRespostas: 'imediato' | 'apos_prazo' | 'nunca';
  notaMinima: number; // 0-100 para aprovação
  pesoNota?: number; // peso da prova na nota final do curso
  criadorId: mongoose.Types.ObjectId;
  ativo: boolean;
  publicado: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    titulo: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true
    },
    descricao: {
      type: String,
      trim: true
    },
    instrucoes: {
      type: String,
      trim: true
    },
    questoesRef: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }],
    exerciciosRef: [{
      type: Schema.Types.ObjectId,
      ref: 'Exercise'
    }],
    cursoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    cargosPermitidos: [{
      type: String,
      enum: ['Visitante', 'Aluno', 'Instrutor', 'Administrador'],
      default: ['Aluno', 'Administrador']
    }],
    tentativasPermitidas: {
      type: Number,
      default: 1,
      min: [1, 'Deve permitir ao menos 1 tentativa']
    },
    tempoLimite: {
      type: Number,
      min: [1, 'Tempo limite deve ser no mínimo 1 minuto']
    },
    dataInicio: {
      type: Date
    },
    dataFim: {
      type: Date
    },
    embaralharQuestoes: {
      type: Boolean,
      default: true
    },
    embaralharOpcoes: {
      type: Boolean,
      default: true
    },
    mostrarRespostas: {
      type: String,
      enum: ['imediato', 'apos_prazo', 'nunca'],
      default: 'apos_prazo'
    },
    notaMinima: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    pesoNota: {
      type: Number,
      min: 0,
      max: 100
    },
    criadorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ativo: {
      type: Boolean,
      default: true
    },
    publicado: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Validação: dataFim deve ser após dataInicio
ExamSchema.pre('save', function(next) {
  if (this.dataInicio && this.dataFim) {
    if (this.dataFim <= this.dataInicio) {
      const error = new Error('Data de fim deve ser após a data de início');
      return next(error);
    }
  }
  next();
});

// Índices
ExamSchema.index({ cursoId: 1 });
ExamSchema.index({ criadorId: 1 });
ExamSchema.index({ publicado: 1, ativo: 1 });

export default mongoose.model<IExam>('Exam', ExamSchema);
