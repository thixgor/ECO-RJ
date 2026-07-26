/**
 * Formatação de preços da plataforma.
 *
 * Preço 0 é um estado legítimo: significa que o curso/material é GRATUITO e o
 * usuário pode aderir sem pagar. Em vez de mostrar "R$ 0,00" (que parece um
 * erro de cadastro), exibimos "Gratuito".
 */

/** Formata um valor em reais. Ex.: 149.9 → "R$ 149,90". */
export const brl = (valor: number): string =>
  `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;

/** true quando o valor representa um item gratuito. */
export const isGratuito = (valor?: number | null): boolean => !(Number(valor) > 0);

/** Formata um preço, usando "Gratuito" quando o valor é 0. */
export const formatPreco = (valor?: number | null, rotuloGratuito = 'Gratuito'): string =>
  isGratuito(valor) ? rotuloGratuito : brl(Number(valor));
