import nodemailer, { Transporter } from 'nodemailer';
import { IOrder } from '../models/Order';
import { IMaterialOrder } from '../models/MaterialOrder';

/**
 * Serviço de e-mail transacional.
 *
 * Configuração via variáveis de ambiente (SMTP):
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false), SMTP_USER, SMTP_PASS
 *   SMTP_FROM (ex: "ECO RJ <contato@cursodeecocardiografia.com>")
 *
 * Se o SMTP não estiver configurado, os e-mails são apenas logados (degradação
 * graciosa) — a compra continua sendo processada normalmente.
 */

let transporter: Transporter | null = null;

/**
 * Tempo máximo esperando o SMTP. Em ambiente serverless uma conexão pendurada
 * consome todo o tempo da função e a requisição morre no meio — no fluxo de
 * compra isso deixava o pedido marcado como entregue e o e-mail nunca saía.
 *
 * Padrão de 8s (não 15s): o plano Hobby da Vercel mata a função em 10s. Um
 * timeout interno MAIOR que o limite da plataforma nunca chega a rodar — a
 * Vercel encerra a função primeiro, com um erro genérico da plataforma em vez
 * da resposta 503 tratada. 8s deixa margem para as consultas ao banco que
 * acontecem antes do envio (rate limit, busca do usuário, etc.). Em um plano
 * com `functions.maxDuration` maior, ajuste esta variável junto.
 */
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 8000);

/**
 * Escapa texto que veio do usuário antes de entrar no HTML do e-mail.
 * Nome, e-mail e título de curso são digitados por pessoas: sem escapar, um
 * `<` no meio do nome quebra o layout do e-mail (e, no limite, permite injetar
 * marcação no corpo da mensagem).
 */
export function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapa um valor que será usado dentro de um atributo href. */
function escUrl(valor: unknown): string {
  const url = String(valor ?? '');
  // Só permitimos links http(s) gerados pela própria aplicação.
  if (!/^https?:\/\//i.test(url)) return '#';
  return esc(url);
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Sem estes limites o envio pode ficar pendurado até o timeout da função.
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS
  });
  return transporter;
}

function getFrom(): string {
  return process.env.SMTP_FROM || 'ECO RJ <contato@cursodeecocardiografia.com>';
}

export interface MailAttachment {
  filename: string;
  path?: string;    // caminho local ou URL (nodemailer busca automaticamente)
  href?: string;    // URL explícita
  content?: Buffer | string;
  contentType?: string;
}

