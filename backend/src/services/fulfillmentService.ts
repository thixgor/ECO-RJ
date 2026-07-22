import mongoose from 'mongoose';
import { IOrder } from '../models/Order';
import Order from '../models/Order';
import SerialKey from '../models/SerialKey';
import Course from '../models/Course';
import User from '../models/User';
import Coupon from '../models/Coupon';
import PriceLot from '../models/PriceLot';
import { sendPurchaseEmail } from './emailService';

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

async function generateUniqueKey(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  // Loop até obter uma chave inédita
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += KEY_CHARS.charAt(Math.floor(Math.random() * KEY_CHARS.length));
    }
    const key = `ECO-${yearMonth}-${randomPart}`;
    const existing = await SerialKey.findOne({ chave: key });
    if (!existing) return key;
  }
}

function getBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://www.cursodeecocardiografia.com';
}

/**
 * Processa a ENTREGA de um pedido aprovado. É idempotente: pode ser chamado
 * múltiplas vezes (ex: webhook duplicado) sem gerar chaves duplicadas ou liberar
 * acesso mais de uma vez.
 *
 * Fluxo:
 *   1. Gera (uma única vez) a serial key da compra.
 *   2. Contabiliza uso de cupom e lote de forma atômica e idempotente.
 *   3. Se o comprador estava logado: libera o acesso automaticamente na conta.
 *      Caso contrário (convidado): a chave fica pendente para ativação futura.
 *   4. Envia o e-mail com comprovante + chave + link de ativação.
 */
export async function fulfillOrder(orderId: string): Promise<void> {
  // CLAIM ATÔMICO: garante que apenas UMA execução processe a entrega,
  // mesmo com webhooks duplicados ou concorrência em ambiente serverless.
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, status: 'aprovado', entregue: false },
    { $set: { entregue: true, entregueEm: new Date() } },
    { new: true }
  );
  if (!claimed) return; // já entregue por outra execução ou não aprovado

  const order = claimed;

  // 1) Gerar serial key (se ainda não existir)
  let serialKeyId = order.serialKeyGerada;
  let serialKeyCodigo = order.serialKeyCodigo;

  const course = await Course.findById(order.curso);
  const validadeDias = course?.venda?.validadeAcessoDias ?? 365;
  const validade = new Date();
  if (validadeDias > 0) {
    validade.setDate(validade.getDate() + validadeDias);
  } else {
    validade.setFullYear(validade.getFullYear() + 100); // "sem expiração"
  }

  if (!serialKeyId) {
    const chave = await generateUniqueKey();
    const novaChave = await SerialKey.create({
      chave,
      cargoAtribuido: 'Aluno',
      validade,
      descricao: `Compra ${order.numeroPedido} - ${order.cursoTitulo}`,
      cursoRestrito: order.curso
    });
    serialKeyId = novaChave._id as any;
    serialKeyCodigo = chave;
    order.serialKeyGerada = serialKeyId;
    order.serialKeyCodigo = serialKeyCodigo;
    await order.save();
  }

  // 2) Contabilizar cupom (idempotente + atômico)
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

  // 3) Contabilizar lote (idempotente + atômico)
  if (order.loteAplicado && !order.loteContabilizado) {
    await PriceLot.updateOne(
      { _id: order.loteAplicado },
      { $inc: { quantidadeVendida: 1 } }
    );
    order.loteContabilizado = true;
    await order.save();
  }

  // 4) Liberar acesso
  let isGuest = true;
  if (order.comprador) {
    const user = await User.findById(order.comprador);
    if (user) {
      isGuest = false;
      // Vincula o CPF da compra ao usuário (usado na marca d'água dos vídeos).
      // O CPF não é mais coletado no cadastro; passa a ser o CPF utilizado no checkout.
      const cpfCompra = (order.compradorDados?.cpf || '').replace(/[^\d]/g, '');
      if (cpfCompra && cpfCompra.length === 11 && !user.cpf) {
        // Evita conflito de índice único: só vincula se nenhum outro usuário tiver esse CPF.
        const cpfEmUso = await User.findOne({ cpf: cpfCompra, _id: { $ne: user._id } }).select('_id');
        if (!cpfEmUso) {
          user.cpf = cpfCompra;
        }
      }
      // Promove para Aluno apenas se ainda for Visitante (não rebaixa Instrutor/Admin)
      if (user.cargo === 'Visitante') {
        user.cargo = 'Aluno';
      }
      // Vincula a serial key ao histórico do usuário
      const skId = serialKeyId as mongoose.Types.ObjectId;
      if (!user.serialKeysUsadas.some((k) => k.toString() === skId.toString())) {
        user.serialKeysUsadas.push(skId as any);
      }
      // Inscreve no curso
      if (!user.cursosInscritos.some((c) => c.toString() === order.curso.toString())) {
        user.cursosInscritos.push(order.curso as any);
      }
      await user.save();

      // Autoriza no curso (se restrito) e marca a chave como usada por ele
      if (course) {
        if (course.acessoRestrito && !course.alunosAutorizados.some((a) => a.toString() === user._id!.toString())) {
          course.alunosAutorizados.push(user._id as any);
          await course.save();
        }
      }
      await SerialKey.updateOne(
        { _id: serialKeyId, status: { $ne: 'usada' } },
        { status: 'usada', usadaPor: user._id, dataUso: new Date() }
      );
    }
  }

  // 5) (entrega já marcada atomicamente no início — claim). Persiste vínculos.
  await order.save();

  // 6) Enviar e-mail com comprovante + chave + link de ativação
  const activationLink = `${getBaseUrl()}/ativar?codigo=${serialKeyCodigo}`;
  try {
    const enviado = await sendPurchaseEmail(order, {
      serialKeyCodigo,
      activationLink,
      isGuest
    });
    if (enviado) {
      order.emailEnviado = true;
      await order.save();
    }
  } catch (err) {
    console.error('Erro ao enviar e-mail de compra (pedido segue entregue):', err);
  }
}
