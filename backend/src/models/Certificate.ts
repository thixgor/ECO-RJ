import mongoose, { Document, Schema, Model } from 'mongoose';

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
  generateValidationCode(): Promise<string>;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    codigoValidacao: {
      type: String,
      required: true,
      unique: true,
      trim: true
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

// Static method to generate unique validation code
CertificateSchema.statics.generateValidationCode = async function(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const now = new Date();
  const year = now.getFullYear();

  let code = '';
  let isUnique = false;

  while (!isUnique) {
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `CERT-${year}-${randomPart}`;

    const existing = await this.findOne({ codigoValidacao: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

export default mongoose.model<ICertificate, ICertificateModel>('Certificate', CertificateSchema);
