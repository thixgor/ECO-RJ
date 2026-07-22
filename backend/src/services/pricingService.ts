import { ICourse } from '../models/Course';
import { ICoupon } from '../models/Coupon';
import { IPriceLot } from '../models/PriceLot';
import PriceLot from '../models/PriceLot';
import Coupon from '../models/Coupon';
import { IOrderValores } from '../models/Order';
import { IMaterial } from '../models/Material';

/** Arredonda para 2 casas decimais evitando erros de ponto flutuante. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Busca o lote ativo vigente de um curso (menor ordem, ainda com vagas).
 * Retorna null se não houver lote aplicável.
 */
export async function getActiveLot(cursoId: string): Promise<IPriceLot | null> {
  const lotes = await PriceLot.find({ curso: cursoId, ativo: true }).sort({ ordem: 1, createdAt: 1 });
  for (const lote of lotes) {
    if (lote.quantidadeTotal === 0 || lote.quantidadeVendida < lote.quantidadeTotal) {
      return lote;
    }
  }
  return null;
}

export interface CouponValidationResult {
  valido: boolean;
  motivo?: string;
  coupon?: ICoupon;
}

/**
 * Valida um cupom para um curso/email/valor específicos.
 * subtotalAntesCupom é o valor do produto após lote e desconto ativado.
 */
export async function validateCoupon(
  codigo: string,
  cursoId: string,
  email: string,
  subtotalAntesCupom: number
): Promise<CouponValidationResult> {
  if (!codigo) return { valido: false, motivo: 'Cupom não informado' };

  const coupon = await Coupon.findOne({ codigo: codigo.toUpperCase().trim() });
  if (!coupon) return { valido: false, motivo: 'Cupom inválido' };
  if (!coupon.ativo) return { valido: false, motivo: 'Cupom inativo' };

  const agora = new Date();
  if (coupon.dataInicio && coupon.dataInicio > agora) {
    return { valido: false, motivo: 'Cupom ainda não está válido' };
  }
  if (coupon.dataValidade && coupon.dataValidade < agora) {
    return { valido: false, motivo: 'Cupom expirado' };
  }
  if (coupon.usosMaximos > 0 && coupon.usosAtuais >= coupon.usosMaximos) {
    return { valido: false, motivo: 'Cupom esgotado' };
  }
  if (coupon.valorMinimoCompra > 0 && subtotalAntesCupom < coupon.valorMinimoCompra) {
    return {
      valido: false,
      motivo: `Cupom válido apenas para compras acima de R$ ${coupon.valorMinimoCompra.toFixed(2)}`
    };
  }
  if (coupon.cursosAplicaveis && coupon.cursosAplicaveis.length > 0) {
    const aplicavel = coupon.cursosAplicaveis.some((c) => c.toString() === cursoId.toString());
    if (!aplicavel) return { valido: false, motivo: 'Cupom não válido para este curso' };
  }
  if (coupon.usosPorEmail > 0 && email) {
    const usosEmail = coupon.emailsQueUsaram.filter((e) => e === email.toLowerCase().trim()).length;
    if (usosEmail >= coupon.usosPorEmail) {
      return { valido: false, motivo: 'Você já utilizou este cupom' };
    }
  }

  return { valido: true, coupon };
}

export interface PricingBreakdown extends IOrderValores {
  loteId?: string;
  loteNome?: string;
  cupomCodigo?: string;
}

/**
 * Calcula o detalhamento de preços de forma DETERMINÍSTICA a partir dos dados do
 * servidor. NUNCA confie em valores enviados pelo cliente — sempre recalcule aqui.
 *
 * Ordem de aplicação:
 *   1. Preço base do curso
 *   2. Lote ativo (substitui o preço base, se houver e for menor)
 *   3. Desconto ativado do curso (percentual ou fixo)
 *   4. Cupom (percentual ou fixo)
 *   5. Taxa operacional (% sobre o subtotal)
 */
export function computePricing(
  course: ICourse,
  lot: IPriceLot | null,
  coupon: ICoupon | null,
  taxaOperacionalPercentual: number
): PricingBreakdown {
  const precoBase = round2(Math.max(0, course.venda?.preco || 0));

  // 1) Lote: usa o menor entre preço base e preço do lote
  let precoAposLote = precoBase;
  let descontoLote = 0;
  if (lot && lot.preco < precoBase) {
    precoAposLote = round2(lot.preco);
    descontoLote = round2(precoBase - precoAposLote);
  }

  // 2) Desconto ativado do curso
  let descontoAtivado = 0;
  const da = course.venda?.descontoAtivado;
  if (da && da.ativo && da.valor > 0) {
    if (da.tipo === 'percentual') {
      descontoAtivado = round2(precoAposLote * (Math.min(da.valor, 100) / 100));
    } else {
      descontoAtivado = round2(Math.min(da.valor, precoAposLote));
    }
  }
  let precoAposDesconto = round2(Math.max(0, precoAposLote - descontoAtivado));

  // 3) Cupom
  let descontoCupom = 0;
  if (coupon) {
    if (coupon.tipo === 'percentual') {
      descontoCupom = round2(precoAposDesconto * (Math.min(coupon.valor, 100) / 100));
    } else {
      descontoCupom = round2(Math.min(coupon.valor, precoAposDesconto));
    }
  }
  const subtotal = round2(Math.max(0, precoAposDesconto - descontoCupom));

  // 4) Taxa operacional
  const taxaPct = Math.max(0, taxaOperacionalPercentual || 0);
  const taxaOperacional = round2(subtotal * (taxaPct / 100));
  const total = round2(subtotal + taxaOperacional);

  return {
    precoBase,
    descontoLote,
    descontoAtivado,
    descontoCupom,
    subtotal,
    taxaOperacionalPercentual: taxaPct,
    taxaOperacional,
    total,
    loteId: lot ? (lot._id as any).toString() : undefined,
    loteNome: lot ? lot.nome : undefined,
    cupomCodigo: coupon ? coupon.codigo : undefined
  };
}

