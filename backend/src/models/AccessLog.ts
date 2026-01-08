import mongoose, { Document, Schema } from 'mongoose';

export interface IAccessLog extends Document {
  usuarioId: mongoose.Types.ObjectId;
  tipo: 'curso' | 'aula' | 'exercicio' | 'prova' | 'login';
  cursoId?: mongoose.Types.ObjectId;
  aulaId?: mongoose.Types.ObjectId;
  exercicioId?: mongoose.Types.ObjectId;
  provaId?: mongoose.Types.ObjectId;
  ip: string;
  userAgent?: string;
  duracao?: number; // tempo em segundos na página
  createdAt: Date;
}

const AccessLogSchema = new Schema<IAccessLog>(
  {
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tipo: {
      type: String,
      enum: ['curso', 'aula', 'exercicio', 'prova', 'login'],
      required: true,
      index: true
    },
    cursoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      index: true
    },
    aulaId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      index: true
    },
    exercicioId: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      index: true
    },
    provaId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      index: true
    },
    ip: {
      type: String,
      required: true
    },
    userAgent: {
      type: String
    },
    duracao: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

// Index composto para buscas frequentes
AccessLogSchema.index({ usuarioId: 1, createdAt: -1 });
AccessLogSchema.index({ cursoId: 1, createdAt: -1 });
AccessLogSchema.index({ tipo: 1, createdAt: -1 });

export default mongoose.model<IAccessLog>('AccessLog', AccessLogSchema);
