import { Request, Response } from 'express';
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago';
import Course from '../models/Course';
import Order, { OrderStatus } from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { validateCPF } from '../utils/validators';
import { getPaymentConfig } from '../config/paymentConfig';
import {
  getActiveLot,
  validateCoupon,
  computePricing,
  round2
} from '../services/pricingService';
import {
  isMercadoPagoConfigured,
  getPublicKey,
  getWebhookSecret,
  createPayment,
  cancelPayment,
  getPayment,
  collectOrderPayments,
  pickRelevantPayment,
  ThreeDsChallenge
} from '../services/mercadoPagoService';
import {
  resolveSelectedMethod,
  checkMethodEnabled,
  isCardMethod,
  sanitizePayerAddress,
  resolveInstallments
} from '../services/paymentMethodService';
import { isEmailConfigured } from '../services/emailService';
import { fulfillOrder } from '../services/fulfillmentService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Separa "Nome Sobrenome" em first/last name para o Mercado Pago. */
function splitName(nome: string): { firstName: string; lastName: string } {
  const parts = nome.trim().split(/\s+/);
  const firstName = parts.shift() || nome;
  const lastName = parts.join(' ') || '.';
  return { firstName, lastName };
}

/**
 * Extrai motivo + detalhe de um erro do SDK do Mercado Pago.
 * O SDK lança diretamente o corpo JSON de erro da API do MP
 * (`{ message, status, error, cause: [{ code, description }] }`).
 */
function extractMpError(error: any): { motivo?: string; detalhe?: string } {
  if (!error || typeof error !== 'object') {
    return { motivo: typeof error === 'string' ? error : undefined };
  }
  const causeArr = Array.isArray(error.cause) ? error.cause : (error.cause ? [error.cause] : []);
  const causeDesc = causeArr
    .map((c: any) => (typeof c === 'string' ? c : (c?.description || c?.message || c?.code)))
    .filter(Boolean)
    .join('; ');
  // A mensagem de topo do MP costuma ser a mais específica; o cause é um rótulo genérico.
  const raw = error.message || causeDesc || error.error || undefined;
  const motivo = typeof raw === 'string' ? raw.replace(/\s*null\s*$/i, '').trim() : raw;
  let detalhe: string | undefined;
  try { detalhe = JSON.stringify(error).slice(0, 900); } catch { /* noop */ }
  return { motivo, detalhe };
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length) return fwd[0];
  return req.socket?.remoteAddress || '';
}

function getBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://ecorj.com';
}

async function generateNumeroPedido(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let rand = '';
    for (let i = 0; i < 8; i++) rand += KEY_CHARS.charAt(Math.floor(Math.random() * KEY_CHARS.length));
    const numero = `ECO-PED-${datePart}-${rand}`;
    const existing = await Order.findOne({ numeroPedido: numero });
    if (!existing) return numero;
  }
}

function mapMpStatus(mpStatus: string): OrderStatus {
  switch (mpStatus) {
    case 'approved': return 'aprovado';
    case 'pending': return 'pendente';
    case 'in_process':
    case 'in_mediation':
    case 'authorized': return 'em_processo';
    case 'rejected': return 'rejeitado';
    case 'cancelled':
    case 'expired': return 'cancelado';
    case 'refunded':
    case 'charged_back': return 'reembolsado';
    default: return 'pendente';
  }
}

// @desc    Configuração pública de pagamento (front-end)
// @route   GET /api/payments/config
// @access  Public
export const getPublicConfig = async (_req: Request, res: Response) => {
  try {
    const config = await getPaymentConfig();
    res.json({
      vendasAtivas: config.vendasAtivas && isMercadoPagoConfigured(),
      // Adesão a itens gratuitos não depende do gateway de pagamento.
      adesaoGratuitaAtiva: config.vendasAtivas,
      mercadoPagoConfigurado: isMercadoPagoConfigured(),
      // Sem SMTP não há como entregar a serial key / o comprovante a quem compra
      // deslogado — o front-end usa isso para exigir login antes da compra.
      emailConfigurado: isEmailConfigured(),
      compraSemLoginPermitida: isEmailConfigured(),
      publicKey: getPublicKey(),
      taxaOperacionalPercentual: config.taxaOperacionalPercentual,
      metodos: config.metodos,
      parcelasMaximas: config.parcelasMaximas,
      termosVersao: config.termosVersao,
      termosCompra: config.termosCompra
    });
  } catch (error) {
    console.error('Erro ao obter config de pagamento:', error);
    res.status(500).json({ message: 'Erro ao obter configuração de pagamento' });
  }
};

