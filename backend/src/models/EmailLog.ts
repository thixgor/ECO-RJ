import mongoose, { Document, Schema } from 'mongoose';

export type EmailStatus = 'enviado' | 'falhou' | 'simulado' | 'pendente';

export interface IEmailLog extends Document {
  para: string; // Email do destinatário
  nomeDestinatario?: string;
  assunto: string;
  templateKey?: string; // Qual template foi usado (se algum)
  categoria: 'sistema' | 'manual'; // sistema = automático (boas-vindas, compra, término), manual = enviado pelo admin
  status: EmailStatus;
  erro?: string; // Mensagem de erro caso status = falhou
  destinatario?: mongoose.Types.ObjectId; // Usuário destinatário (se cadastrado)
  cursoRelacionado?: mongoose.Types.ObjectId; // Curso associado (compra/término)
  enviadoPor?: mongoose.Types.ObjectId; // Admin que disparou (envios manuais)
  loteId?: string; // Agrupa envios em massa de um mesmo disparo
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    para: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    nomeDestinatario: {
      type: String,
      trim: true
    },
    assunto: {
      type: String,
      required: true,
      trim: true
    },
    templateKey: {
      type: String,
      trim: true
    },
    categoria: {
      type: String,
      enum: ['sistema', 'manual'],
      default: 'manual'
    },
    status: {
      type: String,
      enum: ['enviado', 'falhou', 'simulado', 'pendente'],
      default: 'pendente'
    },
    erro: {
      type: String
    },
    destinatario: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    cursoRelacionado: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    enviadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    loteId: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Índices para consultas frequentes e deduplicação
EmailLogSchema.index({ createdAt: -1 });
EmailLogSchema.index({ status: 1 });
EmailLogSchema.index({ categoria: 1 });
EmailLogSchema.index({ templateKey: 1 });
// Deduplicação de e-mails de término de curso (um por usuário/curso)
EmailLogSchema.index({ destinatario: 1, cursoRelacionado: 1, templateKey: 1 });

export default mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
