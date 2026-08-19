/**
 * Utilidades de data/hora no fuso de Brasília (America/Sao_Paulo).
 *
 * PROBLEMA QUE ISTO RESOLVE
 * -------------------------
 * O backend roda na Vercel, cujo processo tem TZ=UTC. Todo
 * `new Date().getFullYear()`, `toLocaleDateString('pt-BR')` etc. executado no
 * servidor usava, portanto, o **horário de Londres**, não o de Brasília. Efeitos
 * reais que isso causava:
 *
 *   - Uma compra feita às 21h30 de 10/03 gerava o pedido `ECO-PED-20260311-...`
 *     e o comprovante por e-mail dizia "11/03" — um dia à frente.
 *   - Chaves geradas em 31/01 às 22h recebiam o prefixo `ECO-202602-`.
 *   - Um curso com "Data de Término = 19/08" (campo `<input type="date">`, que
 *     chega como `2026-08-19T00:00:00Z`) tinha o acesso cortado às **21h do dia
 *     18/08** — quase um dia antes do combinado com o aluno.
 *
 * Regra adotada: datas SEM hora (término de curso, limite de inscrição,
 * expiração de aviso) valem até o FIM do dia em Brasília. Datas COM hora (aula
 * ao vivo) continuam sendo instantes exatos.
 */

export const TIMEZONE_BR = 'America/Sao_Paulo';