// @desc    Cotação de preço (com cupom opcional)
// @route   POST /api/payments/quote
// @access  Public
export const getQuote = async (req: Request, res: Response) => {
  try {
    const { cursoId, cupom, email } = req.body;
    if (!cursoId) return res.status(400).json({ message: 'Curso é obrigatório' });

    const course = await Course.findById(cursoId);
    if (!course) return res.status(404).json({ message: 'Curso não encontrado' });
    // Preço 0 é válido: significa curso GRATUITO (o aluno adere sem pagar).
    if (!course.ativo || !course.venda?.disponivel) {
      return res.status(400).json({ message: 'Curso não está disponível para compra' });
    }

    const config = await getPaymentConfig();
    const lot = await getActiveLot(cursoId);

    // Calcula subtotal parcial (antes do cupom) para validar o cupom
    const parcial = computePricing(course, lot, null, config.taxaOperacionalPercentual);

    let couponResult = null;
    let couponError: string | undefined;
    if (cupom) {
      const vr = await validateCoupon(cupom, cursoId, email || '', parcial.subtotal);
      if (vr.valido && vr.coupon) {
        couponResult = vr.coupon;
      } else {
        couponError = vr.motivo;
      }
    }

    const breakdown = computePricing(course, lot, couponResult, config.taxaOperacionalPercentual);

    res.json({
      cursoId,
      cursoTitulo: course.titulo,
      valores: breakdown,
      cupomValido: !!couponResult,
      cupomErro: couponError,
      lote: lot ? { nome: lot.nome, preco: lot.preco } : null
    });
  } catch (error) {
    console.error('Erro ao cotar preço:', error);
    res.status(500).json({ message: 'Erro ao calcular preço' });
  }
};

