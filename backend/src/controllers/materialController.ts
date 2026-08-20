import { Request, Response } from 'express';
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago';
import crypto from 'crypto';
import Material, { IMaterial, normalizeMaterialTipo } from '../models/Material';
import MaterialOrder, { MaterialOrderStatus } from '../models/MaterialOrder';
import MaterialEntitlement, { isEntitlementValid } from '../models/MaterialEntitlement';
import { AuthRequest } from '../middleware/auth';
import { validateCPF } from '../utils/validators';
import { getPaymentConfig } from '../config/paymentConfig';
import {
  validateCouponForMaterial,
  computeMaterialPricing,
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
import { getSignedUrl } from '../services/blobStorageService';
import { fulfillMaterialOrder } from '../services/materialFulfillmentService';
import { sendMaterialPurchaseEmail, isEmailConfigured } from '../services/emailService';
import {
  watermarkPdfBuffer,
  hasWatermarkIdentity,
  type WatermarkIdentity
} from '../services/pdfWatermarkService';
import {
  DOWNLOAD_TERMS_VERSION,
  DOWNLOAD_TERMS_TITLE,
  DOWNLOAD_TERMS_SECTIONS,
  DOWNLOAD_TERMS_CONFIRMATION
} from '../config/downloadTerms';
import User from '../models/User';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Garante que o nome do arquivo de PDF termine em .pdf. */
function ensurePdfName(name: string): string {
  const base = (name || 'material').trim() || 'material';
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

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
  return (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://www.ecorj.com').replace(/\/+$/, '');
}

async function generateNumeroPedido(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let rand = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) rand += KEY_CHARS.charAt(bytes[i] % KEY_CHARS.length);
    const numero = `ECO-MAT-${datePart}-${rand}`;
    const existing = await MaterialOrder.findOne({ numeroPedido: numero }).select('_id');
    if (!existing) return numero;
  }
}

function mapMpStatus(mpStatus: string): MaterialOrderStatus {
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

/** Preço de exibição (produto): base e valor final após "desconto ativado" (sem taxa/cupom). */
function displayPricing(material: IMaterial) {
  const precoBase = round2(Math.max(0, material.preco || 0));
  let desconto = 0;
  const da = material.descontoAtivado;
  if (da && da.ativo && da.valor > 0) {
    desconto = da.tipo === 'percentual'
      ? round2(precoBase * (Math.min(da.valor, 100) / 100))
      : round2(Math.min(da.valor, precoBase));
  }
  const preco = round2(Math.max(0, precoBase - desconto));
  return { preco, precoOriginal: desconto > 0 ? precoBase : undefined, temDesconto: desconto > 0 };
}

/** Serializa os conteúdos para consumo por quem TEM acesso (com embed e links de download). */
function serializeConteudosForAccess(material: IMaterial, token: string) {
  return material.conteudos.map((c, index) => ({
    index,
    tipo: c.tipo,
    titulo: c.titulo,
    descricao: c.descricao,
    duracao: c.duracao,
    embedVideo: c.tipo === 'aula' ? c.embedVideo : undefined,
    nomeArquivo: c.nomeArquivo,
    downloadUrl: (c.tipo === 'pdf' || c.tipo === 'arquivo')
      ? `/api/materials/access/${token}/download/${index}`
      : undefined
  }));
}

/** Metadados públicos dos conteúdos (sem embed nem URL de arquivo). */
function serializeConteudosPublic(material: IMaterial) {
  return material.conteudos.map((c, index) => ({
    index,
    tipo: c.tipo,
    titulo: c.titulo,
    descricao: c.descricao,
    duracao: c.duracao
  }));
}

/** Encontra um entitlement VÁLIDO do usuário/e-mail para um material. */
async function findUserEntitlement(materialId: string, userId?: string, email?: string) {
  const or: any[] = [];
  if (userId) or.push({ user: userId });
  if (email) or.push({ email: email.toLowerCase().trim() });
  if (!or.length) return null;
  const ents = await MaterialEntitlement.find({ material: materialId, $or: or });
  return ents.find((e) => isEntitlementValid(e)) || null;
}

// ==========================================================================
//  LISTAGEM E DETALHE (PÚBLICO)
// ==========================================================================

// @desc    Listar materiais disponíveis na loja
// @route   GET /api/materials
// @access  Public (optionalAuth)
export const listMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const materials = await Material.find({ ativo: true, disponivel: true })
      .sort({ destaque: -1, ordem: 1, createdAt: -1 });

    // Materiais já adquiridos pelo usuário (para exibir "Adquirido")
    let ownedIds = new Set<string>();
    if (req.user?._id || req.user?.email) {
      const or: any[] = [];
      if (req.user?._id) or.push({ user: req.user._id });
      if (req.user?.email) or.push({ email: req.user.email.toLowerCase() });
      const ents = await MaterialEntitlement.find({ $or: or }).select('material ativo revogado validade');
      ents.forEach((e) => { if (isEntitlementValid(e)) ownedIds.add(e.material.toString()); });
    }

    const list = materials.map((m) => {
      const dp = displayPricing(m);
      return {
        _id: m._id,
        titulo: m.titulo,
        descricaoCurta: m.descricaoCurta || (m.descricao || '').substring(0, 160),
        tipo: normalizeMaterialTipo(m.tipo),
        capa: m.capa,
        preco: dp.preco,
        precoOriginal: dp.precoOriginal,
        temDesconto: dp.temDesconto,
        destaque: m.destaque,
        totalConteudos: m.conteudos.length,
        avaliacaoMedia: m.avaliacaoMedia,
        avaliacaoTotal: m.avaliacaoTotal,
        // Prova social opcional: só vai para o cliente se o admin habilitou.
        vendasTotais: m.exibirVendas === false ? undefined : m.vendasTotais,
        adquirido: ownedIds.has((m._id as any).toString())
      };
    });

    res.json({ materials: list });
  } catch (error) {
    console.error('Erro ao listar materiais:', error);
    res.status(500).json({ message: 'Erro ao listar materiais' });
  }
};

