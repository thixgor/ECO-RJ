import mongoose, { Document, Schema } from 'mongoose';

/**
 * Contador de rate limiting persistido no banco.
 *
 * Por que no banco e não em memória? A API roda em ambiente serverless
 * (Vercel): cada requisição pode cair em uma instância diferente e a memória
 * do processo é descartada a qualquer momento. Um limitador em memória seria
 * facilmente contornado — basta insistir até cair numa instância nova.
 *
 * Cada documento é uma "janela" de tempo: `chave` identifica o que está sendo
 * limitado (ex.: `pwd-reset:ip:1.2.3.4`) e `expiraEm` marca o fim da janela.
 * O índice TTL apaga o documento sozinho depois que a janela passa.
 */
export interface IRateLimit extends Document {
  chave: string;
  hits: number;
  expiraEm: Date;
  createdAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    chave: { type: String, required: true, unique: true, index: true },
    hits: { type: Number, default: 0 },
    expiraEm: { type: Date, required: true }
  },
  { timestamps: true }
);

// Limpeza automática: o MongoDB remove o documento quando `expiraEm` passa.
RateLimitSchema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
