import Order from '../models/Order';
import MaterialOrder from '../models/MaterialOrder';
import {
  isMercadoPagoConfigured,
  collectOrderPayments,
  pickRelevantPayment
} from './mercadoPagoService';
import { applyPaymentToOrder } from '../controllers/paymentController';
import { applyMaterialPayment } from '../controllers/materialController';
import { fulfillOrder } from './fulfillmentService';
import { fulfillMaterialOrder } from './materialFulfillmentService';

/**
 * RECONCILIAÇÃO DE PAGAMENTOS
 * ---------------------------
 * Rede de segurança para o problema "o cliente pagou, mas o pedido continua
 * PENDENTE no painel do admin".
 *
 * O status só muda quando o Mercado Pago avisa (webhook) ou quando o próprio
 * comprador está com a página de status aberta (`/sync`). Isso falha quando:
 *
 *  1. o webhook não chega — URL não cadastrada no painel do MP, indisponibilidade
 *     momentânea da função serverless, assinatura recusada, deploy no meio do envio;
 *  2. o comprador fecha a página antes de o Pix/boleto compensar (o `/sync` nunca roda);
 *  3. a resposta do `createPayment` se perde e o pedido fica SEM `paymentId`
 *     gravado — aí nem o `/sync` recupera, porque não há o que consultar;
 *  4. o pagamento foi aprovado mas a ENTREGA falhou (erro ao gerar a chave/enviar
 *     e-mail), deixando o pedido aprovado e não entregue.
 *
 * Esta rotina varre os pedidos em aberto, consulta o Mercado Pago (fonte da
 * verdade) por `payment_id` E por `external_reference` — cobrindo o caso 3 — e
 * aplica o resultado, liberando o acesso do aluno automaticamente.
 *
 * É idempotente: pode rodar de minuto em minuto sem risco de entrega duplicada
 * (o `fulfill*` faz claim atômico) e sem cobrar ninguém de novo (só consulta).
 */

/** Status de pedido que ainda podem mudar com uma consulta ao Mercado Pago. */
const STATUS_EM_ABERTO = ['pendente', 'em_processo'];

export interface ReconcileOptions {
  /** Janela de varredura em dias (padrão 30 — boleto compensa em até 3 dias úteis). */
  diasJanela?: number;
  /** Teto de pedidos processados por execução (protege o limite de tempo do serverless). */
  limite?: number;
  /**
   * Orçamento de tempo em ms. Cada pedido custa 1–2 chamadas ao Mercado Pago e a
   * função serverless tem tempo máximo de execução — ao estourar o orçamento a
   * varredura para no pedido atual e o restante fica para a próxima execução do
   * cron (nada se perde: o pedido continua "em aberto" e será varrido de novo).
   */
  orcamentoMs?: number;
}

export interface ReconcileChange {
  origem: 'curso' | 'material';
  numeroPedido: string;
  de: string;
  para: string;
  paymentId?: string;
  entregue?: boolean;
}

export interface ReconcileSummary {
  executadoEm: string;
  /** `true` quando a varredura parou pelo orçamento de tempo (segue na próxima execução). */
  interrompidoPorTempo: boolean;
  mercadoPagoConfigurado: boolean;
  janelaDias: number;
  pedidosVerificados: number;
  pedidosAtualizados: number;
  pedidosAprovados: number;
  entregasReprocessadas: number;
  erros: number;
  alteracoes: ReconcileChange[];
  detalhesErros: string[];
  duracaoMs: number;
}

/** Contexto de execução compartilhado pelas varreduras. */
interface RunContext {
  desde: Date;
  limite: number;
  prazoFinal: number; // timestamp em que a varredura deve parar
}

/** `true` quando o orçamento de tempo da execução acabou. */
function semTempo(ctx: RunContext, resumo: ReconcileSummary): boolean {
  if (Date.now() < ctx.prazoFinal) return false;
  resumo.interrompidoPorTempo = true;
  return true;
}

/** Varre pedidos de CURSO em aberto e sincroniza com o Mercado Pago. */
async function reconciliarCursos(ctx: RunContext, resumo: ReconcileSummary): Promise<void> {
  const { desde, limite } = ctx;
  const pedidos = await Order.find({
    status: { $in: STATUS_EM_ABERTO },
    createdAt: { $gte: desde }
  })
    .sort({ createdAt: -1 })
    .limit(limite);

  for (const order of pedidos) {
    if (semTempo(ctx, resumo)) return;
    resumo.pedidosVerificados++;
    const statusAnterior = order.status;
    try {
      const pagamentos = await collectOrderPayments(
        (order._id as any).toString(),
        order.mercadoPago?.paymentId
      );
      const pagamento = pickRelevantPayment(pagamentos);
      if (!pagamento) continue;

      const novoStatus = await applyPaymentToOrder(order, pagamento);
      if (novoStatus !== statusAnterior) {
        const atualizado = await Order.findById(order._id);
        resumo.pedidosAtualizados++;
        if (novoStatus === 'aprovado') resumo.pedidosAprovados++;
        resumo.alteracoes.push({
          origem: 'curso',
          numeroPedido: order.numeroPedido,
          de: statusAnterior,
          para: novoStatus,
          paymentId: pagamento.id,
          entregue: !!atualizado?.entregue
        });
      }
    } catch (err: any) {
      resumo.erros++;
      resumo.detalhesErros.push(`curso ${order.numeroPedido}: ${err?.message || err}`);
      console.error(`Reconciliação: erro no pedido ${order.numeroPedido}:`, err);
    }
  }
}

