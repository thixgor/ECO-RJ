import mongoose, { Document, Schema } from 'mongoose';

export interface IUserLessonNote extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  cursoId: mongoose.Types.ObjectId;
  conteudo: string;
  timestamp: number; // Video timestamp in seconds
  createdAt: Date;
  updatedAt: Date;
}

const UserLessonNoteSchema = new Schema<IUserLessonNote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID do usuário é obrigatório'],
      index: true
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'ID da aula é obrigatório'],
      index: true
    },
    cursoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'ID do curso é obrigatório']
    },
    conteudo: {
      type: String,
      required: [true, 'Conteúdo da nota é obrigatório'],
      maxlength: [2000, 'Nota deve ter no máximo 2000 caracteres'],
      trim: true
    },
    timestamp: {
      type: Number,
      required: [true, 'Timestamp do vídeo é obrigatório'],
      min: [0, 'Timestamp deve ser maior ou igual a 0']
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
UserLessonNoteSchema.index({ userId: 1, lessonId: 1 });
UserLessonNoteSchema.index({ userId: 1, createdAt: -1 });
UserLessonNoteSchema.index({ lessonId: 1, timestamp: 1 });

export default mongoose.model<IUserLessonNote>('UserLessonNote', UserLessonNoteSchema);