// @desc    Detalhe público de um material
// @route   GET /api/materials/:id
// @access  Public (optionalAuth)
export const getMaterialById = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material || !material.ativo) {
      return res.status(404).json({ message: 'Material não encontrado' });
    }

    const entitlement = await findUserEntitlement(
      (material._id as any).toString(),
      req.user?._id ? String(req.user._id) : undefined,
      req.user?.email
    );
    const temAcesso = !!entitlement;

    const dp = displayPricing(material);
    res.json({
      material: {
        _id: material._id,
        titulo: material.titulo,
        descricao: material.descricao,
        descricaoCurta: material.descricaoCurta,
        tipo: normalizeMaterialTipo(material.tipo),
        capa: material.capa,
        disponivel: material.disponivel,
        preco: dp.preco,
        precoOriginal: dp.precoOriginal,
        temDesconto: dp.temDesconto,
        validadeAcessoDias: material.validadeAcessoDias,
        totalConteudos: material.conteudos.length,
        avaliacaoMedia: material.avaliacaoMedia,
        avaliacaoTotal: material.avaliacaoTotal,
        // Prova social opcional: só vai para o cliente se o admin habilitou.
        vendasTotais: material.exibirVendas === false ? undefined : material.vendasTotais,
        // Conteúdo liberado somente para quem tem acesso; senão apenas metadados.
        conteudos: temAcesso && entitlement
          ? serializeConteudosForAccess(material, entitlement.accessToken)
          : serializeConteudosPublic(material)
      },
      temAcesso,
      accessToken: temAcesso && entitlement ? entitlement.accessToken : undefined
    });
  } catch (error) {
    console.error('Erro ao obter material:', error);
    res.status(500).json({ message: 'Erro ao obter material' });
  }
};

// ==========================================================================
//  COTAÇÃO E CHECKOUT
// ==========================================================================

// @desc    Cotação de preço de um material (com cupom opcional)
// @route   POST /api/materials/quote
// @access  Public
export const quoteMaterial = async (req: Request, res: Response) => {
  try {
    const { materialId, cupom, email } = req.body;
    if (!materialId) return res.status(400).json({ message: 'Material é obrigatório' });

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });
    // Preço 0 é válido: significa material GRATUITO (o usuário adere sem pagar).
    if (!material.ativo || !material.disponivel) {
      return res.status(400).json({ message: 'Material não está disponível para compra' });
    }

    const config = await getPaymentConfig();
    const parcial = computeMaterialPricing(material, null, config.taxaOperacionalPercentual);

    let couponResult = null;
    let couponError: string | undefined;
    if (cupom) {
      const vr = await validateCouponForMaterial(cupom, email || '', parcial.subtotal);
      if (vr.valido && vr.coupon) couponResult = vr.coupon;
      else couponError = vr.motivo;
    }

    const breakdown = computeMaterialPricing(material, couponResult, config.taxaOperacionalPercentual);
    res.json({
      materialId,
      materialTitulo: material.titulo,
      valores: breakdown,
      cupomValido: !!couponResult,
      cupomErro: couponError
    });
  } catch (error) {
    console.error('Erro ao cotar material:', error);
    res.status(500).json({ message: 'Erro ao calcular preço' });
  }
};

