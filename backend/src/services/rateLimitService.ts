import { Request } from 'express';
import RateLimit from '../models/RateLimit';

/**
 * Rate limiting simples e persistente (janela fixa), pensado para serverless.
 *
 * Uso típico:
 *   const r = await consumirLimite(`login:ip:${ip}`, 10, 15 * 60);
 *   if (!r.permitido) return res.status(429).json({ message: ..., retryAfter: r.retryAfter });
 *
 * A janela é fixa (não deslizante): mais simples, previsível e suficiente para
 * conter força bruta e abuso de envio de e-mail. Em caso de falha do banco a
 * função "abre" (permite) — um erro de infraestrutura não pode derrubar o login.
 */
export interface ResultadoLimite {
  permitido: boolean;
  restante: number;
  retryAfter: number; // segundos até a janela reabrir
}

export async function consumirLimite(
  chave: string,
  limite: number,
  janelaSegundos: number
): Promise<ResultadoLimite> {
  const agora = new Date();
  const novoFim = new Date(agora.getTime() + janelaSegundos * 1000);

  try {
    const doc = await RateLimit.findOneAndUpdate(
      { chave },
      { $inc: { hits: 1 }, $setOnInsert: { expiraEm: novoFim } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // A janela anterior já venceu, mas o TTL do Mongo (que roda a cada ~60s)
    // ainda não apagou o documento: reinicia a contagem manualmente.
    if (doc.expiraEm <= agora) {
      await RateLimit.updateOne({ _id: doc._id }, { $set: { hits: 1, expiraEm: novoFim } });
      return { permitido: true, restante: Math.max(0, limite - 1), retryAfter: janelaSegundos };
    }

    const retryAfter = Math.max(1, Math.ceil((doc.expiraEm.getTime() - agora.getTime()) / 1000));
    return {
      permitido: doc.hits <= limite,
      restante: Math.max(0, limite - doc.hits),
      retryAfter
    };
  } catch (err) {
    console.error('Falha no rate limit (liberando a requisição):', err);
    return { permitido: true, restante: limite, retryAfter: 0 };
  }
}

/** Zera um contador — usado após uma ação bem-sucedida (ex.: login correto). */
export async function limparLimite(chave: string): Promise<void> {
  try {
    await RateLimit.deleteOne({ chave });
  } catch {
    /* limpeza é best-effort */
  }
}

/** IP do cliente considerando o proxy da Vercel (x-forwarded-for). */
export function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length) return fwd[0];
  return req.socket?.remoteAddress || 'desconhecido';
}