// @desc    Criar checkout (pedido + preferência Mercado Pago)
// @route   POST /api/payments/checkout
// @access  Public (optionalAuth)
export const createCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const { cursoId, cupom, comprador, aceiteTermos } = req.body;

    const config = await getPaymentConfig();
    if (!config.vendasAtivas) {
      return res.status(503).json({ message: 'As vendas estão temporariamente desativadas' });
    }
    // A verificação do Mercado Pago acontece só depois de calcular o total: pedidos
    // gratuitos (curso com preço 0 ou cupom de 100%) não passam pelo gateway.

    // Compra sem login depende inteiramente do e-mail: é por ele que o convidado
    // recebe a serial key, o link de ativação e o comprovante. Com o SMTP
    // desativado a entrega ficaria órfã — então exigimos login.
    if (!req.user && !isEmailConfigured()) {
      return res.status(401).json({
        message: 'No momento não é possível comprar sem estar logado, pois o envio de e-mails está desativado e não conseguiríamos enviar sua chave de ativação e o comprovante. Faça login (ou crie sua conta) para concluir a compra — o acesso é liberado automaticamente na sua conta.',
        loginObrigatorio: true,
        motivo: 'email_desabilitado'
      });
    }

    if (!cursoId) return res.status(400).json({ message: 'Curso é obrigatório' });
    if (!comprador || typeof comprador !== 'object') {
      return res.status(400).json({ message: 'Dados do comprador são obrigatórios' });
    }

    const nome = String(comprador.nome || '').trim();
    const email = String(comprador.email || '').trim().toLowerCase();
    const telefone = String(comprador.telefone || '').trim();
    const cpfDigitos = String(comprador.cpf || '').replace(/\D/g, '');

    // Validações rígidas do comprador
    if (nome.length < 3) return res.status(400).json({ message: 'Informe o nome completo' });
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'E-mail inválido' });
    if (telefone.replace(/\D/g, '').length < 10) return res.status(400).json({ message: 'Telefone inválido' });
    if (!validateCPF(cpfDigitos)) return res.status(400).json({ message: 'CPF inválido' });

    // Aceite de termos obrigatório e com versão vigente
    if (!aceiteTermos || aceiteTermos.aceito !== true) {
      return res.status(400).json({ message: 'É necessário aceitar os Termos e Condições de Compra' });
    }

    // Curso
    const course = await Course.findById(cursoId);
    if (!course) return res.status(404).json({ message: 'Curso não encontrado' });
    // Preço 0 é válido: significa curso GRATUITO (o aluno adere sem pagar).
    if (!course.ativo || !course.venda?.disponivel) {
      return res.status(400).json({ message: 'Curso não está disponível para compra' });
    }

    // Anti-abuso simples: limita pedidos pendentes recentes por e-mail
    const dezMinAtras = new Date(Date.now() - 10 * 60 * 1000);
    const pendentesRecentes = await Order.countDocuments({
      'compradorDados.email': email,
      status: { $in: ['pendente', 'em_processo'] },
      createdAt: { $gte: dezMinAtras }
    });
    if (pendentesRecentes >= 8) {
      return res.status(429).json({ message: 'Muitas tentativas de compra. Aguarde alguns minutos e tente novamente.' });
    }

    // Preço — SEMPRE recalculado no servidor
    const lot = await getActiveLot(cursoId);
    const parcial = computePricing(course, lot, null, config.taxaOperacionalPercentual);

    let couponDoc = null;
    if (cupom) {
      const vr = await validateCoupon(cupom, cursoId, email, parcial.subtotal);
      if (!vr.valido) {
        return res.status(400).json({ message: vr.motivo || 'Cupom inválido' });
      }
      couponDoc = vr.coupon || null;
    }

    const breakdown = computePricing(course, lot, couponDoc, config.taxaOperacionalPercentual);
    const ip = getClientIp(req);
    const numeroPedido = await generateNumeroPedido();

    const orderData: any = {
      numeroPedido,
      curso: course._id,
      cursoTitulo: course.titulo,
      comprador: req.user?._id || undefined,
      compradorDados: { nome, email, telefone, cpf: cpfDigitos },
      valores: {
        precoBase: breakdown.precoBase,
        descontoLote: breakdown.descontoLote,
        descontoAtivado: breakdown.descontoAtivado,
        descontoCupom: breakdown.descontoCupom,
        subtotal: breakdown.subtotal,
        taxaOperacionalPercentual: breakdown.taxaOperacionalPercentual,
        taxaOperacional: breakdown.taxaOperacional,
        total: breakdown.total
      },
      cupomAplicado: couponDoc ? { couponId: couponDoc._id, codigo: couponDoc.codigo } : undefined,
      loteAplicado: lot ? lot._id : undefined,
      status: 'pendente',
      aceiteTermos: {
        aceito: true,
        versao: config.termosVersao,
        dataAceite: new Date(),
        ip
      },
      ipCompra: ip
    };

    // Adesão gratuita (curso com preço 0 ou cupom de 100%) — não passa pelo Mercado Pago
    if (breakdown.total <= 0) {
      orderData.status = 'aprovado';
      orderData.metodoPagamento = 'cortesia';
      const order = await Order.create(orderData);
      await fulfillOrder((order._id as any).toString());
      return res.status(201).json({
        numeroPedido: order.numeroPedido,
        gratuito: true,
        redirectUrl: `${getBaseUrl()}/compra/status?pedido=${order.numeroPedido}`
      });
    }

    // A partir daqui há valor a cobrar: o gateway é obrigatório.
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({ message: 'Pagamentos indisponíveis no momento. Tente novamente mais tarde.' });
    }

    const order = await Order.create(orderData);
    const { firstName, lastName } = splitName(nome);

    // Checkout Transparente: o pedido fica pendente e o pagamento é criado na
    // etapa /process a partir dos dados tokenizados pelo Payment Brick. Aqui só
    // devolvemos o necessário para renderizar o Brick (o valor é a fonte da
    // verdade do servidor — o cliente nunca envia o preço).
    return res.status(201).json({
      numeroPedido: order.numeroPedido,
      transparente: true,
      publicKey: getPublicKey(),
      amount: breakdown.total,
      payer: { nome, email, firstName, lastName, cpf: cpfDigitos },
      metodos: config.metodos,
      parcelasMaximas: config.parcelasMaximas
    });
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    res.status(500).json({ message: 'Erro ao processar checkout' });
  }
};