// @desc    Criar checkout de material (pedido + preferência Mercado Pago)
// @route   POST /api/materials/checkout
// @access  Public (optionalAuth)
export const createMaterialCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const { materialId, cupom, comprador, aceiteTermos } = req.body;

    const config = await getPaymentConfig();
    if (!config.vendasAtivas) {
      return res.status(503).json({ message: 'As vendas estão temporariamente desativadas' });
    }
    // A verificação do Mercado Pago acontece só depois de calcular o total: pedidos
    // gratuitos (material com preço 0 ou cupom de 100%) não passam pelo gateway.
    // Sem SMTP não há como entregar o material ao convidado: o código de acesso,
    // o link de download e o PDF vão todos por e-mail. Exige login nesse caso.
    if (!req.user && !isEmailConfigured()) {
      return res.status(401).json({
        message: 'No momento não é possível comprar sem estar logado, pois o envio de e-mails está desativado e não conseguiríamos enviar seu código de acesso, o material em PDF e o comprovante. Faça login (ou crie sua conta) para concluir a compra — o material é liberado automaticamente na sua conta.',
        loginObrigatorio: true,
        motivo: 'email_desabilitado'
      });
    }

    if (!materialId) return res.status(400).json({ message: 'Material é obrigatório' });
    if (!comprador || typeof comprador !== 'object') {
      return res.status(400).json({ message: 'Dados do comprador são obrigatórios' });
    }

    const nome = String(comprador.nome || '').trim();
    const email = String(comprador.email || '').trim().toLowerCase();
    const telefone = String(comprador.telefone || '').trim();
    const cpfDigitos = String(comprador.cpf || '').replace(/\D/g, '');

    if (nome.length < 3) return res.status(400).json({ message: 'Informe o nome completo' });
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'E-mail inválido' });
    if (telefone.replace(/\D/g, '').length < 10) return res.status(400).json({ message: 'Telefone inválido' });
    if (!validateCPF(cpfDigitos)) return res.status(400).json({ message: 'CPF inválido' });
    if (!aceiteTermos || aceiteTermos.aceito !== true) {
      return res.status(400).json({ message: 'É necessário aceitar os Termos e Condições de Compra' });
    }

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });
    // Preço 0 é válido: significa material GRATUITO (o usuário adere sem pagar).
    if (!material.ativo || !material.disponivel) {
      return res.status(400).json({ message: 'Material não está disponível para compra' });
    }

    // Anti-abuso: limita pedidos pendentes recentes por e-mail
    const dezMinAtras = new Date(Date.now() - 10 * 60 * 1000);
    const pendentesRecentes = await MaterialOrder.countDocuments({
      'compradorDados.email': email,
      status: { $in: ['pendente', 'em_processo'] },
      createdAt: { $gte: dezMinAtras }
    });
    if (pendentesRecentes >= 8) {
      return res.status(429).json({ message: 'Muitas tentativas de compra. Aguarde alguns minutos e tente novamente.' });
    }

    // Preço — SEMPRE recalculado no servidor
    const parcial = computeMaterialPricing(material, null, config.taxaOperacionalPercentual);
    let couponDoc = null;
    if (cupom) {
      const vr = await validateCouponForMaterial(cupom, email, parcial.subtotal);
      if (!vr.valido) return res.status(400).json({ message: vr.motivo || 'Cupom inválido' });
      couponDoc = vr.coupon || null;
    }
    const breakdown = computeMaterialPricing(material, couponDoc, config.taxaOperacionalPercentual);

    const ip = getClientIp(req);
    const numeroPedido = await generateNumeroPedido();
    const orderData: any = {
      numeroPedido,
      material: material._id,
      materialTitulo: material.titulo,
      materialTipo: material.tipo,
      comprador: req.user?._id || undefined,
      compradorDados: { nome, email, telefone, cpf: cpfDigitos },
      valores: {
        precoBase: breakdown.precoBase,
        descontoLote: 0,
        descontoAtivado: breakdown.descontoAtivado,
        descontoCupom: breakdown.descontoCupom,
        subtotal: breakdown.subtotal,
        taxaOperacionalPercentual: breakdown.taxaOperacionalPercentual,
        taxaOperacional: breakdown.taxaOperacional,
        total: breakdown.total
      },
      cupomAplicado: couponDoc ? { couponId: couponDoc._id, codigo: couponDoc.codigo } : undefined,
      status: 'pendente',
      aceiteTermos: { aceito: true, versao: config.termosVersao, dataAceite: new Date(), ip },
      ipCompra: ip
    };

    // Adesão gratuita (material com preço 0 ou cupom de 100%) — não passa pelo Mercado Pago
    if (breakdown.total <= 0) {
      orderData.status = 'aprovado';
      orderData.metodoPagamento = 'cortesia';
      const order = await MaterialOrder.create(orderData);
      await fulfillMaterialOrder((order._id as any).toString());
      return res.status(201).json({
        numeroPedido: order.numeroPedido,
        gratuito: true,
        redirectUrl: `${getBaseUrl()}/materiais/compra/status?pedido=${order.numeroPedido}`
      });
    }

    // A partir daqui há valor a cobrar: o gateway é obrigatório.
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({ message: 'Pagamentos indisponíveis no momento. Tente novamente mais tarde.' });
    }

    const order = await MaterialOrder.create(orderData);
    const { firstName, lastName } = splitName(nome);

    // Checkout Transparente: pedido pendente; o pagamento é criado em /process a
    // partir do Payment Brick (o valor é sempre recalculado no servidor).
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
    console.error('Erro ao criar checkout de material:', error);
    res.status(500).json({ message: 'Erro ao processar checkout' });
  }
};