/**
 * Valida um cupom para um MATERIAL. Materiais aceitam apenas cupons GLOBAIS
 * (sem restrição de curso). Cupons restritos a cursos específicos não se
 * aplicam à loja de materiais.
 */
export async function validateCouponForMaterial(
  codigo: string,
  email: string,
  subtotalAntesCupom: number
): Promise<CouponValidationResult> {
  if (!codigo) return { valido: false, motivo: 'Cupom não informado' };

  const coupon = await Coupon.findOne({ codigo: codigo.toUpperCase().trim() });
  if (!coupon) return { valido: false, motivo: 'Cupom inválido' };
  if (!coupon.ativo) return { valido: false, motivo: 'Cupom inativo' };
  if (coupon.cursosAplicaveis && coupon.cursosAplicaveis.length > 0) {
    return { valido: false, motivo: 'Cupom não válido para materiais' };
  }

  const agora = new Date();
  if (coupon.dataInicio && coupon.dataInicio > agora) {
    return { valido: false, motivo: 'Cupom ainda não está válido' };
  }
  if (coupon.dataValidade && coupon.dataValidade < agora) {
    return { valido: false, motivo: 'Cupom expirado' };
  }
  if (coupon.usosMaximos > 0 && coupon.usosAtuais >= coupon.usosMaximos) {
    return { valido: false, motivo: 'Cupom esgotado' };
  }
  if (coupon.valorMinimoCompra > 0 && subtotalAntesCupom < coupon.valorMinimoCompra) {
    return {
      valido: false,
      motivo: `Cupom válido apenas para compras acima de R$ ${coupon.valorMinimoCompra.toFixed(2)}`
    };
  }
  if (coupon.usosPorEmail > 0 && email) {
    const usosEmail = coupon.emailsQueUsaram.filter((e) => e === email.toLowerCase().trim()).length;
    if (usosEmail >= coupon.usosPorEmail) {
      return { valido: false, motivo: 'Você já utilizou este cupom' };
    }
  }

  return { valido: true, coupon };
}

/**
 * Calcula o detalhamento de preços de um MATERIAL de forma determinística.
 * NUNCA confie em valores enviados pelo cliente — sempre recalcule aqui.
 *
 * Ordem de aplicação (materiais não possuem lotes):
 *   1. Preço base do material
 *   2. Desconto ativado (percentual ou fixo)
 *   3. Cupom (percentual ou fixo)
 *   4. Taxa operacional (% sobre o subtotal)
 */
export function computeMaterialPricing(
  material: IMaterial,
  coupon: ICoupon | null,
  taxaOperacionalPercentual: number
): PricingBreakdown {
  const precoBase = round2(Math.max(0, material.preco || 0));

  // 1) Desconto ativado
  let descontoAtivado = 0;
  const da = material.descontoAtivado;
  if (da && da.ativo && da.valor > 0) {
    if (da.tipo === 'percentual') {
      descontoAtivado = round2(precoBase * (Math.min(da.valor, 100) / 100));
    } else {
      descontoAtivado = round2(Math.min(da.valor, precoBase));
    }
  }
  const precoAposDesconto = round2(Math.max(0, precoBase - descontoAtivado));

  // 2) Cupom
  let descontoCupom = 0;
  if (coupon) {
    if (coupon.tipo === 'percentual') {
      descontoCupom = round2(precoAposDesconto * (Math.min(coupon.valor, 100) / 100));
    } else {
      descontoCupom = round2(Math.min(coupon.valor, precoAposDesconto));
    }
  }
  const subtotal = round2(Math.max(0, precoAposDesconto - descontoCupom));

  // 3) Taxa operacional
  const taxaPct = Math.max(0, taxaOperacionalPercentual || 0);
  const taxaOperacional = round2(subtotal * (taxaPct / 100));
  const total = round2(subtotal + taxaOperacional);

  return {
    precoBase,
    descontoLote: 0,
    descontoAtivado,
    descontoCupom,
    subtotal,
    taxaOperacionalPercentual: taxaPct,
    taxaOperacional,
    total,
    cupomCodigo: coupon ? coupon.codigo : undefined
  };
}