/** Partes de uma data já convertidas para o fuso de Brasília. */
export interface PartesDataBR {
  ano: number;
  mes: number; // 1-12
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

const formatadorPartes = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_BR,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIMEZONE_BR,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIMEZONE_BR,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const paraData = (valor: Date | string | number | null | undefined): Date | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Um campo `<input type="date">` ("2026-08-19") vira `2026-08-19T00:00:00.000Z`.
 * Esse valor representa um DIA DO CALENDÁRIO, não um instante: convertê-lo para
 * Brasília o jogaria para 21h do dia 18 e a tela mostraria a data errada.
 */
const ehDataPura = (d: Date): boolean =>
  d.getUTCHours() === 0 &&
  d.getUTCMinutes() === 0 &&
  d.getUTCSeconds() === 0 &&
  d.getUTCMilliseconds() === 0;

/** Decompõe um instante nas suas partes de calendário em Brasília. */
export const partesBR = (valor: Date | string | number = new Date()): PartesDataBR | null => {
  const d = paraData(valor);
  if (!d) return null;

  const mapa: Record<string, string> = {};
  for (const parte of formatadorPartes.formatToParts(d)) {
    if (parte.type !== 'literal') mapa[parte.type] = parte.value;
  }

  return {
    ano: Number(mapa.year),
    mes: Number(mapa.month),
    dia: Number(mapa.day),
    // Em `hour12: false` a meia-noite pode vir como "24" em alguns runtimes.
    hora: Number(mapa.hour) % 24,
    minuto: Number(mapa.minute),
    segundo: Number(mapa.second)
  };
};

/** `AAAAMMDD` do dia corrente em Brasília — usado em números de pedido. */
export const aaaammddBR = (valor: Date | string | number = new Date()): string => {
  const p = partesBR(valor);
  if (!p) return '';
  return `${p.ano}${String(p.mes).padStart(2, '0')}${String(p.dia).padStart(2, '0')}`;
};

/** `AAAAMM` do mês corrente em Brasília — usado no prefixo das serial keys. */
export const aaaammBR = (valor: Date | string | number = new Date()): string => {
  const p = partesBR(valor);
  if (!p) return '';
  return `${p.ano}${String(p.mes).padStart(2, '0')}`;
};

const formatadorDataUTC = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

/**
 * Data no formato brasileiro (`dd/mm/aaaa`).
 *
 * Instantes (com hora) são convertidos para o fuso de Brasília; datas puras
 * (meia-noite UTC, vindas de `<input type="date">`) são exibidas pelo dia de
 * calendário que representam — sem isso, "19/08" aparecia como "18/08".
 */
export const formatarDataBR = (valor: Date | string | number | null | undefined): string => {
  const d = paraData(valor);
  if (!d) return '';
  return ehDataPura(d) ? formatadorDataUTC.format(d) : formatadorData.format(d);
};

/** Data e hora no formato brasileiro (`dd/mm/aaaa HH:MM`), no fuso de Brasília. */
export const formatarDataHoraBR = (valor: Date | string | number | null | undefined): string => {
  const d = paraData(valor);
  return d ? formatadorDataHora.format(d).replace(', ', ' ') : '';
};

/**
 * Deslocamento (em minutos) do fuso de Brasília em relação ao UTC para um dado
 * instante. Hoje é sempre -180, mas é calculado — e não fixado em -03:00 — para
 * o dia em que o horário de verão voltar a existir.
 */
export const offsetBRMinutos = (valor: Date | string | number = new Date()): number => {
  const d = paraData(valor);
  if (!d) return -180;
  const p = partesBR(d)!;
  const comoUTC = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  // Diferença entre o relógio de parede em Brasília e o instante real.
  return Math.round((comoUTC - Math.floor(d.getTime() / 1000) * 1000) / 60000);
};

/**
 * Constrói o instante UTC correspondente a um horário de parede em Brasília.
 * Ex.: `instanteBR(2026, 8, 19, 23, 59, 59, 999)` → 2026-08-20T02:59:59.999Z
 */
export const instanteBR = (
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
  ms = 0
): Date => {
  const palpite = Date.UTC(ano, mes - 1, dia, hora, minuto, segundo, ms);
  // Aplica o offset do próprio instante (duas passadas cobrem viradas de DST).
  let resultado = new Date(palpite - offsetBRMinutos(new Date(palpite)) * 60000);
  resultado = new Date(palpite - offsetBRMinutos(resultado) * 60000);
  return resultado;
};

/**
 * Último milissegundo do dia (em Brasília) a que a data pertence.
 *
 * É o que dá sentido a "este curso vai até 19/08": o acesso só é cortado
 * às 23:59:59.999 de 19/08 no horário de Brasília, e não à meia-noite UTC.
 *
 * Datas vindas de `<input type="date">` chegam como `2026-08-19T00:00:00.000Z`
 * (meia-noite UTC). Nesse caso o dia pretendido é o próprio 19/08 — por isso a
 * conversão parte das partes de calendário **em UTC** quando o valor é uma data
 * pura, e das partes em Brasília quando há hora significativa.
 */
export const fimDoDiaBR = (valor: Date | string | number | null | undefined): Date | null => {
  const d = paraData(valor);
  if (!d) return null;

  if (ehDataPura(d)) {
    return instanteBR(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 23, 59, 59, 999);
  }

  const p = partesBR(d)!;
  return instanteBR(p.ano, p.mes, p.dia, 23, 59, 59, 999);
};

/**
 * Primeiro milissegundo do dia (em Brasília) a que a data pertence.
 * Simétrico a `fimDoDiaBR`, inclusive no tratamento de datas puras.
 */
export const inicioDoDiaBR = (valor: Date | string | number | null | undefined): Date | null => {
  const d = paraData(valor);
  if (!d) return null;

  if (ehDataPura(d)) {
    return instanteBR(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 0, 0, 0, 0);
  }

  const p = partesBR(d)!;
  return instanteBR(p.ano, p.mes, p.dia, 0, 0, 0, 0);
};

/**
 * Meia-noite **UTC** do dia de calendário que é "hoje" em Brasília.
 *
 * É a forma correta de filtrar campos de data pura (`dataTermino`,
 * `dataLimiteInscricao`, `dataExpiracao`) direto no MongoDB, já que eles são
 * gravados como meia-noite UTC do dia escolhido. Ex.: para achar os cursos já
 * encerrados basta `{ dataTermino: { $lt: meiaNoiteUTCDeHojeBR() } }` — um curso
 * que termina hoje só entra na lista amanhã, que é o comportamento esperado.
 */
export const meiaNoiteUTCDeHojeBR = (agora: Date = new Date()): Date => {
  const p = partesBR(agora)!;
  return new Date(Date.UTC(p.ano, p.mes - 1, p.dia, 0, 0, 0, 0));
};

/**
 * Intervalo `[início, fim]` do dia corrente em Brasília.
 *
 * Trabalha sempre sobre o relógio de Brasília do instante recebido — nunca pela
 * regra de "data pura" —, porque aqui o argumento é sempre um momento real.
 */
export const intervaloDoDiaBR = (valor: Date | string | number = new Date()): { inicio: Date; fim: Date } => {
  const p = partesBR(valor)!;
  const inicio = instanteBR(p.ano, p.mes, p.dia, 0, 0, 0, 0);
  return { inicio, fim: new Date(inicio.getTime() + 24 * 60 * 60 * 1000 - 1) };
};
