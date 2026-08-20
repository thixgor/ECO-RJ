import crypto from 'crypto';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { reconcilePayments } from '../services/reconciliationService';

/**
 * Endpoints de rotina agendada (cron externo — ex.: cron-job.org).
 *
 * A autenticação NÃO usa JWT (um cron não faz login): usa um segredo fixo
 * guardado apenas em variável de ambiente (`CRON_SECRET`), aceito em
 * `Authorization: Bearer`, no header `x-cron-secret` ou na query `?token=`.
 * Sem o segredo configurado o endpoint fica desligado — nunca aberto.
 */

/** Comparação em tempo constante (evita descobrir o segredo por timing). */
function secretMatches(informado: string, esperado: string): boolean {
  const a = Buffer.from(informado);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function extractSecret(req: Request): string {
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const header = req.headers['x-cron-secret'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const query = req.query.token || req.query.secret;
  if (typeof query === 'string' && query.trim()) return query.trim();
  return '';
}

// @desc    Reconcilia pedidos pendentes com o Mercado Pago (cron externo)
// @route   ALL /api/payments/cron/reconcile
// @access  Segredo (CRON_SECRET)
export const cronReconcilePayments = async (req: Request, res: Response) => {
  const esperado = process.env.CRON_SECRET || '';
  if (!esperado) {
    return res.status(503).json({
      message: 'Rotina de reconciliação desativada: configure a variável de ambiente CRON_SECRET no servidor.'
    });
  }

  const informado = extractSecret(req);
  if (!informado || !secretMatches(informado, esperado)) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  try {
    const resumo = await reconcilePayments({
      diasJanela: req.query.dias ? Number(req.query.dias) : undefined,
      limite: req.query.limite ? Number(req.query.limite) : undefined
    });
    // Resposta enxuta: o cron-job.org guarda o corpo no histórico de execuções.
    return res.json({
      ok: true,
      verificados: resumo.pedidosVerificados,
      atualizados: resumo.pedidosAtualizados,
      aprovados: resumo.pedidosAprovados,
      entregasReprocessadas: resumo.entregasReprocessadas,
      erros: resumo.erros,
      interrompidoPorTempo: resumo.interrompidoPorTempo,
      duracaoMs: resumo.duracaoMs,
      alteracoes: resumo.alteracoes
    });
  } catch (error) {
    console.error('Erro na reconciliação agendada:', error);
    return res.status(500).json({ ok: false, message: 'Erro ao reconciliar pagamentos' });
  }
};

// @desc    Reconciliação manual pelo painel (botão "Sincronizar pendentes")
// @route   POST /api/payments/admin/reconcile
// @access  Private/Admin
export const adminReconcilePayments = async (req: AuthRequest, res: Response) => {
  try {
    const resumo = await reconcilePayments({
      diasJanela: req.body?.dias ? Number(req.body.dias) : undefined,
      limite: req.body?.limite ? Number(req.body.limite) : undefined
    });
    return res.json(resumo);
  } catch (error) {
    console.error('Erro na reconciliação manual:', error);
    return res.status(500).json({ message: 'Erro ao sincronizar pagamentos pendentes' });
  }
};
