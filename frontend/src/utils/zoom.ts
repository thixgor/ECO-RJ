/**
 * Meeting ID do Zoom a partir do que o admin digita ou cola: aceita o número
 * (com espaços/hífens) ou o link do convite. Espelha backend/src/utils/zoom.ts.
 */
export function extrairMeetingId(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;
  const doLink = texto.match(/(?:\/(?:j|s|w|wc(?:\/join)?)\/|confno=)(\d{9,11})/i);
  const digitos = doLink ? doLink[1] : texto.replace(/[\s\-.]/g, '');
  return /^\d{9,11}$/.test(digitos) ? digitos : null;
}

/** Parece um link (e não só o número)? */
export const pareceLinkZoom = (valor: string) => /zoom\.(us|com)|https?:\/\//i.test(valor);

/** Formato usado pelo próprio Zoom: 123 456 789 · 123 456 7890 · 123 4567 8901 */
export function formatarMeetingId(digitos: string): string {
  if (digitos.length === 11) return `${digitos.slice(0, 3)} ${digitos.slice(3, 7)} ${digitos.slice(7)}`;
  if (digitos.length === 10) return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
}
