import mongoose, { Document, Schema } from 'mongoose';

// Interface para questão reutilizável
export interface IQuestion extends Document {
  pergunta: string;
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'dissertativo';
  opcoes?: string[];
  respostaCorreta: string | number | boolean;
  pontos: number;
  explicacao?: string;
  tags: string[];
  dificuldade: 'facil' | 'medio' | 'dificil';
  criadorId: mongoose.Types.ObjectId;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    pergunta: {
      type: String,
      required: [true, 'Pergunta é obrigatória'],
      trim: true
    },
    tipo: {
      type: String,
      enum: ['multipla_escolha', 'verdadeiro_falso', 'dissertativo'],
      required: [true, 'Tipo é obrigatório']
    },
    opcoes: [{
      type: String
    }],
    respostaCorreta: {
      type: Schema.Types.Mixed,
      required: [true, 'Resposta correta é obrigatória']
    },
    pontos: {
      type: Number,
      default: 1,
      min: [0, 'Pontos não pode ser negativo']
    },
    explicacao: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true
    }],
    dificuldade: {
      type: String,
      enum: ['facil', 'medio', 'dificil'],
      default: 'medio'
    },
    criadorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ativo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Índices para busca eficiente
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ tipo: 1 });
QuestionSchema.index({ dificuldade: 1 });
QuestionSchema.index({ criadorId: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