/** Ver `isPagamentoObsoleto` em paymentController — mesma regra para materiais. */
function isPagamentoObsoletoMaterial(order: any, payment: { id: string; status: string }): boolean {
  if (order.status !== 'aprovado') return false;
  if (order.mercadoPago?.paymentId && String(order.mercadoPago.paymentId) === String(payment.id)) return false;
  return !['approved', 'refunded', 'charged_back', 'in_mediation'].includes(payment.status);
}

/** Persiste dados de um pagamento MP no pedido de material e entrega se aprovado. */
export async function applyMaterialPayment(order: any, payment: {
  id: string; status: string; statusDetail: string; transactionAmount: number;
  paymentMethodId?: string; paymentTypeId?: string; lastFourDigits?: string;
  installments?: number; dateApproved?: string;
  pixQrCode?: string; pixQrCodeBase64?: string; ticketUrl?: string; barcode?: string;
}): Promise<MaterialOrderStatus> {
  if (isPagamentoObsoletoMaterial(order, payment)) {
    console.warn(
      `Pedido de material ${order.numeroPedido} já aprovado — ignorando pagamento ${payment.id} (${payment.status}) de tentativa anterior.`
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
      `ALERTA SEGURANÇA (material): valor divergente no pedido ${order.numeroPedido}. Pago=${payment.transactionAmount} Esperado=${order.valores.total}`
    );
    order.status = 'em_processo';
    await order.save();
    return 'em_processo';
  }

  order.status = novoStatus;
  await order.save();
  if (novoStatus === 'aprovado' && valorConfere) {
    await fulfillMaterialOrder((order._id as any).toString());
  }
  return novoStatus;
}

function serializeMaterialPaymentResponse(order: any, threeDs?: ThreeDsChallenge) {
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
    threeDs
  };
}

/** Ver `podeReaproveitarPagamento` em paymentController — mesma regra para materiais. */
function podeReaproveitarPagamentoMaterial(
  existing: { status: string; statusDetail?: string; paymentTypeId?: string },
  metodoEscolhido: string
): boolean {
  const st = mapMpStatus(existing.status);
  if (st === 'rejeitado' || st === 'cancelado') return false;
  if (existing.statusDetail === 'pending_challenge') return false;
  if (st !== 'pendente') return true;
  return !!existing.paymentTypeId && existing.paymentTypeId === metodoEscolhido;
}

