import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICertificateRequest extends Document {
  alunoId: mongoose.Types.ObjectId;
  cursoId: mongoose.Types.ObjectId;
  dataSolicitacao: Date;
  status: 'pendente' | 'aprovado' | 'recusado';
  dataResposta?: Date;
  respondidoPor?: mongoose.Types.ObjectId;
  motivoRecusa?: string;
  certificadoId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateRequestSchema = new Schema<ICertificateRequest>(
  {
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
    dataSolicitacao: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pendente', 'aprovado', 'recusado'],
      default: 'pendente'
    },
    dataResposta: {
      type: Date
    },
    respondidoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    motivoRecusa: {
      type: String,
      trim: true
    },
    certificadoId: {
      type: Schema.Types.ObjectId,
      ref: 'Certificate'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast queries
CertificateRequestSchema.index({ alunoId: 1 });
CertificateRequestSchema.index({ cursoId: 1 });
CertificateRequestSchema.index({ status: 1 });
CertificateRequestSchema.index({ alunoId: 1, cursoId: 1 });
CertificateRequestSchema.index({ dataSolicitacao: -1 });
CertificateRequestSchema.index({ status: 1, dataSolicitacao: -1 });

export default mongoose.model<ICertificateRequest>('CertificateRequest', CertificateRequestSchema);
