import mongoose, { Document, Schema } from 'mongoose';

export interface ISerialKey extends Document {
  chave: string;
  cargoAtribuido: string;
  validade: Date;
  descricao: string;
  usadaPor?: mongoose.Types.ObjectId;
  dataUso?: Date;
  status: 'pendente' | 'usada' | 'expirada';
  cursoRestrito?: mongoose.Types.ObjectId; // Curso restrito que a chave dará acesso
  createdAt: Date;
}

const SerialKeySchema = new Schema<ISerialKey>(
  {
    chave: {
      type: String,
      required: [true, 'Chave é obrigatória'],
      unique: true,
      trim: true
    },
    cargoAtribuido: {
      type: String,
      required: [true, 'Cargo é obrigatório'],
      enum: ['Visitante', 'Aluno', 'Instrutor', 'Administrador']
    },
    validade: {
      type: Date,
      required: [true, 'Data de validade é obrigatória']
    },
    descricao: {
      type: String,
      trim: true
    },
    usadaPor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    dataUso: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pendente', 'usada', 'expirada'],
      default: 'pendente'
    },
    cursoRestrito: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }
  },
  {
    timestamps: true
  }
);

// Update status based on expiration
SerialKeySchema.pre('save', function(next) {
  if (this.status === 'pendente' && this.validade < new Date()) {
    this.status = 'expirada';
  }
  next();
});

// Generate unique key with format: ECO-YYYYMM-XXXXXXXX
SerialKeySchema.statics.generateKey = function(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
  const yearMonth = `${year}${month}`; // Ex: 202601

  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `ECO-${yearMonth}-${randomPart}`; // Ex: ECO-202601-A7K9B2X5
};

export default mongoose.model<ISerialKey>('SerialKey', SerialKeySchema);