// @desc    Processar pagamento de material (Checkout Transparente)
// @route   POST /api/materials/order/:numeroPedido/process
// @access  Public (optionalAuth)
export const processMaterialPayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!isMercadoPagoConfigured()) {
      return res.status(503).json({ message: 'Pagamentos indisponíveis no momento. Tente novamente mais tarde.' });
    }

    const order = await MaterialOrder.findOne({ numeroPedido: req.params.numeroPedido });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });

    if (order.status === 'aprovado' || order.entregue) {
      return res.json(serializeMaterialPaymentResponse(order));
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

    // Cada meio de pagamento validado individualmente (crédito, débito, boleto, Pix)
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

    // Anti-duplicidade (e troca de meio de pagamento no mesmo pedido)
    if (order.mercadoPago.paymentId) {
      const existing = await getPayment(order.mercadoPago.paymentId);
      if (existing) {
        if (podeReaproveitarPagamentoMaterial(existing, metodo)) {
          await applyMaterialPayment(order, existing);
          return res.json(serializeMaterialPaymentResponse(order));
        }
        if (mapMpStatus(existing.status) === 'pendente') {
          await cancelPayment(existing.id);
        }
      }
    }

    const { firstName, lastName } = splitName(order.compradorDados.nome);
    const result = await createPayment({
      transactionAmount: order.valores.total,
      description: `Material ECO RJ - ${order.materialTitulo}`,
      externalReference: (order._id as any).toString(),
      notificationUrl: `${getBaseUrl()}/api/materials/webhook`,
      statementDescriptor: 'ECORJ MAT',
      idempotencyKey: `matpay-${(order._id as any).toString()}-${Date.now()}`,
      metadata: { order_id: (order._id as any).toString(), numero_pedido: order.numeroPedido },
      payer: { email: order.compradorDados.email, firstName, lastName, cpf: order.compradorDados.cpf },
      paymentMethodId,
      token,
      issuerId: payload.issuer_id ? String(payload.issuer_id) : undefined,
      installments: resolveInstallments(metodo, payload.installments, config.parcelasMaximas),
      payerAddress,
      threeDSecureMode: isCardMethod(metodo) ? 'optional' : undefined
    });

    await applyMaterialPayment(order, result);
    return res.status(201).json(serializeMaterialPaymentResponse(order, result.threeDs));
  } catch (error: any) {
    const { motivo, detalhe } = extractMpError(error);
    console.error('Erro ao processar pagamento de material (MP):', detalhe || error);
    return res.status(502).json({
      message: 'Não foi possível processar o pagamento. Verifique os dados e tente novamente.',
      motivo,
      detalhe
    });
  }
};

// @desc    Webhook do Mercado Pago (materiais)
// @route   ALL /api/materials/webhook
// @access  Public (assinado)
export const materialWebhook = async (req: Request, res: Response) => {
  try {
    const type = (req.query.type || req.query.topic || req.body?.type || req.body?.topic) as string;
    const dataId = (
      req.query['data.id'] ||
      (req.query.data as any)?.id ||
      req.body?.data?.id ||
      req.body?.resource
    ) as string;

    if (type && type !== 'payment') {
      return res.status(200).json({ received: true, ignored: type });
    }
    if (!dataId) {
      return res.status(200).json({ received: true, ignored: 'no-data-id' });
    }

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
          console.warn('Webhook MP (material) assinatura inválida:', sigErr.reason, sigErr.requestId);
          return res.status(401).json({ message: 'Assinatura inválida' });
        }
        throw sigErr;
      }
    }

    const payment = await getPayment(String(dataId));
    if (!payment) return res.status(200).json({ received: true, ignored: 'payment-not-found' });

    const orderId = payment.externalReference;
    const order = orderId
      ? await MaterialOrder.findById(orderId)
      : await MaterialOrder.findOne({ 'mercadoPago.paymentId': payment.id });
    if (!order) {
      console.warn('Webhook MP (material): pedido não encontrado para pagamento', payment.id);
      return res.status(200).json({ received: true, ignored: 'order-not-found' });
    }

    // Atualiza dados do pagamento, confere valor (segurança) e entrega se aprovado
    await applyMaterialPayment(order, payment);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook de materiais:', error);
    return res.status(200).json({ received: true, error: true });
  }
};

// @desc    Status público de um pedido de material
// @route   GET /api/materials/order/:numeroPedido
// @access  Public
export const getMaterialOrderStatus = async (req: Request, res: Response) => {
  try {
    const order = await MaterialOrder.findOne({ numeroPedido: req.params.numeroPedido });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });

    const isGuest = !order.comprador;
    const aprovado = order.status === 'aprovado';
    const pendente = order.status === 'pendente' || order.status === 'em_processo';
    const mp = order.mercadoPago || {};
    const isPix = mp.paymentTypeId === 'bank_transfer' || mp.paymentMethodId === 'pix';
    const isBoleto = mp.paymentTypeId === 'ticket' || !!mp.barcode;

    res.json({
      numeroPedido: order.numeroPedido,
      materialId: order.material,
      materialTitulo: order.materialTitulo,
      status: order.status,
      statusDetail: mp.statusDetail,
      entregue: order.entregue,
      emailEnviado: order.emailEnviado,
      metodoPagamento: order.metodoPagamento,
      valores: order.valores,
      compradorNome: order.compradorDados.nome,
      compradorEmail: order.compradorDados.email,
      createdAt: order.createdAt,
      isGuest,
      pix: pendente && isPix && mp.pixQrCode ? {
        qrCode: mp.pixQrCode,
        qrCodeBase64: mp.pixQrCodeBase64,
        ticketUrl: mp.ticketUrl
      } : undefined,
      boleto: pendente && isBoleto ? { url: mp.ticketUrl, barcode: mp.barcode } : undefined,
      // Acesso é exposto na página de status como salvaguarda anti-perda do produto.
      serialKeyCodigo: aprovado ? order.serialKeyCodigo : undefined,
      accessToken: aprovado && isGuest ? order.accessToken : undefined,
      accessLink: aprovado && isGuest && order.accessToken
        ? `${getBaseUrl()}/materiais/acesso?token=${order.accessToken}`
        : undefined,
      materialLink: aprovado ? `${getBaseUrl()}/materiais/${order.material}` : undefined
    });
  } catch (error) {
    console.error('Erro ao obter status do pedido de material:', error);
    res.status(500).json({ message: 'Erro ao obter status do pedido' });
  }
};

