import mongoose, { Document, Schema } from 'mongoose';

// Interface para resposta individual de questão na prova
export interface IExamQuestionAnswer {
  questaoId: mongoose.Types.ObjectId;
  resposta: string | number | boolean;
  correta?: boolean;
  pontosObtidos?: number;
}

// Interface para resposta de prova
export interface IExamAnswer extends Document {
  provaId: mongoose.Types.ObjectId;
  usuarioId: mongoose.Types.ObjectId;
  respostas: IExamQuestionAnswer[];
  nota: number;
  aprovado: boolean;
  tentativa: number;
  iniciadoEm: Date;
  finalizadoEm?: Date;
  tempoGasto?: number; // em segundos
  ip: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamQuestionAnswerSchema = new Schema({
  questaoId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  resposta: {
    type: Schema.Types.Mixed,
    required: true
  },
  correta: {
    type: Boolean
  },
  pontosObtidos: {
    type: Number,
    default: 0
  }
}, { _id: false });

const ExamAnswerSchema = new Schema<IExamAnswer>(
  {
    provaId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Prova é obrigatória']
    },
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuário é obrigatório']
    },
    respostas: [ExamQuestionAnswerSchema],
    nota: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    aprovado: {
      type: Boolean,
      default: false
    },
    tentativa: {
      type: Number,
      default: 1,
      min: 1
    },
    iniciadoEm: {
      type: Date,
      required: true,
      default: Date.now
    },
    finalizadoEm: {
      type: Date
    },
    tempoGasto: {
      type: Number // em segundos
    },
    ip: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Índice composto para busca eficiente
ExamAnswerSchema.index({ provaId: 1, usuarioId: 1 });
ExamAnswerSchema.index({ usuarioId: 1 });

// Calcular tempo gasto antes de salvar
ExamAnswerSchema.pre('save', function(next) {
  if (this.finalizadoEm && this.iniciadoEm) {
    this.tempoGasto = Math.floor((this.finalizadoEm.getTime() - this.iniciadoEm.getTime()) / 1000);
  }
  next();
});

export default mongoose.model<IExamAnswer>('ExamAnswer', ExamAnswerSchema);
