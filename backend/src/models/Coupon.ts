import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  codigo: string;
  descricao: string;
  tipo: 'percentual' | 'fixo';
  valor: number; // percentual (0-100) ou valor fixo em BRL
  ativo: boolean;
  dataInicio?: Date;
  dataValidade?: Date;
  usosMaximos: number; // 0 = ilimitado
  usosAtuais: number;
  usosPorEmail: number; // 0 = ilimitado por email
  valorMinimoCompra: number; // valor minimo do subtotal para aplicar (0 = sem minimo)
  cursosAplicaveis: mongoose.Types.ObjectId[]; // vazio = todos os cursos
  emailsQueUsaram: string[]; // controle anti-abuso por email
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    codigo: {
      type: String,
      required: [true, 'Código do cupom é obrigatório'],
      unique: true,
      uppercase: true,
      trim: true
    },
    descricao: {
      type: String,
      trim: true,
      default: ''
    },
    tipo: {
      type: String,
      enum: ['percentual', 'fixo'],
      required: true,
      default: 'percentual'
    },
    valor: {
      type: Number,
      required: true,
      min: 0
    },
    ativo: {
      type: Boolean,
      default: true
    },
    dataInicio: {
      type: Date
    },
    dataValidade: {
      type: Date
    },
    usosMaximos: {
      type: Number,
      default: 0,
      min: 0
    },
    usosAtuais: {
      type: Number,
      default: 0,
      min: 0
    },
    usosPorEmail: {
      type: Number,
      default: 1,
      min: 0
    },
    valorMinimoCompra: {
      type: Number,
      default: 0,
      min: 0
    },
    cursosAplicaveis: [{
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }],
    emailsQueUsaram: [{
      type: String
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

CouponSchema.index({ codigo: 1 });

export default mongoose.model<ICoupon>('Coupon', CouponSchema);