// @desc    Reconsulta manual do pagamento (fallback caso o webhook falhe)
// @route   POST /api/materials/order/:numeroPedido/sync
// @access  Public
export const syncMaterialOrder = async (req: Request, res: Response) => {
  try {
    const order = await MaterialOrder.findOne({ numeroPedido: req.params.numeroPedido });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });

    if (order.status === 'aprovado') {
      // Pago mas sem entrega (falha ao gerar o acesso / enviar o e-mail): reprocessa.
      if (!order.entregue) await fulfillMaterialOrder((order._id as any).toString());
      const pago = await MaterialOrder.findById(order._id);
      return res.json({ status: pago?.status, entregue: pago?.entregue });
    }

    if (isMercadoPagoConfigured()) {
      // Consulta por payment_id E por external_reference — cobre o pedido que
      // ficou sem `paymentId` gravado mas foi pago no Mercado Pago.
      const pagamentos = await collectOrderPayments(
        (order._id as any).toString(),
        order.mercadoPago?.paymentId,
        { buscaCompleta: false }
      );
      const payment = pickRelevantPayment(pagamentos);
      if (payment) {
        await applyMaterialPayment(order, payment);
      }
    }
    const updated = await MaterialOrder.findById(order._id);
    res.json({ status: updated?.status, entregue: updated?.entregue });
  } catch (error) {
    console.error('Erro ao sincronizar pedido de material:', error);
    res.status(500).json({ message: 'Erro ao sincronizar pedido' });
  }
};

// @desc    Recuperar acesso por e-mail (reenvia e-mails de todos os pedidos aprovados)
// @route   POST /api/materials/recover
// @access  Public
export const recoverMaterialAccess = async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'E-mail inválido' });

    const orders = await MaterialOrder.find({
      'compradorDados.email': email,
      status: 'aprovado'
    }).sort({ createdAt: -1 }).limit(50);

    let reenviados = 0;
    for (const order of orders) {
      if (!order.accessToken || !order.serialKeyCodigo) {
        // Garante que a entrega foi processada (gera acesso se faltou)
        await fulfillMaterialOrder((order._id as any).toString());
        continue;
      }
      const isGuest = !order.comprador;
      const accessLink = `${getBaseUrl()}/materiais/acesso?token=${order.accessToken}`;
      const materialLink = `${getBaseUrl()}/materiais/${order.material}`;
      try {
        order.emailTentativas = (order.emailTentativas || 0) + 1;
        const ok = await sendMaterialPurchaseEmail(order, {
          isGuest,
          serialKeyCodigo: order.serialKeyCodigo,
          accessLink,
          materialLink
        });
        if (ok) { order.emailEnviado = true; reenviados++; }
        await order.save();
      } catch { /* noop */ }
    }

    // Resposta neutra (não revela se o e-mail existe)
    res.json({
      message: 'Se houver compras associadas a este e-mail, os acessos foram reenviados. Verifique sua caixa de entrada e spam.',
      pedidosEncontrados: orders.length,
      reenviados
    });
  } catch (error) {
    console.error('Erro ao recuperar acesso de material:', error);
    res.status(500).json({ message: 'Erro ao recuperar acesso' });
  }
};

// ==========================================================================
//  ACESSO (CONVIDADO POR TOKEN)
// ==========================================================================

