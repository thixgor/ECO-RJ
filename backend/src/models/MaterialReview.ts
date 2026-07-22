import mongoose, { Document, Schema } from 'mongoose';

/**
 * Avaliação (estrelas + comentário) de um material.
 * Apenas quem COMPROU o material (possui entitlement válido) pode avaliar,
 * e cada usuário avalia um material uma única vez (índice único material+user).
 */
export interface IMaterialReview extends Document {
  material: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  nota: number;          // 1-5
  comentario?: string;
  autorNome: string;     // snapshot do nome do avaliador
  createdAt: Date;
  updatedAt: Date;
}

const MaterialReviewSchema = new Schema<IMaterialReview>(
  {
    material: { type: Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'MaterialOrder' },
    nota: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, trim: true, maxlength: 1000 },
    autorNome: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

// Um usuário só pode avaliar o mesmo material uma vez
MaterialReviewSchema.index({ material: 1, user: 1 }, { unique: true });
MaterialReviewSchema.index({ material: 1, createdAt: -1 });

export default mongoose.model<IMaterialReview>('MaterialReview', MaterialReviewSchema);
