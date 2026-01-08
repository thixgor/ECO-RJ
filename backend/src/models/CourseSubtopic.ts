import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseSubtopic extends Document {
    titulo: string;
    descricao?: string;
    cursoId: mongoose.Types.ObjectId;
    topicoId: mongoose.Types.ObjectId; // Tópico pai
    ordem: number;
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CourseSubtopicSchema = new Schema<ICourseSubtopic>(
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
        topicoId: {
            type: Schema.Types.ObjectId,
            ref: 'CourseTopic',
            required: [true, 'Tópico é obrigatório']
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

// Indexes para busca eficiente
CourseSubtopicSchema.index({ cursoId: 1, ordem: 1 });
CourseSubtopicSchema.index({ topicoId: 1, ordem: 1 });

export default mongoose.model<ICourseSubtopic>('CourseSubtopic', CourseSubtopicSchema);
