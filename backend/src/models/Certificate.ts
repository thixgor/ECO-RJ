import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';

export interface ICertificate extends Document {
  codigoValidacao: string;
  alunoId: mongoose.Types.ObjectId;
  cursoId: mongoose.Types.ObjectId;
  dataEmissao: Date;
  cargaHoraria: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ICertificateModel extends Model<ICertificate> {
  generateValidationCode(alunoId: string, cursoId: string): Promise<string>;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    codigoValidacao: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    alunoId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Aluno é obrigatório']
    },
    cursoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Curso é obrigatório']
    },
    dataEmissao: {
      type: Date,
      default: Date.now
    },
    cargaHoraria: {
      type: Number,
      required: [true, 'Carga horária é obrigatória'],
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast queries
CertificateSchema.index({ alunoId: 1 });
CertificateSchema.index({ cursoId: 1 });
CertificateSchema.index({ codigoValidacao: 1 });
CertificateSchema.index({ alunoId: 1, cursoId: 1 });
CertificateSchema.index({ dataEmissao: -1 });

// Static method to generate unique validation code using SHA-256
CertificateSchema.statics.generateValidationCode = async function(
  alunoId: string,
  cursoId: string
): Promise<string> {
  let hash: string;
  let isUnique = false;

  // Loop until we find a unique hash (virtually always first try)
  while (!isUnique) {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');

    // Create a unique string combining aluno, curso, timestamp, and random bytes
    const dataToHash = `${alunoId}-${cursoId}-${timestamp}-${randomBytes}`;

    // Generate SHA-256 hash
    hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // Verify uniqueness (SHA-256 collisions are extremely unlikely, but we check anyway)
    const existing = await this.findOne({ codigoValidacao: hash });
    if (!existing) {
      isUnique = true;
    }
  }

  return hash!;
};

export default mongoose.model<ICertificate, ICertificateModel>('Certificate', CertificateSchema);
