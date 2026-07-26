import mongoose, { Document, Schema } from 'mongoose';

/**
 * Acesso (entitlement) de um comprador a um material.
 *
 * É a FONTE DA VERDADE do acesso ao produto — criado no momento da entrega,
 * de forma idempotente, INDEPENDENTE do envio de e-mail. Assim, mesmo que o
 * e-mail nunca chegue, o comprador consegue acessar o material:
 *   - Usuário logado: pelo vínculo `user` (aparece em "Meus Materiais").
 *   - Convidado: pelo `accessToken` (link direto) ou pela `serialKey` (código),
 *     e pode vincular à sua conta ao criar/entrar (por e-mail ou código).
 *
 * O acesso pode expirar (`validade`) e pode ser revogado pelo admin.
 */
export interface IMaterialEntitlement extends Document {
  material: mongoose.Types.ObjectId;
  materialTitulo: string;
  order?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;      // vinculado a uma conta (se logado/reclamado)
  email: string;                        // e-mail do comprador (lowercase)
  serialKey: string;                    // código amigável de acesso (uso pessoal)
  accessToken: string;                  // token seguro para acesso via link (convidado)
  origem: 'compra' | 'cortesia' | 'admin';
  validade?: Date;                      // expiração do acesso (undefined = vitalício)
  ativo: boolean;
  revogado: boolean;
  podeAvaliar: boolean;                 // habilita avaliação (compra confirmada)
  ultimoAcesso?: Date;
  totalDownloads: number;
  /** Último aceite dos termos de download / direitos autorais (evidência). */
  aceiteTermosDownload?: {
    versao: string;
    data: Date;
    ip?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MaterialEntitlementSchema = new Schema<IMaterialEntitlement>(
  {
    material: { type: Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
    materialTitulo: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'MaterialOrder', index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    serialKey: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true, unique: true, index: true },
    origem: { type: String, enum: ['compra', 'cortesia', 'admin'], default: 'compra' },
    validade: { type: Date },
    ativo: { type: Boolean, default: true },
    revogado: { type: Boolean, default: false },
    podeAvaliar: { type: Boolean, default: true },
    ultimoAcesso: { type: Date },
    totalDownloads: { type: Number, default: 0 },
    aceiteTermosDownload: {
      versao: { type: String },
      data: { type: Date },
      ip: { type: String }
    }
  },
  { timestamps: true }
);

MaterialEntitlementSchema.index({ material: 1, user: 1 });
MaterialEntitlementSchema.index({ material: 1, email: 1 });

/** Retorna true se o acesso está válido (ativo, não revogado, não expirado). */
export function isEntitlementValid(ent: {
  ativo?: boolean;
  revogado?: boolean;
  validade?: Date | string | null;
} | null | undefined): boolean {
  if (!ent) return false;
  if (ent.revogado) return false;
  if (ent.ativo === false) return false;
  if (ent.validade) {
    const v = new Date(ent.validade);
    if (!isNaN(v.getTime()) && Date.now() > v.getTime()) return false;
  }
  return true;
}

export default mongoose.model<IMaterialEntitlement>('MaterialEntitlement', MaterialEntitlementSchema);
