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
  createPreference,
  getPayment
} from '../services/mercadoPagoService';
import { fulfillOrder } from '../services/fulfillmentService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length) return fwd[0];
  return req.socket?.remoteAddress || '';
}

function getBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://www.cursodeecocardiografia.com';
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
      mercadoPagoConfigurado: isMercadoPagoConfigured(),
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
    if (!course.ativo || !course.venda?.disponivel || !(course.venda?.preco > 0)) {
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
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({ message: 'Pagamentos indisponíveis no momento. Tente novamente mais tarde.' });
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
    if (!course.ativo || !course.venda?.disponivel || !(course.venda?.preco > 0)) {
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

    // Compra gratuita (cortesia via cupom 100%) — não passa pelo Mercado Pago
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

    // Valor mínimo do Mercado Pago
    if (breakdown.total < 1) {
      return res.status(400).json({ message: 'O valor total mínimo para pagamento é R$ 1,00' });
    }

    const order = await Order.create(orderData);

    // Métodos de pagamento excluídos conforme configuração do admin
    const excluded: string[] = [];
    if (!config.metodos.pix) excluded.push('bank_transfer');
    if (!config.metodos.cartaoCredito) excluded.push('credit_card');
    if (!config.metodos.cartaoDebito) excluded.push('debit_card');
    if (!config.metodos.boleto) excluded.push('ticket');

    try {
      const pref = await createPreference({
        orderId: (order._id as any).toString(),
        numeroPedido: order.numeroPedido,
        cursoTitulo: course.titulo,
        total: breakdown.total,
        comprador: { nome, email, telefone, cpf: cpfDigitos },
        excludedPaymentTypes: excluded,
        parcelasMaximas: config.parcelasMaximas,
        baseUrl: getBaseUrl(),
        notificationUrl: `${getBaseUrl()}/api/payments/webhook`
      });

      order.mercadoPago.preferenceId = pref.preferenceId;
      await order.save();

      return res.status(201).json({
        numeroPedido: order.numeroPedido,
        preferenceId: pref.preferenceId,
        initPoint: pref.initPoint,
        redirectUrl: pref.initPoint
      });
    } catch (mpError: any) {
      console.error('Erro Mercado Pago ao criar preferência:', mpError?.message || mpError);
      order.status = 'cancelado';
      await order.save();
      return res.status(502).json({ message: 'Não foi possível iniciar o pagamento. Tente novamente.' });
    }
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    res.status(500).json({ message: 'Erro ao processar checkout' });
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

    // Atualiza dados do pagamento
    order.mercadoPago.paymentId = payment.id;
    order.mercadoPago.status = payment.status;
    order.mercadoPago.statusDetail = payment.statusDetail;
    order.mercadoPago.paymentMethodId = payment.paymentMethodId;
    order.mercadoPago.paymentTypeId = payment.paymentTypeId;
    order.mercadoPago.lastFourDigits = payment.lastFourDigits;
    order.mercadoPago.installments = payment.installments;
    if (payment.dateApproved) order.mercadoPago.dateApproved = new Date(payment.dateApproved);
    order.metodoPagamento = payment.paymentTypeId || payment.paymentMethodId;

    const novoStatus = mapMpStatus(payment.status);

    // SEGURANÇA: valida se o valor pago corresponde ao total do pedido
    const valorConfere = Math.abs(payment.transactionAmount - order.valores.total) <= 0.02;

    if (novoStatus === 'aprovado' && !valorConfere) {
      console.error(
        `ALERTA SEGURANÇA: valor divergente no pedido ${order.numeroPedido}. Pago=${payment.transactionAmount} Esperado=${order.valores.total}`
      );
      order.status = 'em_processo';
      await order.save();
      return res.status(200).json({ received: true, warning: 'amount-mismatch' });
    }

    order.status = novoStatus;
    await order.save();

    if (novoStatus === 'aprovado' && valorConfere) {
      await fulfillOrder((order._id as any).toString());
    }

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

    res.json({
      numeroPedido: order.numeroPedido,
      cursoTitulo: order.cursoTitulo,
      status: order.status,
      entregue: order.entregue,
      metodoPagamento: order.metodoPagamento,
      valores: order.valores,
      compradorNome: order.compradorDados.nome,
      createdAt: order.createdAt,
      isGuest,
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
    if (order.status === 'aprovado' || !order.mercadoPago.preferenceId) {
      return res.json({ status: order.status, entregue: order.entregue });
    }
    if (order.mercadoPago.paymentId && isMercadoPagoConfigured()) {
      const payment = await getPayment(order.mercadoPago.paymentId);
      if (payment) {
        const novoStatus = mapMpStatus(payment.status);
        const valorConfere = Math.abs(payment.transactionAmount - order.valores.total) <= 0.02;
        order.status = novoStatus;
        await order.save();
        if (novoStatus === 'aprovado' && valorConfere) {
          await fulfillOrder((order._id as any).toString());
        }
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
