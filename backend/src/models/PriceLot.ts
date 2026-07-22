import mongoose, { Document, Schema } from 'mongoose';

/**
 * Lote de desconto: preço promocional por quantidade limitada.
 * Ex: "Lote 1 - Primeiros 20 alunos" com preço reduzido.
 * Quando o lote esgota (quantidadeVendida >= quantidadeTotal), o próximo
 * lote ativo (menor ordem) passa a valer. Sem lotes ativos => preço base do curso.
 */
export interface IPriceLot extends Document {
  curso: mongoose.Types.ObjectId;
  nome: string;
  preco: number; // preço promocional do lote (BRL)
  quantidadeTotal: number; // 0 = ilimitado
  quantidadeVendida: number;
  ordem: number;
  ativo: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PriceLotSchema = new Schema<IPriceLot>(
  {
    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Curso é obrigatório'],
      index: true
    },
    nome: {
      type: String,
      required: [true, 'Nome do lote é obrigatório'],
      trim: true
    },
    preco: {
      type: Number,
      required: true,
      min: 0
    },
    quantidadeTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    quantidadeVendida: {
      type: Number,
      default: 0,
      min: 0
    },
    ordem: {
      type: Number,
      default: 0
    },
    ativo: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

PriceLotSchema.index({ curso: 1, ordem: 1 });

export default mongoose.model<IPriceLot>('PriceLot', PriceLotSchema);