/** Falha o envio se o SMTP não responder dentro do tempo limite. */
function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Tempo esgotado ao enviar e-mail (${ms}ms)`)),
      ms
    );
    promessa.then(
      (valor) => { clearTimeout(timer); resolve(valor); },
      (erro) => { clearTimeout(timer); reject(erro); }
    );
  });
}

/**
 * Envia um e-mail. Retorna `false` (sem lançar) quando o SMTP não está
 * configurado ou o envio falha — quem chama decide o que fazer, e nenhuma
 * entrega de produto pode depender disso.
 *
 * `ultimoErroEnvio` guarda o motivo da última falha para o chamador registrar
 * no pedido (o admin precisa saber POR QUE o e-mail não saiu).
 */
export let ultimoErroEnvio: string | undefined;

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[]
): Promise<boolean> {
  ultimoErroEnvio = undefined;
  const t = getTransporter();
  if (!t) {
    ultimoErroEnvio = 'SMTP não configurado no servidor';
    console.log(`[EMAIL:SIMULADO] Para: ${to} | Assunto: ${subject}${attachments?.length ? ` | Anexos: ${attachments.length}` : ''}`);
    return false;
  }
  try {
    await comTimeout(
      t.sendMail({
        from: getFrom(),
        to,
        subject,
        html,
        attachments: attachments && attachments.length ? attachments : undefined
      }),
      SMTP_TIMEOUT_MS
    );
    return true;
  } catch (err: any) {
    ultimoErroEnvio = String(err?.message || err).substring(0, 500);
    console.error('Erro ao enviar e-mail:', err);
    return false;
  }
}

function brl(v: number): string {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

function maskCpf(cpf: string): string {
  const d = (cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return '***';
  return `***.${d.substring(3, 6)}.${d.substring(6, 9)}-**`;
}

/** Gera o HTML do comprovante/recibo de compra. */
export interface PurchaseEmailOpts {
  serialKeyCodigo?: string;
  activationLink?: string;
  isGuest: boolean;
  /** Comprou deslogado e escolheu liberar o acesso na conta que já existia. */
  vinculadoAContaExistente?: boolean;
  loginLink?: string;
}

export function buildReceiptHtml(order: IOrder, opts: PurchaseEmailOpts): string {
  const v = order.valores;
  const linhasDesconto: string[] = [];
  if (v.descontoLote > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Desconto (lote)</td><td align="right" style="color:#059669;">- ${brl(v.descontoLote)}</td></tr>`);
  if (v.descontoAtivado > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Desconto promocional</td><td align="right" style="color:#059669;">- ${brl(v.descontoAtivado)}</td></tr>`);
  if (v.descontoCupom > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Cupom ${esc(order.cupomAplicado?.codigo || '')}</td><td align="right" style="color:#059669;">- ${brl(v.descontoCupom)}</td></tr>`);

  // Três cenários de entrega:
  //  1. Convidado          -> recebe a chave + link de ativação;
  //  2. Comprou logado     -> acesso já liberado, nada a fazer;
  //  3. Comprou deslogado, mas pediu para vincular à conta que já existia com
  //     aquele e-mail -> acesso já liberado, basta entrar na conta.
  const ativacaoBloco = opts.isGuest
    ? (opts.serialKeyCodigo ? `
      <div style="margin:24px 0;padding:20px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1E3A8A;">🔑 Sua chave de ativação (serial key)</p>
        <p style="margin:0 0 12px;font-size:22px;font-weight:bold;letter-spacing:1px;color:#1D4ED8;font-family:monospace;">${esc(opts.serialKeyCodigo)}</p>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          Para acessar seu curso, crie sua conta (ou faça login) e ative sua chave.
          Você pode ativar automaticamente pelo botão abaixo:
        </p>
        <a href="${escUrl(opts.activationLink)}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Ativar meu curso</a>
      </div>` : '')
    : `
      <div style="margin:24px 0;padding:20px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#065F46;">✅ Acesso liberado na sua conta</p>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          ${opts.vinculadoAContaExistente
            ? `Como você já tinha uma conta com o e-mail <strong>${esc(order.compradorDados.email)}</strong>, liberamos o curso diretamente nela — não é preciso usar nenhuma chave. Basta entrar com a sua senha de sempre.`
            : 'O acesso já foi liberado automaticamente na sua conta. Bons estudos!'}
        </p>
        ${opts.loginLink ? `<a href="${escUrl(opts.loginLink)}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Entrar na plataforma</a>` : ''}
      </div>`;

  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E0F2FE;">
      <h1 style="margin:0;color:#1D4ED8;font-size:24px;">ECO RJ</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Centro de Treinamento em Ecocardiografia</p>
    </div>

    <div style="padding:24px 0;">
      <h2 style="font-size:20px;margin:0 0 4px;">Comprovante de Compra</h2>
      <p style="color:#64748b;margin:0 0 16px;">Pedido <strong>${esc(order.numeroPedido)}</strong></p>

      ${order.status === 'aprovado'
        ? '<p style="display:inline-block;padding:6px 14px;background:#DCFCE7;color:#166534;border-radius:999px;font-weight:bold;font-size:13px;">✔ Pagamento aprovado</p>'
        : '<p style="display:inline-block;padding:6px 14px;background:#FEF9C3;color:#854D0E;border-radius:999px;font-weight:bold;font-size:13px;">Aguardando confirmação</p>'}

      ${ativacaoBloco}

      <h3 style="font-size:16px;margin:24px 0 8px;">Detalhes</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 0;color:#64748b;">Curso</td><td align="right"><strong>${esc(order.cursoTitulo)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Comprador</td><td align="right">${esc(order.compradorDados.nome)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">E-mail</td><td align="right">${esc(order.compradorDados.email)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">CPF</td><td align="right">${maskCpf(order.compradorDados.cpf)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Data</td><td align="right">${new Date(order.createdAt).toLocaleString('pt-BR')}</td></tr>
        ${order.metodoPagamento ? `<tr><td style="padding:4px 0;color:#64748b;">Método</td><td align="right">${esc(order.metodoPagamento)}</td></tr>` : ''}
      </table>

      <h3 style="font-size:16px;margin:24px 0 8px;">Valores</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 0;color:#64748b;">Preço do curso</td><td align="right">${brl(v.precoBase)}</td></tr>
        ${linhasDesconto.join('')}
        <tr><td style="padding:4px 0;color:#64748b;">Subtotal</td><td align="right">${brl(v.subtotal)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Taxa operacional (${v.taxaOperacionalPercentual}%)</td><td align="right">${brl(v.taxaOperacional)}</td></tr>
        <tr><td style="padding:12px 0 0;font-weight:bold;font-size:16px;border-top:1px solid #e2e8f0;">Total</td><td align="right" style="padding:12px 0 0;font-weight:bold;font-size:16px;border-top:1px solid #e2e8f0;color:#1D4ED8;">${brl(v.total)}</td></tr>
      </table>
    </div>

    <div style="padding:20px 0;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      <p style="margin:0 0 4px;">ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70</p>
      <p style="margin:0 0 4px;">Av. das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ</p>
      <p style="margin:0;">contato@cursodeecocardiografia.com</p>
    </div>
  </div>`;
}