/**
 * Um pagamento recebido é "obsoleto" quando o pedido já está aprovado e a
 * notificação se refere a OUTRA tentativa de pagamento que não prosperou.
 *
 * Cenário real: o comprador gerou um boleto/Pix, desistiu e pagou no cartão.
 * Dias depois o Mercado Pago notifica o cancelamento/expiração da cobrança
 * antiga — aplicá-la reverteria um pedido pago para "cancelado" no painel.
 * Estorno (`refunded`/`charged_back`) e o próprio pagamento do pedido continuam
 * sendo aplicados normalmente.
 */
function isPagamentoObsoleto(order: any, payment: { id: string; status: string }): boolean {
  if (order.status !== 'aprovado') return false;
  if (order.mercadoPago?.paymentId && String(order.mercadoPago.paymentId) === String(payment.id)) return false;
  return !['approved', 'refunded', 'charged_back', 'in_mediation'].includes(payment.status);
}

/** Persiste os dados de um pagamento MP no pedido e libera acesso se aprovado. */
export async function applyPaymentToOrder(order: any, payment: {
  id: string; status: string; statusDetail: string; transactionAmount: number;
  paymentMethodId?: string; paymentTypeId?: string; lastFourDigits?: string;
  installments?: number; dateApproved?: string;
  pixQrCode?: string; pixQrCodeBase64?: string; ticketUrl?: string; barcode?: string;
}): Promise<OrderStatus> {
  if (isPagamentoObsoleto(order, payment)) {
    console.warn(
      `Pedido ${order.numeroPedido} já aprovado — ignorando pagamento ${payment.id} (${payment.status}) de tentativa anterior.`
    );
    return order.status;
  }

  order.mercadoPago.paymentId = payment.id;
  order.mercadoPago.status = payment.status;
  order.mercadoPago.statusDetail = payment.statusDetail;
  order.mercadoPago.paymentMethodId = payment.paymentMethodId;
  order.mercadoPago.paymentTypeId = payment.paymentTypeId;
  order.mercadoPago.lastFourDigits = payment.lastFourDigits;
  order.mercadoPago.installments = payment.installments;
  if (payment.dateApproved) order.mercadoPago.dateApproved = new Date(payment.dateApproved);
  if (payment.pixQrCode !== undefined) order.mercadoPago.pixQrCode = payment.pixQrCode;
  if (payment.pixQrCodeBase64 !== undefined) order.mercadoPago.pixQrCodeBase64 = payment.pixQrCodeBase64;
  if (payment.ticketUrl !== undefined) order.mercadoPago.ticketUrl = payment.ticketUrl;
  if (payment.barcode !== undefined) order.mercadoPago.barcode = payment.barcode;
  order.metodoPagamento = payment.paymentTypeId || payment.paymentMethodId;

  const novoStatus = mapMpStatus(payment.status);
  const valorConfere = Math.abs(payment.transactionAmount - order.valores.total) <= 0.02;

  if (novoStatus === 'aprovado' && !valorConfere) {
    console.error(
      `ALERTA SEGURANÇA: valor divergente no pedido ${order.numeroPedido}. Pago=${payment.transactionAmount} Esperado=${order.valores.total}`
    );
    order.status = 'em_processo';
    await order.save();
    return 'em_processo';
  }

  order.status = novoStatus;
  await order.save();
  if (novoStatus === 'aprovado' && valorConfere) {
    await fulfillOrder((order._id as any).toString());
  }
  return novoStatus;
}

