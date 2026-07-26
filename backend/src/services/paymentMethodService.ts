import { PaymentConfig } from '../config/paymentConfig';

/**
 * Resolução e validação do meio de pagamento escolhido no Payment Brick.
 *
 * O Brick envia, no `onSubmit`, o `selectedPaymentMethod` (credit_card,
 * debit_card, ticket, bank_transfer) além do `formData`. Como o `formData`
 * sozinho só traz o `payment_method_id` (ex.: `visa`, `debvisa`, `bolbradesco`,
 * `pix`), sem o tipo não é possível:
 *   - distinguir CRÉDITO de DÉBITO (validação da config do admin e parcelas);
 *   - validar corretamente boleto (hoje qualquer método sem token virava "boleto").
 *
 * O valor declarado pelo cliente NÃO é fonte da verdade: ele só é usado para
 * desempatar crédito x débito. O tipo é sempre derivado do `payment_method_id`
 * + presença do token do cartão.
 */

export type SelectedMethod = 'credit_card' | 'debit_card' | 'ticket' | 'bank_transfer';

/** IDs de cartão de débito no Mercado Pago Brasil. */
const DEBIT_METHOD_IDS = new Set(['debvisa', 'debmaster', 'debelo', 'debcabal', 'maestro']);

/** IDs de transferência bancária instantânea. */
const BANK_TRANSFER_METHOD_IDS = new Set(['pix']);

export interface RawPaymentPayload {
  payment_method_id?: unknown;
  token?: unknown;
  issuer_id?: unknown;
  installments?: unknown;
  selected_payment_method?: unknown;
  selectedPaymentMethod?: unknown;
  payer?: { address?: unknown } & Record<string, unknown>;
}

/**
 * Deriva o tipo do meio de pagamento a partir do payload do Brick.
 * Fonte primária: `payment_method_id` + token. O `selectedPaymentMethod`
 * enviado pelo cliente só é considerado para separar crédito de débito.
 */
export function resolveSelectedMethod(payload: RawPaymentPayload): SelectedMethod {
  const methodId = String(payload.payment_method_id || '').trim().toLowerCase();
  const hasToken = !!payload.token;
  const declared = String(
    payload.selected_payment_method || payload.selectedPaymentMethod || ''
  ).trim().toLowerCase();

  if (BANK_TRANSFER_METHOD_IDS.has(methodId)) return 'bank_transfer';
  if (!hasToken) {
    // Sem token de cartão: só resta boleto (ticket). O Pix já foi tratado acima.
    return 'ticket';
  }
  // Cartão: débito quando o ID é de débito OU quando o Brick declarou débito.
  if (DEBIT_METHOD_IDS.has(methodId) || declared === 'debit_card') return 'debit_card';
  return 'credit_card';
}

export function isCardMethod(method: SelectedMethod): boolean {
  return method === 'credit_card' || method === 'debit_card';
}

/** Rótulo em português para mensagens ao comprador. */
export function methodLabel(method: SelectedMethod): string {
  switch (method) {
    case 'credit_card': return 'cartão de crédito';
    case 'debit_card': return 'cartão de débito';
    case 'ticket': return 'boleto';
    case 'bank_transfer': return 'Pix';
  }
}

/**
 * Confere o método contra os métodos habilitados pelo administrador.
 * Retorna a mensagem de erro, ou `null` se o método estiver liberado.
 */
export function checkMethodEnabled(method: SelectedMethod, config: PaymentConfig): string | null {
  const habilitado =
    method === 'bank_transfer' ? config.metodos.pix
    : method === 'ticket' ? config.metodos.boleto
    : method === 'credit_card' ? config.metodos.cartaoCredito
    : config.metodos.cartaoDebito;

  return habilitado ? null : `Pagamento via ${methodLabel(method)} indisponível no momento.`;
}

/** Campos de endereço exigidos pelo Mercado Pago para emissão de boleto. */
const ADDRESS_FIELDS = ['zip_code', 'street_name', 'street_number', 'neighborhood', 'city', 'federal_unit'] as const;

/**
 * Normaliza o endereço do pagador vindo do Brick (obrigatório para boleto).
 * Retorna `null` quando algum campo exigido pelo Mercado Pago está ausente —
 * sem ele a API do MP recusa a emissão do boleto com um erro genérico.
 */
export function sanitizePayerAddress(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const address: Record<string, string> = {};

  for (const field of ADDRESS_FIELDS) {
    const value = String(src[field] ?? '').trim();
    if (!value) return null;
    address[field] = field === 'zip_code' ? value.replace(/\D/g, '') : value;
  }
  if (address.zip_code.length !== 8) return null;

  const complement = String(src.complement ?? '').trim();
  if (complement) address.complement = complement;
  return address;
}

/**
 * Número de parcelas efetivo. Débito e boleto/Pix são sempre à vista;
 * crédito é limitado ao máximo configurado pelo admin.
 */
export function resolveInstallments(
  method: SelectedMethod,
  requested: unknown,
  parcelasMaximas: number
): number {
  if (method !== 'credit_card') return 1;
  const n = Number(requested);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), Math.max(1, parcelasMaximas));
}
