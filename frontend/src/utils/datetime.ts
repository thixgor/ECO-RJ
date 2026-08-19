/**
 * Formatação de data/hora no fuso de Brasília (America/Sao_Paulo).
 *
 * PROBLEMA QUE ISTO RESOLVE
 * -------------------------
 * O código usava `new Date(x).toLocaleDateString('pt-BR')` sem `timeZone`, o que
 * formata no fuso do DISPOSITIVO. Duas consequências reais:
 *
 *   1. Aluno viajando (ou com o relógio do celular em outro fuso) via horários
 *      de aula ao vivo diferentes dos combinados. A plataforma é brasileira: o
 *      horário exibido tem de ser sempre o de Brasília.
 *   2. Datas puras (`<input type="date">` → `2026-08-19T00:00:00.000Z`) eram
 *      convertidas para 21h do dia anterior e a tela mostrava **18/08** onde o
 *      administrador havia digitado **19/08**.
 *
 * Regra: instantes (com hora) são exibidos no fuso de Brasília; datas puras são
 * exibidas pelo dia de calendário que representam.
 */

export const TIMEZONE_BR = 'America/Sao_Paulo';

const paraData = (valor: Date | string | number | null | undefined): Date | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return isNaN(d.getTime()) ? null : d;
};

/** Data pura = meia-noite UTC, ou seja, um dia de calendário sem hora. */
const ehDataPura = (d: Date): boolean =>
  d.getUTCHours() === 0 &&
  d.getUTCMinutes() === 0 &&
  d.getUTCSeconds() === 0 &&
  d.getUTCMilliseconds() === 0;

const fmt = (opcoes: Intl.DateTimeFormatOptions, utc = false) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: utc ? 'UTC' : TIMEZONE_BR, ...opcoes });

const dataCurta = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' });
const dataCurtaUTC = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }, true);
const dataHora = fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const somenteHora = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });

const cacheFormatadores = new Map<string, Intl.DateTimeFormat>();

/**
 * Formata uma data com as opções desejadas, escolhendo o fuso automaticamente:
 * Brasília para instantes, UTC para datas puras (que representam um dia de
 * calendário e não um momento).
 *
 * Use esta função no lugar de `toLocaleDateString('pt-BR', {...})`: ela preserva
 * exatamente o formato do local de chamada e resolve o fuso.
 */
export const formatarDataCom = (
  valor: Date | string | number | null | undefined,
  opcoes: Intl.DateTimeFormatOptions
): string => {
  const d = paraData(valor);
  if (!d) return '';

  // Se as opções pedem hora, o valor é um instante — nunca uma data pura.
  const pedeHora = opcoes.hour !== undefined || opcoes.minute !== undefined || opcoes.second !== undefined;
  const zona = !pedeHora && ehDataPura(d) ? 'UTC' : TIMEZONE_BR;

  const chave = zona + '|' + JSON.stringify(opcoes);
  let formatador = cacheFormatadores.get(chave);
  if (!formatador) {
    formatador = new Intl.DateTimeFormat('pt-BR', { timeZone: zona, ...opcoes });
    cacheFormatadores.set(chave, formatador);
  }
  return formatador.format(d);
};

/** `dd/mm/aaaa` — ex.: `19/08/2026`. */
export const formatarData = (valor: Date | string | number | null | undefined): string => {
  const d = paraData(valor);
  if (!d) return '';
  return ehDataPura(d) ? dataCurtaUTC.format(d) : dataCurta.format(d);
};

/** `dd/mm/aaaa HH:MM` no horário de Brasília. */
export const formatarDataHora = (valor: Date | string | number | null | undefined): string => {
  const d = paraData(valor);
  if (!d) return '';
  return dataHora.format(d).replace(', ', ' ');
};

/** `HH:MM` no horário de Brasília. */
export const formatarHora = (valor: Date | string | number | null | undefined): string => {
  const d = paraData(valor);
  return d ? somenteHora.format(d) : '';
};

/** Partes do calendário de Brasília para um instante. */
const partes = (d: Date) => {
  const mapa: Record<string, string> = {};
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_BR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  for (const p of f.formatToParts(d)) {
    if (p.type !== 'literal') mapa[p.type] = p.value;
  }
  return mapa;
};

/**
 * Converte um instante ISO no valor de um `<input type="datetime-local">`
 * já no horário de Brasília (`2026-08-19T16:00`).
 *
 * A implementação antiga fazia `new Date(d.toLocaleString('en-US', { timeZone }))`.
 * Isso depende de o motor conseguir reparsear a string localizada — e as versões
 * recentes de ICU passaram a usar espaço estreito (U+202F) antes de AM/PM, o que
 * produz `Invalid Date` em alguns navegadores. `formatToParts` não tem esse risco.
 */
export const isoParaDatetimeLocalBR = (iso: string | Date | null | undefined): string => {
  const d = paraData(iso);
  if (!d) return '';
  const p = partes(d);
  return `${p.year}-${p.month}-${p.day}T${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`;
};

/**
 * Converte o valor de um `<input type="datetime-local">` (horário de Brasília,
 * sem fuso) para o instante ISO em UTC que será gravado no banco.
 */
export const datetimeLocalBRParaISO = (valor: string): string => {
  if (!valor) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor);
  if (!m) return '';
  const [, ano, mes, dia, hora, minuto] = m;

  // Descobre o offset vigente em Brasília naquela data (hoje sempre -03:00, mas
  // calculado para sobreviver a um eventual retorno do horário de verão).
  const palpite = Date.UTC(+ano, +mes - 1, +dia, +hora, +minuto);
  const p = partes(new Date(palpite));
  const relogioBR = Date.UTC(+p.year, +p.month - 1, +p.day, Number(p.hour) % 24, +p.minute);
  const offsetMs = relogioBR - palpite;

  return new Date(palpite - offsetMs).toISOString();
};

/** Hoje em Brasília no formato `aaaa-mm-dd`, para o atributo `min` de inputs. */
export const hojeISOBR = (): string => {
  const p = partes(new Date());
  return `${p.year}-${p.month}-${p.day}`;
};