// @desc    Acessar material via token (convidado)
// @route   GET /api/materials/access/:token
// @access  Public (token é a autenticação)
export const getAccessByToken = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token || '');
    const ent = await MaterialEntitlement.findOne({ accessToken: token });
    if (!ent) return res.status(404).json({ message: 'Acesso não encontrado ou inválido' });
    if (!isEntitlementValid(ent)) {
      return res.status(403).json({ message: 'Este acesso expirou ou foi revogado.' });
    }
    const material = await Material.findById(ent.material);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });

    ent.ultimoAcesso = new Date();
    await ent.save();

    // Dados do titular (para marca d'água nos PDFs baixados pelo convidado).
    // O e-mail vem do próprio entitlement; nome/CPF vêm do pedido, quando houver.
    let compradorNome = '';
    let compradorCpf = '';
    if (ent.order) {
      const order = await MaterialOrder.findById(ent.order).select('compradorDados');
      if (order?.compradorDados) {
        compradorNome = order.compradorDados.nome || '';
        compradorCpf = order.compradorDados.cpf || '';
      }
    }

    res.json({
      material: {
        _id: material._id,
        titulo: material.titulo,
        descricao: material.descricao,
        tipo: material.tipo,
        capa: material.capa,
        conteudos: serializeConteudosForAccess(material, ent.accessToken)
      },
      serialKey: ent.serialKey,
      validade: ent.validade,
      email: ent.email,
      comprador: { nome: compradorNome, cpf: compradorCpf, email: ent.email }
    });
  } catch (error) {
    console.error('Erro ao acessar material por token:', error);
    res.status(500).json({ message: 'Erro ao acessar material' });
  }
};

/** Dados do titular de um entitlement, para a marca d'água do PDF. */
async function resolveEntitlementIdentity(ent: any): Promise<WatermarkIdentity> {
  let nome = '';
  let cpf = '';
  const email = ent.email || '';

  if (ent.order) {
    const order = await MaterialOrder.findById(ent.order).select('compradorDados');
    if (order?.compradorDados) {
      nome = order.compradorDados.nome || '';
      cpf = order.compradorDados.cpf || '';
    }
  }
  // Acessos de cortesia/admin não têm pedido: cai para os dados da conta vinculada.
  if ((!nome || !cpf) && ent.user) {
    const user = await User.findById(ent.user).select('nomeCompleto cpf email');
    if (user) {
      nome = nome || user.nomeCompleto || '';
      cpf = cpf || user.cpf || '';
    }
  }
  return { nome, cpf, email };
}

// @desc    Termos de download (direitos autorais) exibidos antes de baixar
// @route   GET /api/materials/download-terms
// @access  Public
export const getDownloadTerms = (_req: Request, res: Response) => {
  res.json({
    versao: DOWNLOAD_TERMS_VERSION,
    titulo: DOWNLOAD_TERMS_TITLE,
    secoes: DOWNLOAD_TERMS_SECTIONS,
    confirmacao: DOWNLOAD_TERMS_CONFIRMATION
  });
};

// @desc    Download de um conteúdo via token (convidado ou usuário logado)
// @route   GET /api/materials/access/:token/download/:index
// @access  Public (token é a autenticação)
export const downloadByToken = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token || '');
    const index = parseInt(req.params.index, 10);
    const ent = await MaterialEntitlement.findOne({ accessToken: token });
    if (!ent || !isEntitlementValid(ent)) {
      return res.status(403).json({ message: 'Acesso inválido ou expirado' });
    }
    const material = await Material.findById(ent.material);
    if (!material || !material.conteudos[index]) {
      return res.status(404).json({ message: 'Conteúdo não encontrado' });
    }
    const conteudo = material.conteudos[index];
    if (conteudo.tipo === 'aula') {
      return res.status(400).json({ message: 'Este conteúdo é uma aula em vídeo, não um arquivo para download.' });
    }
    const url = await getSignedUrl(conteudo);
    if (!url) {
      return res.status(404).json({ message: 'Arquivo ainda não disponível. Contate o suporte.' });
    }

    // Registro do aceite dos termos de download (evidência de direitos autorais).
    const update: any = { $inc: { totalDownloads: 1 }, $set: { ultimoAcesso: new Date() } };
    if (String(req.query.aceite || '') === '1') {
      update.$set.aceiteTermosDownload = {
        versao: DOWNLOAD_TERMS_VERSION,
        data: new Date(),
        ip: getClientIp(req)
      };
    }
    await MaterialEntitlement.updateOne({ _id: ent._id }, update);

    const nomeArquivo = conteudo.nomeArquivo
      || `${(conteudo.titulo || 'material').replace(/[^\w.-]+/g, '_')}`;

    // PDFs saem daqui já com marca d'água aplicada NO SERVIDOR. Fazer isso no
    // navegador travava máquinas lentas e quebrava no iOS (blob: + <a download>).
    const isPdf = conteudo.tipo === 'pdf'
      || conteudo.mimeType === 'application/pdf'
      || /\.pdf$/i.test(nomeArquivo);

    if (isPdf) {
      try {
        const identity = await resolveEntitlementIdentity(ent);
        const upstream = await fetch(url);
        if (!upstream.ok) throw new Error(`upstream HTTP ${upstream.status}`);
        const original = Buffer.from(await upstream.arrayBuffer());
        const buffer = hasWatermarkIdentity(identity)
          ? await watermarkPdfBuffer(original, identity)
          : original;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${ensurePdfName(nomeArquivo).replace(/"/g, '')}"`);
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(200).send(buffer);
      } catch (e) {
        // Nunca deixa o comprador sem o arquivo: cai para o download direto.
        console.error('Erro ao gerar PDF com marca d\'água (fallback p/ redirect):', e);
        return res.redirect(302, url);
      }
    }

    // Arquivos não-PDF: transmitidos pela nossa API como anexo (mesma origem),
    // o que também evita o comportamento errático do Safari com URLs assinadas.
    try {
      const upstream = await fetch(url);
      if (!upstream.ok) throw new Error(`upstream HTTP ${upstream.status}`);
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', conteudo.mimeType || upstream.headers.get('content-type') || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo.replace(/"/g, '')}"`);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).send(buffer);
    } catch (e) {
      console.error('Erro no proxy de download (fallback p/ redirect):', e);
      return res.redirect(302, url);
    }
  } catch (error) {
    console.error('Erro no download por token:', error);
    res.status(500).json({ message: 'Erro ao baixar arquivo' });
  }
};

