import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';

/**
 * Serviço de integração com o Mercado Pago (Checkout Pro).
 *
 * As credenciais NUNCA ficam no banco de dados nem no front-end — são lidas
 * exclusivamente das variáveis de ambiente do servidor:
 *   - MP_ACCESS_TOKEN  : token privado (APP_USR-... ou TEST-...)
 *   - MP_PUBLIC_KEY    : chave pública (opcional, para SDK front-end)
 *   - MP_WEBHOOK_SECRET: segredo de assinatura dos webhooks
 */

export function isMercadoPagoConfigured(): boolean {
  return !!process.env.MP_ACCESS_TOKEN;
}

export function getPublicKey(): string {
  return process.env.MP_PUBLIC_KEY || '';
}

export function getWebhookSecret(): string {
  return process.env.MP_WEBHOOK_SECRET || '';
}

function buildConfig(idempotencyKey?: string): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN não configurado no servidor');
  }
  return new MercadoPagoConfig({
    accessToken,
    options: idempotencyKey ? { idempotencyKey, timeout: 15000 } : { timeout: 15000 }
  });
}

export interface CreatePreferenceParams {
  orderId: string;
  numeroPedido: string;
  cursoTitulo: string;
  total: number;
  comprador: { nome: string; email: string; telefone: string; cpf: string };
  excludedPaymentTypes: string[]; // ex: ['ticket'] para excluir boleto
  parcelasMaximas: number;
  baseUrl: string;
  notificationUrl: string;
  // Opcionais (usados pela loja de materiais). Se omitidos, mantém o
  // comportamento padrão de cursos (não altera o fluxo existente).
  itemDescription?: string;   // descrição do item na preferência
  statusUrl?: string;         // URL de retorno (back_urls). Default: /compra/status
}

export interface PreferenceResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
}

export async function createPreference(params: CreatePreferenceParams): Promise<PreferenceResult> {
  const config = buildConfig(`pref-${params.orderId}`);
  const preferenceClient = new Preference(config);

  const nameParts = params.comprador.nome.trim().split(/\s+/);
  const firstName = nameParts.shift() || params.comprador.nome;
  const lastName = nameParts.join(' ') || '.';

  const statusUrl = params.statusUrl
    || `${params.baseUrl}/compra/status?pedido=${params.numeroPedido}`;

  const response = await preferenceClient.create({
    body: {
      items: [
        {
          id: params.orderId,
          title: params.cursoTitulo.substring(0, 250),
          description: (params.itemDescription || `Curso ECO RJ - Pedido ${params.numeroPedido}`).substring(0, 250),
          category_id: 'learnings',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: params.total
        }
      ],
      payer: {
        name: firstName,
        surname: lastName,
        email: params.comprador.email,
        identification: {
          type: 'CPF',
          number: params.comprador.cpf
        }
      },
      payment_methods: {
        excluded_payment_types: params.excludedPaymentTypes.map((t) => ({ id: t })),
        installments: Math.max(1, params.parcelasMaximas)
      },
      external_reference: params.orderId,
      statement_descriptor: 'ECORJ CURSOS',
      notification_url: params.notificationUrl,
      back_urls: {
        success: statusUrl,
        pending: statusUrl,
        failure: statusUrl
      },
      auto_return: 'approved',
      binary_mode: false,
      metadata: {
        order_id: params.orderId,
        numero_pedido: params.numeroPedido
      }
    }
  });

  if (!response.id || !response.init_point) {
    throw new Error('Falha ao criar preferência no Mercado Pago');
  }

  return {
    preferenceId: response.id,
    initPoint: response.init_point,
    sandboxInitPoint: response.sandbox_init_point
  };
}

export interface MpPaymentInfo {
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  externalReference?: string;
  paymentMethodId?: string;
  paymentTypeId?: string;
  lastFourDigits?: string;
  installments?: number;
  dateApproved?: string;
}

/**
 * Parâmetros para criar um pagamento diretamente (Checkout Transparente).
 * O valor (transactionAmount) é SEMPRE calculado no servidor a partir do pedido —
 * nunca vem do cliente.
 */
export interface CreatePaymentParams {
  transactionAmount: number;
  description: string;
  externalReference: string;   // order._id
  notificationUrl: string;
  statementDescriptor?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
  payer: {
    email: string;
    firstName?: string;
    lastName?: string;
    cpf: string;
  };
  paymentMethodId: string;     // 'pix' | 'bolbradesco' | 'master' | 'visa' | ...
  // Dados vindos do Payment Brick (apenas para cartão)
  token?: string;
  issuerId?: string;
  installments?: number;
  // Endereço do pagador (necessário para boleto) — repassado do Brick
  payerAddress?: Record<string, unknown>;
}

/** Resultado do pagamento (inclui dados de Pix/boleto quando aplicável). */
export interface CreatePaymentResult extends MpPaymentInfo {
  pixQrCode?: string;          // "copia e cola" do Pix
  pixQrCodeBase64?: string;    // imagem base64 do QR Code
  ticketUrl?: string;          // link do boleto / comprovante Pix
  barcode?: string;            // linha digitável do boleto
}

/**
 * Cria um pagamento no Mercado Pago (Checkout Transparente).
 * Suporta cartão (com token do Brick), Pix e boleto.
 */
export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const config = buildConfig(params.idempotencyKey);
  const paymentClient = new Payment(config);

  const isCard = !!params.token;

  const body: any = {
    transaction_amount: params.transactionAmount,
    description: params.description.substring(0, 250),
    payment_method_id: params.paymentMethodId,
    external_reference: params.externalReference,
    notification_url: params.notificationUrl,
    statement_descriptor: params.statementDescriptor || 'ECORJ',
    metadata: params.metadata || {},
    payer: {
      email: params.payer.email,
      first_name: params.payer.firstName,
      last_name: params.payer.lastName,
      identification: {
        type: 'CPF',
        number: params.payer.cpf
      },
      ...(params.payerAddress ? { address: params.payerAddress } : {})
    }
  };

  if (isCard) {
    body.token = params.token;
    body.installments = Math.max(1, params.installments || 1);
    if (params.issuerId) body.issuer_id = params.issuerId;
  }

  const p: any = await paymentClient.create({ body });
  if (!p || !p.id) {
    throw new Error('Falha ao criar pagamento no Mercado Pago');
  }

  const txData = p.point_of_interaction?.transaction_data;
  return {
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
    transactionAmount: Number(p.transaction_amount || 0),
    externalReference: p.external_reference,
    paymentMethodId: p.payment_method_id,
    paymentTypeId: p.payment_type_id,
    lastFourDigits: p.card?.last_four_digits,
    installments: p.installments,
    dateApproved: p.date_approved,
    pixQrCode: txData?.qr_code,
    pixQrCodeBase64: txData?.qr_code_base64,
    ticketUrl: txData?.ticket_url || p.transaction_details?.external_resource_url,
    barcode: p.barcode?.content
  };
}

/** Busca um pagamento pelo ID diretamente na API do Mercado Pago (fonte da verdade). */
export async function getPayment(paymentId: string): Promise<MpPaymentInfo | null> {
  const config = buildConfig();
  const paymentClient = new Payment(config);
  const p: any = await paymentClient.get({ id: paymentId });
  if (!p || !p.id) return null;
  return {
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
    transactionAmount: Number(p.transaction_amount || 0),
    externalReference: p.external_reference,
    paymentMethodId: p.payment_method_id,
    paymentTypeId: p.payment_type_id,
    lastFourDigits: p.card?.last_four_digits,
    installments: p.installments,
    dateApproved: p.date_approved
  };
}