function serializePaymentResponse(order: any, threeDs?: ThreeDsChallenge) {
  const mp = order.mercadoPago || {};
  const isPix = mp.paymentTypeId === 'bank_transfer' || mp.paymentMethodId === 'pix';
  const isBoleto = mp.paymentTypeId === 'ticket' || !!mp.barcode;
  return {
    numeroPedido: order.numeroPedido,
    status: order.status,
    statusDetail: mp.statusDetail,
    metodoPagamento: order.metodoPagamento,
    pix: isPix && mp.pixQrCode ? {
      qrCode: mp.pixQrCode,
      qrCodeBase64: mp.pixQrCodeBase64,
      ticketUrl: mp.ticketUrl
    } : undefined,
    boleto: isBoleto ? { url: mp.ticketUrl, barcode: mp.barcode } : undefined,
    // Desafio 3-D Secure (cartão de débito/crédito): o front-end precisa exibir
    // o challenge do emissor antes de o pagamento ser concluído.
    threeDs
  };
}

/**
 * Um pagamento já existente no pedido pode ser reaproveitado (em vez de criar
 * uma nova cobrança) quando ainda vale para o método que o comprador escolheu.
 *
 * Não é reaproveitável quando:
 *  - foi recusado/cancelado (o comprador está tentando de novo);
 *  - é de OUTRO método (ex.: boleto emitido e agora quer pagar no cartão);
 *  - está travado num desafio 3DS antigo (o `creq` é de uso único).
 */
function podeReaproveitarPagamento(
  existing: { status: string; statusDetail?: string; paymentTypeId?: string },
  metodoEscolhido: string
): boolean {
  const st = mapMpStatus(existing.status);
  if (st === 'rejeitado' || st === 'cancelado') return false;
  if (existing.statusDetail === 'pending_challenge') return false;
  // Aprovado / em análise: sempre reaproveita — nunca cobrar duas vezes.
  if (st !== 'pendente') return true;
  // Pendente (boleto/Pix aguardando): só reaproveita se for o mesmo método.
  return !!existing.paymentTypeId && existing.paymentTypeId === metodoEscolhido;
}

// @desc    Processar pagamento (Checkout Transparente — dados do Payment Brick)
// @route   POST /api/payments/order/:numeroPedido/process
// @access  Public (optionalAuth)
export const processPayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({ message: 'Pagamentos indisponíveis no momento. Tente novamente mais tarde.' });
    }

    const order = await Order.findOne({ numeroPedido: req.params.numeroPedido });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });

    // Já aprovado/entregue — idempotente, não cobra de novo
    if (order.status === 'aprovado' || order.entregue) {
      return res.json(serializePaymentResponse(order));
    }

    const payload = req.body?.payment || req.body || {};
    const paymentMethodId = String(payload.payment_method_id || '').trim();
    if (!paymentMethodId) {
      return res.status(400).json({ message: 'Método de pagamento inválido' });
    }

    const config = await getPaymentConfig();
    if (!config.vendasAtivas) {
      return res.status(503).json({ message: 'As vendas estão temporariamente desativadas' });
    }

    // Cada meio de pagamento é validado individualmente contra a config do admin
    // (crédito, débito, boleto e Pix têm interruptores próprios).
    const metodo = resolveSelectedMethod(payload);
    const metodoBloqueado = checkMethodEnabled(metodo, config);
    if (metodoBloqueado) {
      return res.status(400).json({ message: metodoBloqueado });
    }

    const token = payload.token ? String(payload.token) : undefined;

    // Boleto: o Mercado Pago exige o endereço completo do pagador.
    let payerAddress: Record<string, string> | undefined;
    if (metodo === 'ticket') {
      const address = sanitizePayerAddress(payload.payer?.address);
      if (!address) {
        return res.status(400).json({
          message: 'Para pagar com boleto informe o endereço completo (CEP, rua, número, bairro, cidade e estado).'
        });
      }
      payerAddress = address;
    }

    // Anti-duplicidade: se já existe um pagamento aproveitável, devolve o atual
    // (não cria nova cobrança em cliques repetidos / reenvio do Brick).
    if (order.mercadoPago.paymentId) {
      const existing = await getPayment(order.mercadoPago.paymentId);
      if (existing) {
        if (podeReaproveitarPagamento(existing, metodo)) {
          await applyPaymentToOrder(order, existing);
          return res.json(serializePaymentResponse(order));
        }
        // Trocou de meio de pagamento com uma cobrança ainda em aberto
        // (ex.: boleto emitido e agora quer cartão): cancela a anterior para
        // que o comprador não consiga pagar as duas.
        if (mapMpStatus(existing.status) === 'pendente') {
          await cancelPayment(existing.id);
        }
      }
    }

    const { firstName, lastName } = splitName(order.compradorDados.nome);
    const result = await createPayment({
      transactionAmount: order.valores.total, // SEMPRE do servidor
      description: `Curso ECO RJ - ${order.cursoTitulo}`,
      externalReference: (order._id as any).toString(),
      notificationUrl: `${getBaseUrl()}/api/payments/webhook`,
      statementDescriptor: 'ECORJ CURSOS',
      idempotencyKey: `pay-${(order._id as any).toString()}-${Date.now()}`,
      metadata: { order_id: (order._id as any).toString(), numero_pedido: order.numeroPedido },
      payer: { email: order.compradorDados.email, firstName, lastName, cpf: order.compradorDados.cpf },
      paymentMethodId,
      token,
      issuerId: payload.issuer_id ? String(payload.issuer_id) : undefined,
      // Débito e boleto/Pix são sempre à vista; crédito respeita o teto do admin.
      installments: resolveInstallments(metodo, payload.installments, config.parcelasMaximas),
      payerAddress,
      threeDSecureMode: isCardMethod(metodo) ? 'optional' : undefined
    });

    await applyPaymentToOrder(order, result);
    return res.status(201).json(serializePaymentResponse(order, result.threeDs));
  } catch (error: any) {
    const { motivo, detalhe } = extractMpError(error);
    console.error('Erro ao processar pagamento (MP):', detalhe || error);
    return res.status(502).json({
      message: 'Não foi possível processar o pagamento. Verifique os dados e tente novamente.',
      motivo,
      detalhe
    });
  }
};