export async function sendPurchaseEmail(
  order: IOrder,
  opts: PurchaseEmailOpts
): Promise<boolean> {
  const html = buildReceiptHtml(order, opts);
  const subject = `ECO RJ · Comprovante e acesso — Pedido ${order.numeroPedido}`;
  return sendMail(order.compradorDados.email, subject, html);
}

function fmtDate(date?: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Gera o HTML do e-mail de término (encerramento de acesso) de um curso. */
export function buildCourseEndedHtml(opts: {
  nome: string;
  cursoTitulo: string;
  dataInicio?: Date | string | null;
  dataTermino?: Date | string | null;
  linkPlataforma: string;
}): string {
  const primeiroNome = (opts.nome || '').split(' ')[0] || opts.nome || 'aluno(a)';
  const inicio = fmtDate(opts.dataInicio);
  const termino = fmtDate(opts.dataTermino);

  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E0F2FE;">
      <h1 style="margin:0;color:#1D4ED8;font-size:24px;">ECO RJ</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Centro de Treinamento em Ecocardiografia</p>
    </div>

    <div style="padding:24px 0;">
      <h2 style="font-size:20px;margin:0 0 12px;">O curso chegou ao fim 🎓</h2>
      <p style="margin:0 0 16px;font-size:15px;">Olá ${esc(primeiroNome)},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        O curso <strong>${esc(opts.cursoTitulo)}</strong> atingiu sua data de término${termino ? ` em <strong>${termino}</strong>` : ''}.
        A partir de agora, o <strong>acesso ao conteúdo deste curso foi encerrado</strong>.
      </p>

      <div style="margin:20px 0;padding:16px 20px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;font-size:14px;">
        ${inicio ? `<p style="margin:0 0 6px;"><strong>Início:</strong> ${inicio}</p>` : ''}
        ${termino ? `<p style="margin:0;"><strong>Término:</strong> ${termino}</p>` : ''}
      </div>

      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
        Agradecemos a sua participação! Caso tenha concluído as atividades, seu certificado
        pode estar disponível na plataforma. Para dúvidas ou renovação de acesso, fale conosco.
      </p>

      <a href="${escUrl(opts.linkPlataforma)}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar a plataforma</a>
    </div>

    <div style="padding:20px 0;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      <p style="margin:0 0 4px;">ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70</p>
      <p style="margin:0 0 4px;">Av. das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ</p>
      <p style="margin:0;">contato@cursodeecocardiografia.com</p>
    </div>
  </div>`;
}

/** Envia o e-mail de término/encerramento de acesso de um curso a um aluno. */
export async function sendCourseEndedEmail(opts: {
  to: string;
  nome: string;
  cursoTitulo: string;
  dataInicio?: Date | string | null;
  dataTermino?: Date | string | null;
}): Promise<boolean> {
  const linkPlataforma = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://ecorj.com').replace(/\/+$/, '') + '/dashboard';
  const html = buildCourseEndedHtml({ ...opts, linkPlataforma });
  const subject = `ECO RJ · O curso ${opts.cursoTitulo} foi encerrado`;
  return sendMail(opts.to, subject, html);
}

/* ======================================================================== */
/*  LOJA DE MATERIAIS                                                         */
/* ======================================================================== */

export interface MaterialEmailOpts {
  isGuest: boolean;
  serialKeyCodigo?: string;
  accessLink?: string;   // link de acesso do convidado (/materiais/acesso?token=...)
  materialLink?: string; // link direto ao material (/materiais/:id)
}

/** Gera o HTML do comprovante/entrega de um material comprado. */
export function buildMaterialReceiptHtml(order: IMaterialOrder, opts: MaterialEmailOpts): string {
  const v = order.valores;
  const linhasDesconto: string[] = [];
  if (v.descontoAtivado > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Desconto promocional</td><td align="right" style="color:#059669;">- ${brl(v.descontoAtivado)}</td></tr>`);
  if (v.descontoCupom > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Cupom ${esc(order.cupomAplicado?.codigo || '')}</td><td align="right" style="color:#059669;">- ${brl(v.descontoCupom)}</td></tr>`);

  const acessoBloco = opts.isGuest
    ? `
      <div style="margin:24px 0;padding:20px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1E3A8A;">🔑 Seu código de acesso</p>
        <p style="margin:0 0 12px;font-size:20px;font-weight:bold;letter-spacing:1px;color:#1D4ED8;font-family:monospace;">${esc(opts.serialKeyCodigo || '')}</p>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          Você comprou sem uma conta. Acesse seu material imediatamente pelo botão abaixo
          (guarde este e-mail). Se preferir, crie uma conta com este mesmo e-mail para ter o
          material salvo permanentemente em <strong>"Meus Materiais"</strong>.
        </p>
        <a href="${escUrl(opts.accessLink)}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar / Baixar meu material</a>
      </div>`
    : `
      <div style="margin:24px 0;padding:20px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#065F46;">✅ Material liberado na sua conta</p>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          O material já está disponível em <strong>"Meus Materiais"</strong> e na página do produto.
        </p>
        <a href="${escUrl(opts.materialLink)}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar meu material</a>
      </div>`;

  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E0F2FE;">
      <h1 style="margin:0;color:#1D4ED8;font-size:24px;">ECO RJ</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Centro de Treinamento em Ecocardiografia</p>
    </div>

    <div style="padding:24px 0;">
      <h2 style="font-size:20px;margin:0 0 4px;">Compra de Material Confirmada</h2>
      <p style="color:#64748b;margin:0 0 16px;">Pedido <strong>${esc(order.numeroPedido)}</strong></p>

      <p style="display:inline-block;padding:6px 14px;background:#DCFCE7;color:#166534;border-radius:999px;font-weight:bold;font-size:13px;">✔ Pagamento aprovado</p>

      ${acessoBloco}

      <h3 style="font-size:16px;margin:24px 0 8px;">Detalhes</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 0;color:#64748b;">Material</td><td align="right"><strong>${esc(order.materialTitulo)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Comprador</td><td align="right">${esc(order.compradorDados.nome)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">E-mail</td><td align="right">${esc(order.compradorDados.email)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">CPF</td><td align="right">${maskCpf(order.compradorDados.cpf)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Data</td><td align="right">${new Date(order.createdAt).toLocaleString('pt-BR')}</td></tr>
        ${order.metodoPagamento ? `<tr><td style="padding:4px 0;color:#64748b;">Método</td><td align="right">${esc(order.metodoPagamento)}</td></tr>` : ''}
      </table>

      <h3 style="font-size:16px;margin:24px 0 8px;">Valores</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 0;color:#64748b;">Preço do material</td><td align="right">${brl(v.precoBase)}</td></tr>
        ${linhasDesconto.join('')}
        <tr><td style="padding:4px 0;color:#64748b;">Subtotal</td><td align="right">${brl(v.subtotal)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Taxa operacional (${v.taxaOperacionalPercentual}%)</td><td align="right">${brl(v.taxaOperacional)}</td></tr>
        <tr><td style="padding:12px 0 0;font-weight:bold;font-size:16px;border-top:1px solid #e2e8f0;">Total</td><td align="right" style="padding:12px 0 0;font-weight:bold;font-size:16px;border-top:1px solid #e2e8f0;color:#1D4ED8;">${brl(v.total)}</td></tr>
      </table>

      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Este material é de uso pessoal e intransferível, protegido por direitos autorais (Lei nº 9.610/98).
        A reprodução, compartilhamento ou revenda não autorizados sujeitam o infrator às penalidades legais
        e ao bloqueio imediato do acesso, sem reembolso.
      </p>
    </div>

    <div style="padding:20px 0;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      <p style="margin:0 0 4px;">ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70</p>
      <p style="margin:0 0 4px;">Av. das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ</p>
      <p style="margin:0;">contato@cursodeecocardiografia.com</p>
    </div>
  </div>`;
}

/**
 * Envia o e-mail de entrega de um material.
 * Para convidados, anexa os PDFs do material (quando houver URL/arquivo disponível).
 */
export async function sendMaterialPurchaseEmail(
  order: IMaterialOrder,
  opts: MaterialEmailOpts,
  attachments?: MailAttachment[]
): Promise<boolean> {
  const html = buildMaterialReceiptHtml(order, opts);
  const subject = `ECO RJ · Seu material — Pedido ${order.numeroPedido}`;
  return sendMail(order.compradorDados.email, subject, html, attachments);
}

/** Gera o HTML do e-mail de acesso concedido manualmente pelo admin (cortesia). */
export function buildMaterialGrantHtml(opts: {
  nome?: string;
  materialTitulo: string;
  serialKey: string;
  accessLink: string;
  validade?: Date | string | null;
}): string {
  const primeiroNome = (opts.nome || '').split(' ')[0];
  const validade = fmtDate(opts.validade);

  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E0F2FE;">
      <h1 style="margin:0;color:#1D4ED8;font-size:24px;">ECO RJ</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Centro de Treinamento em Ecocardiografia</p>
    </div>

    <div style="padding:24px 0;">
      <h2 style="font-size:20px;margin:0 0 12px;">Você recebeu acesso a um material 🎁</h2>
      <p style="margin:0 0 16px;font-size:15px;">Olá${primeiroNome ? ` ${esc(primeiroNome)}` : ''},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Liberamos o seu acesso ao material <strong>${esc(opts.materialTitulo)}</strong>.
        Use o botão abaixo para acessar o conteúdo a qualquer momento.
      </p>

      <div style="margin:20px 0;padding:16px 20px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;font-size:14px;">
        <p style="margin:0 0 6px;"><strong>Código de acesso:</strong>
          <span style="font-family:monospace;font-size:15px;color:#1D4ED8;">${esc(opts.serialKey)}</span>
        </p>
        <p style="margin:0;color:#64748b;">
          ${validade ? `Válido até <strong>${validade}</strong>.` : 'Acesso vitalício.'}
          Guarde este código: com ele você vincula o material à sua conta na plataforma.
        </p>
      </div>

      <a href="${escUrl(opts.accessLink)}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar o material</a>

      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Este material é de uso pessoal e intransferível, protegido por direitos autorais (Lei nº 9.610/98).
        A reprodução, compartilhamento ou revenda não autorizados sujeitam o infrator às penalidades legais
        e ao bloqueio imediato do acesso.
      </p>
    </div>

    <div style="padding:20px 0;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      <p style="margin:0 0 4px;">ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70</p>
      <p style="margin:0 0 4px;">Av. das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ</p>
      <p style="margin:0;">contato@cursodeecocardiografia.com</p>
    </div>
  </div>`;
}

/** Envia o e-mail de acesso concedido manualmente (cortesia/suporte). */
export async function sendMaterialGrantEmail(opts: {
  to: string;
  nome?: string;
  materialTitulo: string;
  serialKey: string;
  accessLink: string;
  validade?: Date | string | null;
}): Promise<boolean> {
  const html = buildMaterialGrantHtml(opts);
  const subject = `ECO RJ · Seu acesso ao material ${opts.materialTitulo}`;
  return sendMail(opts.to, subject, html);
}

/* ======================================================================== */
/*  RECUPERAÇÃO DE SENHA                                                      */
/* ======================================================================== */

/** Cabeçalho/rodapé padrão dos e-mails transacionais. */
function wrapEmail(conteudo: string): string {
  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E0F2FE;">
      <h1 style="margin:0;color:#1D4ED8;font-size:24px;">ECO RJ</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Centro de Treinamento em Ecocardiografia</p>
    </div>
    <div style="padding:24px 0;">${conteudo}</div>
    <div style="padding:20px 0;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      <p style="margin:0 0 4px;">ECO RJ · Centro de Treinamento em Ecocardiografia · CNPJ: 21.847.609/0001-70</p>
      <p style="margin:0 0 4px;">Av. das Américas 19.019 - Recreio Shopping - Sala 336 - Recreio dos Bandeirantes - RJ</p>
      <p style="margin:0;">contato@cursodeecocardiografia.com</p>
    </div>
  </div>`;
}

/**
 * E-mail com o link de redefinição de senha.
 *
 * O link é o único lugar do sistema onde o token aparece em claro — no banco
 * guardamos apenas o hash. Por isso o e-mail avisa o prazo de validade e
 * orienta quem NÃO pediu a troca (sinal de tentativa de invasão).
 */
export function buildPasswordResetHtml(opts: {
  nome?: string;
  link: string;
  minutosValidade: number;
  ip?: string;
  quando?: Date;
}): string {
  const primeiroNome = (opts.nome || '').split(' ')[0];
  const quando = (opts.quando || new Date()).toLocaleString('pt-BR');
  return wrapEmail(`
      <h2 style="font-size:20px;margin:0 0 12px;">Redefinição de senha 🔐</h2>
      <p style="margin:0 0 16px;font-size:15px;">Olá${primeiroNome ? ` ${esc(primeiroNome)}` : ''},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Recebemos um pedido para redefinir a senha da sua conta ECO RJ.
        Clique no botão abaixo para criar uma senha nova. Este link vale por
        <strong>${opts.minutosValidade} minutos</strong> e só pode ser usado <strong>uma única vez</strong>.
      </p>

      <p style="margin:0 0 20px;">
        <a href="${escUrl(opts.link)}" style="display:inline-block;padding:14px 28px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Criar nova senha</a>
      </p>

      <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br>
        <span style="word-break:break-all;color:#1D4ED8;">${esc(opts.link)}</span>
      </p>

      <div style="margin:20px 0;padding:16px 20px;background:#FEF9C3;border:1px solid #FDE68A;border-radius:12px;font-size:13px;color:#854D0E;line-height:1.6;">
        <strong>Não foi você?</strong> Ignore este e-mail: sua senha atual continua valendo e
        nada foi alterado. Nenhuma outra pessoa consegue redefinir sua senha sem este link.
        <br>Pedido feito em ${esc(quando)}${opts.ip ? ` · IP ${esc(opts.ip)}` : ''}.
      </div>

      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Por segurança, a equipe ECO RJ nunca pede sua senha por e-mail, telefone ou WhatsApp.
      </p>`);
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  nome?: string;
  link: string;
  minutosValidade: number;
  ip?: string;
}): Promise<boolean> {
  const html = buildPasswordResetHtml(opts);
  return sendMail(opts.to, 'ECO RJ · Redefinição de senha', html);
}