// ==========================================================================
//  USUÁRIO LOGADO
// ==========================================================================

// @desc    Meus materiais adquiridos
// @route   GET /api/materials/my
// @access  Private
export const getMyMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const email = req.user?.email?.toLowerCase();

    // Auto-reivindicação: vincula à conta entitlements de compras feitas como
    // convidado com o mesmo e-mail (garante que o produto "siga" o usuário).
    if (userId && email) {
      await MaterialEntitlement.updateMany(
        { email, user: { $exists: false } },
        { $set: { user: userId } }
      );
    }

    const ents = await MaterialEntitlement.find({
      $or: [{ user: userId }, { email }]
    })
      .populate('material', 'titulo capa tipo')
      .sort({ createdAt: -1 });

    const list = ents.map((e) => ({
      _id: e._id,
      material: e.material,
      serialKey: e.serialKey,
      accessToken: e.accessToken,
      validade: e.validade,
      valido: isEntitlementValid(e),
      podeAvaliar: e.podeAvaliar,
      createdAt: e.createdAt
    }));

    res.json({ materiais: list });
  } catch (error) {
    console.error('Erro ao obter meus materiais:', error);
    res.status(500).json({ message: 'Erro ao obter materiais' });
  }
};

// @desc    Conteúdo de um material que o usuário possui (com links de acesso)
// @route   GET /api/materials/:id/content
// @access  Private
export const getMaterialContent = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });

    const ent = await findUserEntitlement(
      (material._id as any).toString(),
      req.user?._id ? String(req.user._id) : undefined,
      req.user?.email
    );
    if (!ent) return res.status(403).json({ message: 'Você não possui acesso a este material.' });

    ent.ultimoAcesso = new Date();
    await ent.save();

    res.json({
      material: {
        _id: material._id,
        titulo: material.titulo,
        descricao: material.descricao,
        tipo: material.tipo,
        capa: material.capa,
        conteudos: serializeConteudosForAccess(material, ent.accessToken)
      },
      accessToken: ent.accessToken,
      serialKey: ent.serialKey,
      validade: ent.validade,
      podeAvaliar: ent.podeAvaliar
    });
  } catch (error) {
    console.error('Erro ao obter conteúdo do material:', error);
    res.status(500).json({ message: 'Erro ao obter conteúdo' });
  }
};

// @desc    Vincular um acesso (token/serial) à conta logada
// @route   POST /api/materials/claim
// @access  Private
export const claimMaterialAccess = async (req: AuthRequest, res: Response) => {
  try {
    const codigo = String(req.body?.codigo || req.body?.token || req.body?.serialKey || '').trim();
    if (!codigo) return res.status(400).json({ message: 'Informe o código ou token de acesso' });

    const ent = await MaterialEntitlement.findOne({
      $or: [{ accessToken: codigo }, { serialKey: codigo.toUpperCase() }]
    });
    if (!ent) return res.status(404).json({ message: 'Acesso não encontrado' });
    if (!isEntitlementValid(ent)) {
      return res.status(403).json({ message: 'Este acesso expirou ou foi revogado.' });
    }

    ent.user = req.user?._id as any;
    await ent.save();

    const material = await Material.findById(ent.material).select('titulo');
    res.json({
      message: `Material "${material?.titulo || ''}" vinculado à sua conta com sucesso!`,
      materialId: ent.material
    });
  } catch (error) {
    console.error('Erro ao reivindicar acesso de material:', error);
    res.status(500).json({ message: 'Erro ao vincular acesso' });
  }
};