// @desc    Webhook do Mercado Pago
// @route   POST /api/payments/webhook
// @access  Public (assinado)
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  try {
    const type = (req.query.type || req.query.topic || req.body?.type || req.body?.topic) as string;
    const dataId = (
      req.query['data.id'] ||
      (req.query.data as any)?.id ||
      req.body?.data?.id ||
      req.body?.resource
    ) as string;

    // Só tratamos notificações de pagamento
    if (type && type !== 'payment') {
      return res.status(200).json({ received: true, ignored: type });
    }
    if (!dataId) {
      return res.status(200).json({ received: true, ignored: 'no-data-id' });
    }

    // Validação de assinatura (se o segredo estiver configurado)
    const secret = getWebhookSecret();
    if (secret) {
      try {
        WebhookSignatureValidator.validate({
          xSignature: req.headers['x-signature'] as string,
          xRequestId: req.headers['x-request-id'] as string,
          dataId: String(dataId),
          secret,
          toleranceSeconds: 300
        });
      } catch (sigErr) {
        if (sigErr instanceof InvalidWebhookSignatureError) {
          console.warn('Webhook MP com assinatura inválida:', sigErr.reason, sigErr.requestId);
          return res.status(401).json({ message: 'Assinatura inválida' });
        }
        throw sigErr;
      }
    }

    // Fonte da verdade: buscar o pagamento na API do MP
    const payment = await getPayment(String(dataId));
    if (!payment) {
      return res.status(200).json({ received: true, ignored: 'payment-not-found' });
    }

    // Localiza o pedido pelo external_reference
    const orderId = payment.externalReference;
    const order = orderId ? await Order.findById(orderId) : await Order.findOne({ 'mercadoPago.paymentId': payment.id });
    if (!order) {
      console.warn('Webhook MP: pedido não encontrado para pagamento', payment.id);
      return res.status(200).json({ received: true, ignored: 'order-not-found' });
    }

    // Atualiza dados do pagamento, confere valor (segurança) e entrega se aprovado
    await applyPaymentToOrder(order, payment);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook do Mercado Pago:', error);
    // Retorna 200 para evitar reenvios infinitos em erros não recuperáveis
    return res.status(200).json({ received: true, error: true });
  }
};