/** Varre pedidos de MATERIAL em aberto e sincroniza com o Mercado Pago. */
async function reconciliarMateriais(ctx: RunContext, resumo: ReconcileSummary): Promise<void> {
  const { desde, limite } = ctx;
  const pedidos = await MaterialOrder.find({
    status: { $in: STATUS_EM_ABERTO },
    createdAt: { $gte: desde }
  })
    .sort({ createdAt: -1 })
    .limit(limite);

  for (const order of pedidos) {
    if (semTempo(ctx, resumo)) return;
    resumo.pedidosVerificados++;
    const statusAnterior = order.status;
    try {
      const pagamentos = await collectOrderPayments(
        (order._id as any).toString(),
        order.mercadoPago?.paymentId
      );
      const pagamento = pickRelevantPayment(pagamentos);
      if (!pagamento) continue;

      const novoStatus = await applyMaterialPayment(order, pagamento);
      if (novoStatus !== statusAnterior) {
        const atualizado = await MaterialOrder.findById(order._id);
        resumo.pedidosAtualizados++;
        if (novoStatus === 'aprovado') resumo.pedidosAprovados++;
        resumo.alteracoes.push({
          origem: 'material',
          numeroPedido: order.numeroPedido,
          de: statusAnterior,
          para: novoStatus,
          paymentId: pagamento.id,
          entregue: !!atualizado?.entregue
        });
      }
    } catch (err: any) {
      resumo.erros++;
      resumo.detalhesErros.push(`material ${order.numeroPedido}: ${err?.message || err}`);
      console.error(`Reconciliação: erro no pedido de material ${order.numeroPedido}:`, err);
    }
  }
}

/**
 * Reprocessa a ENTREGA de pedidos já aprovados que ficaram sem entregar
 * (falha ao gerar a serial key, ao liberar o acesso ou ao enviar o e-mail).
 * O `fulfill*` é idempotente, então reexecutar é seguro.
 */
async function reprocessarEntregasPendentes(ctx: RunContext, resumo: ReconcileSummary): Promise<void> {
  const { desde, limite } = ctx;
  const cursos = await Order.find({ status: 'aprovado', entregue: false, createdAt: { $gte: desde } })
    .sort({ createdAt: -1 })
    .limit(limite)
    .select('_id numeroPedido');

  for (const order of cursos) {
    if (semTempo(ctx, resumo)) return;
    try {
      await fulfillOrder((order._id as any).toString());
      resumo.entregasReprocessadas++;
      resumo.alteracoes.push({
        origem: 'curso',
        numeroPedido: order.numeroPedido,
        de: 'aprovado (não entregue)',
        para: 'aprovado (entrega reprocessada)',
        entregue: true
      });
    } catch (err: any) {
      resumo.erros++;
      resumo.detalhesErros.push(`entrega curso ${order.numeroPedido}: ${err?.message || err}`);
    }
  }

  const materiais = await MaterialOrder.find({ status: 'aprovado', entregue: false, createdAt: { $gte: desde } })
    .sort({ createdAt: -1 })
    .limit(limite)
    .select('_id numeroPedido');

  for (const order of materiais) {
    if (semTempo(ctx, resumo)) return;
    try {
      await fulfillMaterialOrder((order._id as any).toString());
      resumo.entregasReprocessadas++;
      resumo.alteracoes.push({
        origem: 'material',
        numeroPedido: order.numeroPedido,
        de: 'aprovado (não entregue)',
        para: 'aprovado (entrega reprocessada)',
        entregue: true
      });
    } catch (err: any) {
      resumo.erros++;
      resumo.detalhesErros.push(`entrega material ${order.numeroPedido}: ${err?.message || err}`);
    }
  }
}

/**
 * Executa a reconciliação completa (cursos + materiais + entregas pendentes).
 * Chamado pelo cron externo (`/api/payments/cron/reconcile`) e pelo botão
 * "Sincronizar pendentes" do painel administrativo.
 */
export async function reconcilePayments(options: ReconcileOptions = {}): Promise<ReconcileSummary> {
  const inicio = Date.now();
  const diasJanela = Math.min(Math.max(Number(options.diasJanela) || 30, 1), 180);
  const limite = Math.min(Math.max(Number(options.limite) || 40, 1), 200);
  const orcamentoMs = Math.min(
    Math.max(Number(options.orcamentoMs) || Number(process.env.RECONCILE_BUDGET_MS) || 20000, 1000),
    120000
  );
  const desde = new Date(Date.now() - diasJanela * 24 * 60 * 60 * 1000);
  const ctx: RunContext = { desde, limite, prazoFinal: inicio + orcamentoMs };

  const resumo: ReconcileSummary = {
    executadoEm: new Date().toISOString(),
    interrompidoPorTempo: false,
    mercadoPagoConfigurado: isMercadoPagoConfigured(),
    janelaDias: diasJanela,
    pedidosVerificados: 0,
    pedidosAtualizados: 0,
    pedidosAprovados: 0,
    entregasReprocessadas: 0,
    erros: 0,
    alteracoes: [],
    detalhesErros: [],
    duracaoMs: 0
  };

  // As entregas presas vêm primeiro: são poucas, resolvem o caso mais grave
  // (cliente pagou e não recebeu), não dependem do Mercado Pago e por isso
  // funcionam até para as compras de cortesia (cupom de 100%).
  await reprocessarEntregasPendentes(ctx, resumo);
  // Sem credencial do Mercado Pago não há o que consultar.
  if (resumo.mercadoPagoConfigurado) {
    await reconciliarCursos(ctx, resumo);
    await reconciliarMateriais(ctx, resumo);
  }

  resumo.duracaoMs = Date.now() - inicio;
  return resumo;
}
