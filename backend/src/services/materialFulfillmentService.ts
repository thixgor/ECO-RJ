import crypto from 'crypto';
import MaterialOrder from '../models/MaterialOrder';
import Material from '../models/Material';
import MaterialEntitlement from '../models/MaterialEntitlement';
import Coupon from '../models/Coupon';
import User from '../models/User';
import { sendMaterialPurchaseEmail, MailAttachment } from './emailService';
import { getSignedUrl } from './blobStorageService';
import { watermarkPdfBuffer } from './pdfWatermarkService';

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomCode(len: number): string {
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    out += KEY_CHARS.charAt(bytes[i] % KEY_CHARS.length);
  }
  return out;
}

async function generateUniqueSerialKey(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = `ECO-MAT-${yearMonth}-${randomCode(6)}`;
    const existing = await MaterialEntitlement.findOne({ serialKey: key }).select('_id');
    if (!existing) return key;
  }
}

async function generateUniqueAccessToken(): Promise<string> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const token = crypto.randomBytes(32).toString('hex');
    const existing = await MaterialEntitlement.findOne({ accessToken: token }).select('_id');
    if (!existing) return token;
  }
}

function getBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://www.ecorj.com').replace(/\/+$/, '');
}

/**
 * Processa a ENTREGA de um pedido de material aprovado. Idempotente: pode ser
 * chamado múltiplas vezes (webhook duplicado, sync, reprocessamento do admin)
 * sem duplicar acessos, contadores ou vendas.
 *
 * IMPORTANTE (garantia anti-perda de produto):
 *   O acesso (MaterialEntitlement) e os códigos de acesso são persistidos ANTES
 *   e INDEPENDENTEMENTE do envio do e-mail. Se o e-mail falhar, o comprador
 *   ainda acessa o produto pela página de status, pelo link/serial, por
 *   "Meus Materiais" (logado) ou pela recuperação por e-mail.
 */
export async function fulfillMaterialOrder(orderId: string): Promise<void> {
  // CLAIM ATÔMICO — apenas UMA execução processa a entrega.
  const claimed = await MaterialOrder.findOneAndUpdate(
    { _id: orderId, status: 'aprovado', entregue: false },
    { $set: { entregue: true, entregueEm: new Date() } },
    { new: true }
  );
  if (!claimed) return;

  const order = claimed;
  const material = await Material.findById(order.material);

  // 1) Códigos de acesso (gerados uma única vez e persistidos no pedido)
  let serialKey = order.serialKeyCodigo;
  let accessToken = order.accessToken;
  if (!serialKey) serialKey = await generateUniqueSerialKey();
  if (!accessToken) accessToken = await generateUniqueAccessToken();
  order.serialKeyCodigo = serialKey;
  order.accessToken = accessToken;
  await order.save();

  // 2) Validade do acesso
  let validade: Date | undefined;
  const dias = material?.validadeAcessoDias ?? 0;
  if (dias > 0) {
    validade = new Date();
    validade.setDate(validade.getDate() + dias);
  }

  // 3) Criar o entitlement (idempotente por pedido)
  let entitlement = await MaterialEntitlement.findOne({ order: order._id });
  if (!entitlement) {
    entitlement = await MaterialEntitlement.create({
      material: order.material,
      materialTitulo: order.materialTitulo,
      order: order._id,
      user: order.comprador || undefined,
      email: order.compradorDados.email.toLowerCase().trim(),
      serialKey,
      accessToken,
      origem: order.metodoPagamento === 'cortesia' ? 'cortesia' : 'compra',
      validade,
      ativo: true,
      revogado: false,
      podeAvaliar: true
    });
    order.entitlement = entitlement._id as any;
    await order.save();
  } else if (!entitlement.user && order.comprador) {
    // Reprocessamento após o comprador ter feito login em nova compra: mantém vínculo
    entitlement.user = order.comprador as any;
    await entitlement.save();
  }

  // 4) Contabilizar cupom (idempotente + atômico)
  if (order.cupomAplicado?.couponId && !order.cupomContabilizado) {
    await Coupon.updateOne(
      { _id: order.cupomAplicado.couponId },
      {
        $inc: { usosAtuais: 1 },
        $addToSet: { emailsQueUsaram: order.compradorDados.email.toLowerCase().trim() }
      }
    );
    order.cupomContabilizado = true;
    await order.save();
  }

  // 5) Contabilizar venda do material (idempotente + atômico)
  if (!order.vendaContabilizada) {
    await Material.updateOne({ _id: order.material }, { $inc: { vendasTotais: 1 } });
    order.vendaContabilizada = true;
    await order.save();
  }

  // 6) Se comprador logado, vincula à conta (e o CPF da compra, p/ watermark)
  let isGuest = true;
  if (order.comprador) {
    const user = await User.findById(order.comprador);
    if (user) {
      isGuest = false;
      const cpfCompra = (order.compradorDados?.cpf || '').replace(/[^\d]/g, '');
      if (cpfCompra && cpfCompra.length === 11 && !user.cpf) {
        const cpfEmUso = await User.findOne({ cpf: cpfCompra, _id: { $ne: user._id } }).select('_id');
        if (!cpfEmUso) {
          user.cpf = cpfCompra;
          await user.save();
        }
      }
    }
  }

  // 7) E-mail (best-effort). NUNCA bloqueia a entrega.
  const materialLink = `${getBaseUrl()}/materiais/${order.material}`;
  const accessLink = `${getBaseUrl()}/materiais/acesso?token=${accessToken}`;

  // Anexa PDFs (para convidados) — best-effort; falha de anexo não impede envio.
  // Cada PDF é baixado, recebe MARCA D'ÁGUA + metadados com os dados do
  // comprador (nome, CPF, e-mail) e é anexado como conteúdo (Buffer).
  // Se o download/marca falhar, cai no anexo por URL assinada (sem marca).
  const wmIdentity = {
    nome: order.compradorDados?.nome || '',
    cpf: order.compradorDados?.cpf || '',
    email: order.compradorDados?.email || ''
  };
  const attachments: MailAttachment[] = [];
  if (isGuest && material) {
    for (const c of material.conteudos) {
      if (c.tipo !== 'pdf') continue;
      const url = await getSignedUrl(c);
      if (!url) continue;
      const filename = c.nomeArquivo || `${(c.titulo || 'material').replace(/[^\w.-]+/g, '_')}.pdf`;
      try {
        const upstream = await fetch(url);
        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          const marcado = await watermarkPdfBuffer(buf, wmIdentity);
          attachments.push({ filename, content: marcado, contentType: 'application/pdf' });
          continue;
        }
      } catch (err) {
        console.error('Falha ao baixar/marcar PDF para anexo (fallback p/ URL):', err);
      }
      // Fallback: nodemailer busca o arquivo pela URL no momento do envio.
      attachments.push({ filename, path: url, contentType: 'application/pdf' });
    }
  }

  try {
    order.emailTentativas = (order.emailTentativas || 0) + 1;
    const enviado = await sendMaterialPurchaseEmail(
      order,
      { isGuest, serialKeyCodigo: serialKey, accessLink, materialLink },
      attachments.length ? attachments : undefined
    );
    if (enviado) {
      order.emailEnviado = true;
      order.ultimoEmailErro = undefined;
    } else {
      order.ultimoEmailErro = 'E-mail não enviado (SMTP indisponível ou falha no envio)';
    }
    await order.save();
  } catch (err: any) {
    order.ultimoEmailErro = String(err?.message || err).substring(0, 500);
    try { await order.save(); } catch { /* noop */ }
    console.error('Erro ao enviar e-mail de material (pedido segue entregue):', err);
  }
}
