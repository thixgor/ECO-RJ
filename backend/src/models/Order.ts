import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus =
  | 'pendente'      // criado, aguardando pagamento
  | 'em_processo'   // pagamento em análise
  | 'aprovado'      // pago
  | 'rejeitado'     // pagamento recusado
  | 'cancelado'     // expirado/cancelado
  | 'reembolsado';  // estornado

export interface IOrderValores {
  precoBase: number;        // preço base do curso
  descontoLote: number;     // desconto aplicado pelo lote
  descontoAtivado: number;  // desconto do "desconto ativado" do curso
  descontoCupom: number;    // desconto do cupom
  subtotal: number;         // valor do produto após todos os descontos
  taxaOperacionalPercentual: number; // % da taxa operacional (padrão 1)
  taxaOperacional: number;  // valor da taxa operacional
  total: number;            // subtotal + taxa operacional (valor cobrado)
}

export interface IOrder extends Document {
  numeroPedido: string;
  curso: mongoose.Types.ObjectId;
  cursoTitulo: string; // snapshot para histórico
  comprador?: mongoose.Types.ObjectId; // usuário logado (se houver)
  compradorDados: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string; // apenas dígitos
  };
  valores: IOrderValores;
  cupomAplicado?: {
    couponId: mongoose.Types.ObjectId;
    codigo: string;
  };
  loteAplicado?: mongoose.Types.ObjectId;
  status: OrderStatus;
  mercadoPago: {
    preferenceId?: string;
    paymentId?: string;
    status?: string;
    statusDetail?: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    lastFourDigits?: string;
    installments?: number;
    dateApproved?: Date;
  };
  metodoPagamento?: string; // pix / credit_card / boleto / etc
  // Entrega / fulfillment
  serialKeyGerada?: mongoose.Types.ObjectId;
  serialKeyCodigo?: string;
  entregue: boolean;
  entregueEm?: Date;
  emailEnviado: boolean;
  cupomContabilizado: boolean; // idempotência do incremento de uso do cupom
  loteContabilizado: boolean;  // idempotência do incremento do lote
  // Compliance / auditoria
  aceiteTermos: {
    aceito: boolean;
    versao: string;
    dataAceite: Date;
    ip: string;
  };
  ipCompra: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    numeroPedido: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    cursoTitulo: {
      type: String,
      required: true
    },
    comprador: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    compradorDados: {
      nome: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true, index: true },
      telefone: { type: String, required: true, trim: true },
      cpf: { type: String, required: true, trim: true }
    },
    valores: {
      precoBase: { type: Number, required: true, min: 0 },
      descontoLote: { type: Number, default: 0, min: 0 },
      descontoAtivado: { type: Number, default: 0, min: 0 },
      descontoCupom: { type: Number, default: 0, min: 0 },
      subtotal: { type: Number, required: true, min: 0 },
      taxaOperacionalPercentual: { type: Number, default: 1, min: 0 },
      taxaOperacional: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 }
    },
    cupomAplicado: {
      couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
      codigo: { type: String }
    },
    loteAplicado: {
      type: Schema.Types.ObjectId,
      ref: 'PriceLot'
    },
    status: {
      type: String,
      enum: ['pendente', 'em_processo', 'aprovado', 'rejeitado', 'cancelado', 'reembolsado'],
      default: 'pendente',
      index: true
    },
    mercadoPago: {
      preferenceId: { type: String, index: true },
      paymentId: { type: String, index: true },
      status: { type: String },
      statusDetail: { type: String },
      paymentMethodId: { type: String },
      paymentTypeId: { type: String },
      lastFourDigits: { type: String },
      installments: { type: Number },
      dateApproved: { type: Date }
    },
    metodoPagamento: {
      type: String
    },
    serialKeyGerada: {
      type: Schema.Types.ObjectId,
      ref: 'SerialKey'
    },
    serialKeyCodigo: {
      type: String
    },
    entregue: {
      type: Boolean,
      default: false
    },
    entregueEm: {
      type: Date
    },
    emailEnviado: {
      type: Boolean,
      default: false
    },
    cupomContabilizado: {
      type: Boolean,
      default: false
    },
    loteContabilizado: {
      type: Boolean,
      default: false
    },
    aceiteTermos: {
      aceito: { type: Boolean, default: false },
      versao: { type: String, default: '' },
      dataAceite: { type: Date },
      ip: { type: String, default: '' }
    },
    ipCompra: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

OrderSchema.index({ createdAt: -1 });

export default mongoose.model<IOrder>('Order', OrderSchema);
