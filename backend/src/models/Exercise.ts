import mongoose, { Document, Schema } from 'mongoose';

// Interface para questão inline (legado - para compatibilidade)
export interface IInlineQuestion {
  pergunta: string;
  imagem?: string; // URL da imagem (opcional)
  opcoes?: string[];
  respostaCorreta: string | number;
  respostaComentada?: string; // Explicação da resposta
  fonteBibliografica?: string; // Fonte bibliográfica
  pontos: number;
}

export interface IExercise extends Document {
  titulo: string;
  descricao?: string;
  // aulaId agora é opcional - exercícios podem ser independentes
  aulaId?: mongoose.Types.ObjectId;
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'dissertativo' | 'misto';
  // Questões podem ser inline (legado) ou referências a Question
  questoes: IInlineQuestion[];
  questoesRef: mongoose.Types.ObjectId[];
  cargosPermitidos: string[];
  tentativasPermitidas: number;
  tempoLimite?: number; // em minutos
  embaralharQuestoes: boolean;
  mostrarRespostas: boolean;
  notaMinima?: number; // nota mínima para aprovação (0-100)
  criadorId: mongoose.Types.ObjectId;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InlineQuestionSchema = new Schema({
  pergunta: {
    type: String,
    required: true
  },
  imagem: {
    type: String // URL da imagem
  },
  opcoes: [{
    type: String
  }],
  respostaCorreta: {
    type: Schema.Types.Mixed,
    required: true
  },
  respostaComentada: {
    type: String
  },
  fonteBibliografica: {
    type: String
  },
  pontos: {
    type: Number,
    default: 1
  }
}, { _id: false });

const ExerciseSchema = new Schema<IExercise>(
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
    aulaId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson'
      // Não é mais obrigatório - exercícios podem ser independentes
    },
    tipo: {
      type: String,
      enum: ['multipla_escolha', 'verdadeiro_falso', 'dissertativo', 'misto'],
      required: [true, 'Tipo é obrigatório']
    },
    questoes: [InlineQuestionSchema],
    questoesRef: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }],
    cargosPermitidos: [{
      type: String,
      enum: ['Visitante', 'Aluno', 'Instrutor', 'Administrador']
    }],
    tentativasPermitidas: {
      type: Number,
      default: 999999 // Padrão: praticamente ilimitado
    },
    tempoLimite: {
      type: Number,
      min: [1, 'Tempo limite deve ser no mínimo 1 minuto']
    },
    embaralharQuestoes: {
      type: Boolean,
      default: false
    },
    mostrarRespostas: {
      type: Boolean,
      default: true
    },
    notaMinima: {
      type: Number,
      min: 0,
      max: 100
    },
    criadorId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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

export default mongoose.model<IExercise>('Exercise', ExerciseSchema);
