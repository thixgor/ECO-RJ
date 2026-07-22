import nodemailer, { Transporter } from 'nodemailer';
import EmailTemplate, { IEmailTemplate } from '../models/EmailTemplate';
import EmailLog from '../models/EmailLog';
import { IUser } from '../models/User';
import { ICourse } from '../models/Course';
import {
  DEFAULT_TEMPLATES,
  renderBaseLayout,
  EMAIL_BRAND,
  DefaultTemplateDef
} from './emailTemplates';

/* -------------------------------------------------------------------------- */
/*  Configuração / Transporte                                                 */
/* -------------------------------------------------------------------------- */

let cachedTransporter: Transporter | null = null;
let transporterResolved = false;

/**
 * Retorna true se as variáveis de ambiente de SMTP estão configuradas.
 * Sem elas, o sistema opera em modo "simulado" (registra o e-mail no histórico
 * mas não envia de fato), garantindo que a plataforma nunca quebre.
 */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

function getTransporter(): Transporter | null {
  if (transporterResolved) return cachedTransporter;
  transporterResolved = true;

  if (!isEmailConfigured()) {
    cachedTransporter = null;
    return null;
  }

  try {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      // secure=true para porta 465 (SSL), false para 587 (STARTTLS)
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } catch (error) {
    console.error('[email] Falha ao criar transporter SMTP:', error);
    cachedTransporter = null;
  }

  return cachedTransporter;
}

function getFrom(): string {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || EMAIL_BRAND.email;
  const fromName = process.env.EMAIL_FROM_NAME || EMAIL_BRAND.nomeCurto;
  return `"${fromName}" <${fromEmail}>`;
}

/** URL base da plataforma para montar links dos e-mails. */
export function getAppUrl(): string {
  const url = process.env.APP_URL || process.env.FRONTEND_URL || EMAIL_BRAND.site;
  return url.replace(/\/+$/, '');
}

/* -------------------------------------------------------------------------- */
/*  Renderização de variáveis                                                 */
/* -------------------------------------------------------------------------- */

/** Escapa caracteres HTML para evitar injeção via valores de variáveis. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Substitui tokens {{chave}} pelos valores fornecidos.
 * Todos os valores são escapados (segurança) e quebras de linha viram <br>.
 * Tokens sem valor correspondente são removidos.
 */
export function renderString(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const raw = vars[key];
    if (raw === undefined || raw === null || raw === '') return '';
    return escapeHtml(String(raw)).replace(/\r?\n/g, '<br>');
  });
}

/** Renderiza um assunto: substitui variáveis e remove qualquer HTML/quebra. */
export function renderSubject(template: string, vars: Record<string, string | number | undefined>): string {
  const withVars = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const raw = vars[key];
    return raw === undefined || raw === null ? '' : String(raw);
  });
  return withVars.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Formata uma data para pt-BR (dd/mm/aaaa). Retorna fallback se inválida. */