/** Aviso de que a senha foi trocada — permite reagir rápido a um acesso indevido. */
export function buildPasswordChangedHtml(opts: { nome?: string; quando?: Date; ip?: string }): string {
  const primeiroNome = (opts.nome || '').split(' ')[0];
  const quando = (opts.quando || new Date()).toLocaleString('pt-BR');
  return wrapEmail(`
      <h2 style="font-size:20px;margin:0 0 12px;">Sua senha foi alterada ✅</h2>
      <p style="margin:0 0 16px;font-size:15px;">Olá${primeiroNome ? ` ${esc(primeiroNome)}` : ''},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        A senha da sua conta ECO RJ foi alterada em <strong>${esc(quando)}</strong>${opts.ip ? ` (IP ${esc(opts.ip)})` : ''}.
        Todas as sessões abertas com a senha anterior foram encerradas.
      </p>
      <div style="margin:20px 0;padding:16px 20px;background:#FEE2E2;border:1px solid #FECACA;border-radius:12px;font-size:14px;color:#991B1B;line-height:1.6;">
        <strong>Não foi você?</strong> Entre em contato imediatamente com
        <a href="mailto:contato@cursodeecocardiografia.com" style="color:#991B1B;">contato@cursodeecocardiografia.com</a>.
      </div>`);
}

export async function sendPasswordChangedEmail(opts: {
  to: string;
  nome?: string;
  ip?: string;
}): Promise<boolean> {
  const html = buildPasswordChangedHtml(opts);
  return sendMail(opts.to, 'ECO RJ · Sua senha foi alterada', html);
}
