import mongoose, { Document, Schema } from 'mongoose';

export interface IExerciseAnswer extends Document {
  exercicioId: mongoose.Types.ObjectId;
  usuarioId: mongoose.Types.ObjectId;
  respostas: any[];
  nota: number;
  tentativa: number;
  createdAt: Date;
}

const ExerciseAnswerSchema = new Schema<IExerciseAnswer>(
  {
    exercicioId: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      required: [true, 'Exercício é obrigatório']
    },
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuário é obrigatório']
    },
    respostas: [{
      type: Schema.Types.Mixed
    }],
    nota: {
      type: Number,
      default: 0
    },
    tentativa: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user + exercise
ExerciseAnswerSchema.index({ exercicioId: 1, usuarioId: 1 });

export default mongoose.model<IExerciseAnswer>('ExerciseAnswer', ExerciseAnswerSchema);
