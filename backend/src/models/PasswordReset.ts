import mongoose, { Document, Schema } from 'mongoose';

/**
 * Pedido de recuperação de senha por e-mail.
 *
 * Decisões de segurança (por que cada campo existe):
 *
 *  - `tokenHash`: o token que vai no link do e-mail NUNCA é guardado em claro.
 *    Guardamos apenas o SHA-256 dele. Assim, um vazamento do banco não permite
 *    redefinir a senha de ninguém (o atacante teria só o hash, e o link já
 *    expirou). A busca é feita pelo hash do token informado — não há comparação
 *    caractere a caractere, então também não há brecha de timing.
 *
 *  - `emailHash`: registramos a tentativa mesmo quando o e-mail NÃO tem conta,
 *    para poder limitar a taxa de pedidos por e-mail sem revelar (nem guardar)
 *    quais endereços existem. Como é hash, o documento não expõe o e-mail.
 *
 *  - `usadoEm` / `invalidadoEm`: o token é de USO ÚNICO. Ao ser usado (ou ao ser
 *    substituído por um pedido novo) ele é marcado e deixa de funcionar.
 *
 *  - `purgarEm`: TTL de limpeza. Fica bem depois da expiração do token porque a
 *    trilha de auditoria/rate limit ainda é útil quando o token já venceu.
 */
export interface IPasswordReset extends Document {
  user?: mongoose.Types.ObjectId; // ausente quando o e-mail não tem conta
  emailHash: string;
  tokenHash?: string;
  expiraEm: Date;
  usadoEm?: Date;
  invalidadoEm?: Date;
  ipSolicitacao: string;
  userAgentSolicitacao?: string;
  ipUso?: string;
  createdAt: Date;
  purgarEm: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    emailHash: { type: String, required: true, index: true },
    tokenHash: { type: String, index: true, sparse: true },
    expiraEm: { type: Date, required: true },
    usadoEm: { type: Date },
    invalidadoEm: { type: Date },
    ipSolicitacao: { type: String, default: '' },
    userAgentSolicitacao: { type: String },
    ipUso: { type: String },
    purgarEm: { type: Date, required: true }
  },
  { timestamps: true }
);

PasswordResetSchema.index({ purgarEm: 1 }, { expireAfterSeconds: 0 });
PasswordResetSchema.index({ emailHash: 1, createdAt: -1 });

export default mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
