import mongoose, { Document, Schema } from 'mongoose';
import { IOrderValores } from './Order';

/**
 * Pedido de compra de um material (loja /materiais).
 *
 * Espelha a estrutura de `Order` (cursos), porém aponta para um `Material`
 * e integra-se com o próprio webhook do Mercado Pago de materiais.
 * A entrega (fulfillment) gera um `MaterialEntitlement` (acesso) — o vínculo
 * de acesso NUNCA depende do envio do e-mail, garantindo que o comprador
 * jamais perca o produto mesmo que o e-mail falhe.
 */

export type MaterialOrderStatus =
  | 'pendente'
  | 'em_processo'
  | 'aprovado'
  | 'rejeitado'
  | 'cancelado'
  | 'reembolsado';

export interface IMaterialOrder extends Document {
  numeroPedido: string;
  material: mongoose.Types.ObjectId;
  materialTitulo: string;
  materialTipo: string;
  comprador?: mongoose.Types.ObjectId; // usuário logado (se houver)
  compradorDados: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
  };
  valores: IOrderValores;
  cupomAplicado?: {
    couponId: mongoose.Types.ObjectId;
    codigo: string;
  };
  status: MaterialOrderStatus;
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
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    ticketUrl?: string;
    barcode?: string;
  };
  metodoPagamento?: string;
  // Entrega / fulfillment
  entitlement?: mongoose.Types.ObjectId;
  serialKeyCodigo?: string;   // chave amigável de acesso (convidado)
  accessToken?: string;       // token seguro de acesso (link direto)
  entregue: boolean;
  entregueEm?: Date;
  emailEnviado: boolean;
  emailTentativas: number;    // contador de tentativas de envio (auditoria)
  ultimoEmailErro?: string;
  cupomContabilizado: boolean;
  vendaContabilizada: boolean; // idempotência do incremento de vendas do material
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

const MaterialOrderSchema = new Schema<IMaterialOrder>(
  {
    numeroPedido: { type: String, required: true, unique: true, index: true },
    material: { type: Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
    materialTitulo: { type: String, required: true },
    materialTipo: { type: String, default: '' },
    comprador: { type: Schema.Types.ObjectId, ref: 'User', index: true },
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
      dateApproved: { type: Date },
      pixQrCode: { type: String },
      pixQrCodeBase64: { type: String },
      ticketUrl: { type: String },
      barcode: { type: String }
    },
    metodoPagamento: { type: String },
    entitlement: { type: Schema.Types.ObjectId, ref: 'MaterialEntitlement' },
    serialKeyCodigo: { type: String },
    accessToken: { type: String, index: true },
    entregue: { type: Boolean, default: false },
    entregueEm: { type: Date },
    emailEnviado: { type: Boolean, default: false },
    emailTentativas: { type: Number, default: 0 },
    ultimoEmailErro: { type: String },
    cupomContabilizado: { type: Boolean, default: false },
    vendaContabilizada: { type: Boolean, default: false },
    aceiteTermos: {
      aceito: { type: Boolean, default: false },
      versao: { type: String, default: '' },
      dataAceite: { type: Date },
      ip: { type: String, default: '' }
    },
    ipCompra: { type: String, default: '' }
  },
  { timestamps: true }
);

MaterialOrderSchema.index({ createdAt: -1 });

export default mongoose.model<IMaterialOrder>('MaterialOrder', MaterialOrderSchema);
