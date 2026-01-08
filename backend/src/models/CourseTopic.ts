import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseTopic extends Document {
  titulo: string;
  descricao?: string;
  cursoId: mongoose.Types.ObjectId;
  ordem: number;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseTopicSchema = new Schema<ICourseTopic>(
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
    cursoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Curso é obrigatório']
    },
    ordem: {
      type: Number,
      default: 0
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

// Index para busca por curso e ordenação
CourseTopicSchema.index({ cursoId: 1, ordem: 1 });

export default mongoose.model<ICourseTopic>('CourseTopic', CourseTopicSchema);