export function formatDate(date?: Date | string | null, fallback = 'A definir'): string {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Formata data e hora para pt-BR. */
export function formatDateTime(date?: Date | string | null, fallback = '-'): string {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/* -------------------------------------------------------------------------- */
/*  Gerenciamento de templates                                                */
/* -------------------------------------------------------------------------- */

/**
 * Garante que todos os templates padrão existem no banco (idempotente).
 * Cria os que faltam sem sobrescrever os já editados pelo admin.
 */
export async function ensureTemplatesSeeded(): Promise<void> {
  for (const def of DEFAULT_TEMPLATES) {
    const exists = await EmailTemplate.findOne({ key: def.key });
    if (!exists) {
      await EmailTemplate.create(def);
    }
  }
}

/** Busca um template pelo key; se não existir no banco, usa o padrão em memória. */
export async function getTemplate(key: string): Promise<IEmailTemplate | DefaultTemplateDef | null> {
  const fromDb = await EmailTemplate.findOne({ key });
  if (fromDb) return fromDb;
  return DEFAULT_TEMPLATES.find((t) => t.key === key) || null;
}

/* -------------------------------------------------------------------------- */
/*  Envio                                                                      */
/* -------------------------------------------------------------------------- */

export interface SendRawParams {
  to: string;
  subject: string;
  html: string;
  categoria?: 'sistema' | 'manual';
  templateKey?: string;
  nomeDestinatario?: string;
  destinatario?: any; // ObjectId
  cursoRelacionado?: any; // ObjectId
  enviadoPor?: any; // ObjectId
  loteId?: string;
}

export interface SendResult {
  status: 'enviado' | 'falhou' | 'simulado';
  erro?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Envia (ou simula) um e-mail já renderizado e registra no histórico (EmailLog).
 * Nunca lança exceção — sempre retorna um resultado, para não quebrar o fluxo
 * de quem chamou (ex.: cadastro de usuário).
 */
export async function sendRawEmail(params: SendRawParams): Promise<SendResult> {
  const {
    to, subject, html,
    categoria = 'manual', templateKey, nomeDestinatario,
    destinatario, cursoRelacionado, enviadoPor, loteId
  } = params;

  const baseLog = {
    para: (to || '').toLowerCase().trim(),
    nomeDestinatario,
    assunto: subject,
    templateKey,
    categoria,
    destinatario,
    cursoRelacionado,
    enviadoPor,
    loteId
  };

  // Validação básica do destinatário
  if (!to || !EMAIL_REGEX.test(to)) {
    await safeLog({ ...baseLog, status: 'falhou', erro: 'Endereço de e-mail inválido' });
    return { status: 'falhou', erro: 'Endereço de e-mail inválido' };
  }

  const transporter = getTransporter();

  // Modo simulado: SMTP não configurado
  if (!transporter) {
    await safeLog({ ...baseLog, status: 'simulado' });
    console.info(`[email:simulado] Para: ${to} | Assunto: ${subject}`);
    return { status: 'simulado' };
  }

  try {
    await transporter.sendMail({
      from: getFrom(),
      to,
      subject,
      html
    });
    await safeLog({ ...baseLog, status: 'enviado' });
    return { status: 'enviado' };
  } catch (error: any) {
    const erro = error?.message || 'Erro desconhecido ao enviar e-mail';
    console.error(`[email:falhou] Para: ${to} | ${erro}`);
    await safeLog({ ...baseLog, status: 'falhou', erro });
    return { status: 'falhou', erro };
  }
}

/** Registra no EmailLog sem nunca lançar erro. */
async function safeLog(data: any): Promise<void> {
  try {
    await EmailLog.create(data);
  } catch (error) {
    console.error('[email] Falha ao registrar log de e-mail:', error);
  }
}

export interface SendTemplateParams {
  templateKey: string;
  to: string;
  nomeDestinatario?: string;
  vars: Record<string, string | number | undefined>;
  categoria?: 'sistema' | 'manual';
  destinatario?: any;
  cursoRelacionado?: any;
  enviadoPor?: any;
  loteId?: string;
  preheader?: string;
  /** Assunto customizado (sobrescreve o do template). */
  assuntoOverride?: string;
  /** Corpo customizado (sobrescreve o do template, apenas o miolo). */
  corpoOverride?: string;
}

/**
 * Renderiza um template (do banco ou padrão), aplica o layout e envia.
 */
export async function sendTemplateEmail(params: SendTemplateParams): Promise<SendResult> {
  const template = await getTemplate(params.templateKey);

  const assuntoRaw = params.assuntoOverride ?? template?.assunto ?? '';
  const corpoRaw = params.corpoOverride ?? template?.corpoHtml ?? '';

  // Template de sistema desativado: não dispara (respeita a preferência do admin)
  if (
    template &&
    'ativo' in template &&
    template.categoria === 'sistema' &&
    (template as IEmailTemplate).ativo === false &&
    params.assuntoOverride === undefined
  ) {
    return { status: 'simulado', erro: 'Template de sistema desativado' };
  }

  const subject = renderSubject(assuntoRaw, params.vars);
  const inner = renderString(corpoRaw, params.vars);
  const html = renderBaseLayout(inner, { preheader: params.preheader });

  return sendRawEmail({
    to: params.to,
    subject,
    html,
    categoria: params.categoria || (template?.categoria === 'sistema' ? 'sistema' : 'manual'),
    templateKey: params.templateKey,
    nomeDestinatario: params.nomeDestinatario,
    destinatario: params.destinatario,
    cursoRelacionado: params.cursoRelacionado,
    enviadoPor: params.enviadoPor,
    loteId: params.loteId
  });
}

/* -------------------------------------------------------------------------- */
/*  Helpers de alto nível (e-mails automáticos do sistema)                    */
/* -------------------------------------------------------------------------- */

/** Boas-vindas após cadastro. Não bloqueia nem lança — dispara em background. */
export function sendWelcomeEmailAsync(user: Pick<IUser, '_id' | 'email' | 'nomeCompleto' | 'cargo'>): void {
  void sendTemplateEmail({
    templateKey: 'boas_vindas',
    to: user.email,
    nomeDestinatario: user.nomeCompleto,
    destinatario: user._id,
    categoria: 'sistema',
    vars: {
      nome: user.nomeCompleto?.split(' ')[0] || user.nomeCompleto,
      email: user.email,
      cargo: user.cargo,
      linkPlataforma: `${getAppUrl()}/dashboard`
    }
  }).catch((err) => console.error('[email] boas_vindas:', err));
}

export interface PaymentInfo {
  valor?: string;
  metodoPagamento?: string;
  idTransacao?: string;
  dataPagamento?: Date | string;
  duracao?: string;
}

/**
 * Confirmação de compra de curso (comprovante).
 * Placeholder: os dados de pagamento são fornecidos por quem chama, já que a
 * integração com o Mercado Pago ainda não existe.
 */
export async function sendCoursePurchaseEmail(
  user: Pick<IUser, '_id' | 'email' | 'nomeCompleto'>,
  course: Pick<ICourse, '_id' | 'titulo' | 'descricao' | 'dataInicio'> & { dataTermino?: Date },
  payment: PaymentInfo = {},
  enviadoPor?: any
): Promise<SendResult> {
  return sendTemplateEmail({
    templateKey: 'compra_curso',
    to: user.email,
    nomeDestinatario: user.nomeCompleto,
    destinatario: user._id,
    cursoRelacionado: course._id,
    categoria: 'sistema',
    enviadoPor,
    vars: {
      nome: user.nomeCompleto?.split(' ')[0] || user.nomeCompleto,
      curso: course.titulo,
      descricaoCurso: course.descricao,
      dataInicio: formatDate(course.dataInicio),
      dataTermino: formatDate((course as any).dataTermino, 'Sem data definida'),
      duracao: payment.duracao || 'Conforme cronograma do curso',
      valor: payment.valor || 'R$ 0,00 (cortesia)',
      metodoPagamento: payment.metodoPagamento || 'Mercado Pago (pendente de integração)',
      idTransacao: payment.idTransacao || `ECO-${Date.now().toString(36).toUpperCase()}`,
      dataPagamento: formatDateTime(payment.dataPagamento || new Date()),
      linkCurso: `${getAppUrl()}/cursos/${course._id}`
    }
  });
}

/**
 * E-mail de término de curso, com deduplicação: não envia duas vezes para o
 * mesmo usuário/curso.
 */
export async function sendCourseCompletionEmail(
  user: Pick<IUser, '_id' | 'email' | 'nomeCompleto'>,
  course: Pick<ICourse, '_id' | 'titulo' | 'dataInicio'> & { dataTermino?: Date }
): Promise<SendResult | { status: 'ignorado' }> {
  // Deduplicação: já foi enviado (ou simulado) antes?
  const jaEnviado = await EmailLog.findOne({
    destinatario: user._id,
    cursoRelacionado: course._id,
    templateKey: 'termino_curso',
    status: { $in: ['enviado', 'simulado'] }
  });
  if (jaEnviado) return { status: 'ignorado' };

  return sendTemplateEmail({
    templateKey: 'termino_curso',
    to: user.email,
    nomeDestinatario: user.nomeCompleto,
    destinatario: user._id,
    cursoRelacionado: course._id,
    categoria: 'sistema',
    vars: {
      nome: user.nomeCompleto?.split(' ')[0] || user.nomeCompleto,
      curso: course.titulo,
      dataInicio: formatDate(course.dataInicio),
      dataTermino: formatDate((course as any).dataTermino),
      linkCertificado: `${getAppUrl()}/perfil`,
      linkPlataforma: `${getAppUrl()}/dashboard`
    }
  });
}
