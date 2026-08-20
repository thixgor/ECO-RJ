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
    }
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

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[]
): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL:SIMULADO] Para: ${to} | Assunto: ${subject}${attachments?.length ? ` | Anexos: ${attachments.length}` : ''}`);
    return false;
  }
  try {
    await t.sendMail({
      from: getFrom(),
      to,
      subject,
      html,
      attachments: attachments && attachments.length ? attachments : undefined
    });
    return true;
  } catch (err) {
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
export function buildReceiptHtml(order: IOrder, opts: { serialKeyCodigo?: string; activationLink?: string; isGuest: boolean }): string {
  const v = order.valores;
  const linhasDesconto: string[] = [];
  if (v.descontoLote > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Desconto (lote)</td><td align="right" style="color:#059669;">- ${brl(v.descontoLote)}</td></tr>`);
  if (v.descontoAtivado > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Desconto promocional</td><td align="right" style="color:#059669;">- ${brl(v.descontoAtivado)}</td></tr>`);
  if (v.descontoCupom > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Cupom ${order.cupomAplicado?.codigo || ''}</td><td align="right" style="color:#059669;">- ${brl(v.descontoCupom)}</td></tr>`);

  const ativacaoBloco = opts.serialKeyCodigo
    ? `
      <div style="margin:24px 0;padding:20px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1E3A8A;">🔑 Sua chave de ativação (serial key)</p>
        <p style="margin:0 0 12px;font-size:22px;font-weight:bold;letter-spacing:1px;color:#1D4ED8;font-family:monospace;">${opts.serialKeyCodigo}</p>
        ${opts.isGuest ? `
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          Para acessar seu curso, crie sua conta (ou faça login) e ative sua chave.
          Você pode ativar automaticamente pelo botão abaixo:
        </p>
        <a href="${opts.activationLink}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Ativar meu curso</a>
        ` : `
        <p style="margin:0;color:#334155;font-size:14px;">
          O acesso já foi liberado automaticamente na sua conta. Bons estudos!
        </p>
        `}
      </div>`
    : '';

  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E0F2FE;">
      <h1 style="margin:0;color:#1D4ED8;font-size:24px;">ECO RJ</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Centro de Treinamento em Ecocardiografia</p>
    </div>

    <div style="padding:24px 0;">
      <h2 style="font-size:20px;margin:0 0 4px;">Comprovante de Compra</h2>
      <p style="color:#64748b;margin:0 0 16px;">Pedido <strong>${order.numeroPedido}</strong></p>

      ${order.status === 'aprovado'
        ? '<p style="display:inline-block;padding:6px 14px;background:#DCFCE7;color:#166534;border-radius:999px;font-weight:bold;font-size:13px;">✔ Pagamento aprovado</p>'
        : '<p style="display:inline-block;padding:6px 14px;background:#FEF9C3;color:#854D0E;border-radius:999px;font-weight:bold;font-size:13px;">Aguardando confirmação</p>'}

      ${ativacaoBloco}

      <h3 style="font-size:16px;margin:24px 0 8px;">Detalhes</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 0;color:#64748b;">Curso</td><td align="right"><strong>${order.cursoTitulo}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Comprador</td><td align="right">${order.compradorDados.nome}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">E-mail</td><td align="right">${order.compradorDados.email}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">CPF</td><td align="right">${maskCpf(order.compradorDados.cpf)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Data</td><td align="right">${new Date(order.createdAt).toLocaleString('pt-BR')}</td></tr>
        ${order.metodoPagamento ? `<tr><td style="padding:4px 0;color:#64748b;">Método</td><td align="right">${order.metodoPagamento}</td></tr>` : ''}
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
  opts: { serialKeyCodigo?: string; activationLink?: string; isGuest: boolean }
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
      <p style="margin:0 0 16px;font-size:15px;">Olá ${primeiroNome},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        O curso <strong>${opts.cursoTitulo}</strong> atingiu sua data de término${termino ? ` em <strong>${termino}</strong>` : ''}.
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

      <a href="${opts.linkPlataforma}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar a plataforma</a>
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
  if (v.descontoCupom > 0) linhasDesconto.push(`<tr><td style="padding:4px 0;color:#059669;">Cupom ${order.cupomAplicado?.codigo || ''}</td><td align="right" style="color:#059669;">- ${brl(v.descontoCupom)}</td></tr>`);

  const acessoBloco = opts.isGuest
    ? `
      <div style="margin:24px 0;padding:20px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#1E3A8A;">🔑 Seu código de acesso</p>
        <p style="margin:0 0 12px;font-size:20px;font-weight:bold;letter-spacing:1px;color:#1D4ED8;font-family:monospace;">${opts.serialKeyCodigo || ''}</p>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          Você comprou sem uma conta. Acesse seu material imediatamente pelo botão abaixo
          (guarde este e-mail). Se preferir, crie uma conta com este mesmo e-mail para ter o
          material salvo permanentemente em <strong>"Meus Materiais"</strong>.
        </p>
        <a href="${opts.accessLink}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar / Baixar meu material</a>
      </div>`
    : `
      <div style="margin:24px 0;padding:20px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#065F46;">✅ Material liberado na sua conta</p>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;">
          O material já está disponível em <strong>"Meus Materiais"</strong> e na página do produto.
        </p>
        <a href="${opts.materialLink}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar meu material</a>
      </div>`;

  return `
  <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E0F2FE;">
      <h1 style="margin:0;color:#1D4ED8;font-size:24px;">ECO RJ</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Centro de Treinamento em Ecocardiografia</p>
    </div>

    <div style="padding:24px 0;">
      <h2 style="font-size:20px;margin:0 0 4px;">Compra de Material Confirmada</h2>
      <p style="color:#64748b;margin:0 0 16px;">Pedido <strong>${order.numeroPedido}</strong></p>

      <p style="display:inline-block;padding:6px 14px;background:#DCFCE7;color:#166534;border-radius:999px;font-weight:bold;font-size:13px;">✔ Pagamento aprovado</p>

      ${acessoBloco}

      <h3 style="font-size:16px;margin:24px 0 8px;">Detalhes</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:4px 0;color:#64748b;">Material</td><td align="right"><strong>${order.materialTitulo}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Comprador</td><td align="right">${order.compradorDados.nome}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">E-mail</td><td align="right">${order.compradorDados.email}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">CPF</td><td align="right">${maskCpf(order.compradorDados.cpf)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Data</td><td align="right">${new Date(order.createdAt).toLocaleString('pt-BR')}</td></tr>
        ${order.metodoPagamento ? `<tr><td style="padding:4px 0;color:#64748b;">Método</td><td align="right">${order.metodoPagamento}</td></tr>` : ''}
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
      <p style="margin:0 0 16px;font-size:15px;">Olá${primeiroNome ? ` ${primeiroNome}` : ''},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Liberamos o seu acesso ao material <strong>${opts.materialTitulo}</strong>.
        Use o botão abaixo para acessar o conteúdo a qualquer momento.
      </p>

      <div style="margin:20px 0;padding:16px 20px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;font-size:14px;">
        <p style="margin:0 0 6px;"><strong>Código de acesso:</strong>
          <span style="font-family:monospace;font-size:15px;color:#1D4ED8;">${opts.serialKey}</span>
        </p>
        <p style="margin:0;color:#64748b;">
          ${validade ? `Válido até <strong>${validade}</strong>.` : 'Acesso vitalício.'}
          Guarde este código: com ele você vincula o material à sua conta na plataforma.
        </p>
      </div>

      <a href="${opts.accessLink}" style="display:inline-block;padding:12px 24px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Acessar o material</a>

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