// @desc    Status público de um pedido (pela página de retorno)
// @route   GET /api/payments/order/:numeroPedido
// @access  Public
export const getOrderStatus = async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({ numeroPedido: req.params.numeroPedido });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });

    const isGuest = !order.comprador;
    const aprovado = order.status === 'aprovado';
    const pendente = order.status === 'pendente' || order.status === 'em_processo';
    const mp = order.mercadoPago || {};
    const isPix = mp.paymentTypeId === 'bank_transfer' || mp.paymentMethodId === 'pix';
    const isBoleto = mp.paymentTypeId === 'ticket' || !!mp.barcode;

    res.json({
      numeroPedido: order.numeroPedido,
      cursoTitulo: order.cursoTitulo,
      status: order.status,
      statusDetail: mp.statusDetail,
      entregue: order.entregue,
      metodoPagamento: order.metodoPagamento,
      valores: order.valores,
      compradorNome: order.compradorDados.nome,
      createdAt: order.createdAt,
      isGuest,
      // Pix / boleto pendente — exibidos para o cliente concluir o pagamento
      pix: pendente && isPix && mp.pixQrCode ? {
        qrCode: mp.pixQrCode,
        qrCodeBase64: mp.pixQrCodeBase64,
        ticketUrl: mp.ticketUrl
      } : undefined,
      boleto: pendente && isBoleto ? { url: mp.ticketUrl, barcode: mp.barcode } : undefined,
      // Chave só é exposta a convidados (usuários logados já recebem acesso na conta)
      serialKeyCodigo: aprovado && isGuest ? order.serialKeyCodigo : undefined,
      activationLink: aprovado && isGuest && order.serialKeyCodigo
        ? `${getBaseUrl()}/ativar?codigo=${order.serialKeyCodigo}`
        : undefined
    });
  } catch (error) {
    console.error('Erro ao obter status do pedido:', error);
    res.status(500).json({ message: 'Erro ao obter status do pedido' });
  }
};

// @desc    Reconsulta manual do pagamento (fallback caso o webhook falhe)
// @route   POST /api/payments/order/:numeroPedido/sync
// @access  Public
export const syncOrderStatus = async (req: Request, res: Response) => {
  try {
    const order = await Order.findOne({ numeroPedido: req.params.numeroPedido });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });

    if (order.status === 'aprovado') {
      // Pago mas sem entrega (falha ao gerar a chave / liberar acesso): reprocessa.
      if (!order.entregue) await fulfillOrder((order._id as any).toString());
      const pago = await Order.findById(order._id);
      return res.json({ status: pago?.status, entregue: pago?.entregue });
    }

    if (isMercadoPagoConfigured()) {
      // Consulta por payment_id E por external_reference: o pedido pode ter
      // ficado sem `paymentId` gravado (resposta do MP perdida) e, mesmo assim,
      // ter um pagamento aprovado do lado do Mercado Pago.
      const pagamentos = await collectOrderPayments(
        (order._id as any).toString(),
        order.mercadoPago?.paymentId,
        { buscaCompleta: false }
      );
      const payment = pickRelevantPayment(pagamentos);
      if (payment) {
        await applyPaymentToOrder(order, payment);
      }
    }
    const updated = await Order.findById(order._id);
    res.json({ status: updated?.status, entregue: updated?.entregue });
  } catch (error) {
    console.error('Erro ao sincronizar pedido:', error);
    res.status(500).json({ message: 'Erro ao sincronizar pedido' });
  }
};

// @desc    Pedidos do usuário logado (para o /perfil)
// @route   GET /api/payments/my-orders
// @access  Private
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({
      $or: [
        { comprador: req.user?._id },
        { 'compradorDados.email': req.user?.email }
      ]
    })
      .populate('curso', 'titulo imagemCapa')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Erro ao obter compras do usuário:', error);
    res.status(500).json({ message: 'Erro ao obter compras' });
  }
};
