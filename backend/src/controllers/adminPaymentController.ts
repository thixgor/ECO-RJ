import { Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import MaterialOrder from '../models/MaterialOrder';
import Course from '../models/Course';
import { AuthRequest } from '../middleware/auth';
import { getPaymentConfig, setPaymentConfig, PaymentConfig, DEFAULT_PAYMENT_CONFIG } from '../config/paymentConfig';
import { fulfillOrder } from '../services/fulfillmentService';

// @desc    Listar pedidos (Admin)
// @route   GET /api/payments/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, cursoId, page = 1, limit = 30 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (cursoId) query.curso = cursoId;
    if (search) {
      const s = String(search).trim();
      query.$or = [
        { numeroPedido: { $regex: s, $options: 'i' } },
        { 'compradorDados.nome': { $regex: s, $options: 'i' } },
        { 'compradorDados.email': { $regex: s, $options: 'i' } },
        { 'compradorDados.cpf': { $regex: s.replace(/\D/g, ''), $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('curso', 'titulo')
        .populate('comprador', 'nomeCompleto email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      orders,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
};

// @desc    Detalhe de um pedido (Admin)
// @route   GET /api/payments/admin/orders/:id
// @access  Private/Admin
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('curso', 'titulo')
      .populate('comprador', 'nomeCompleto email cpf')
      .populate('serialKeyGerada', 'chave status validade')
      .populate('cupomAplicado.couponId', 'codigo')
      .populate('loteAplicado', 'nome');
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    res.json(order);
  } catch (error) {
    console.error('Erro ao obter pedido:', error);
    res.status(500).json({ message: 'Erro ao obter pedido' });
  }
};

// @desc    Estatísticas de vendas (Admin)
// @route   GET /api/payments/admin/stats
// @access  Private/Admin
export const getPaymentStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalPedidos, aprovados, pendentes, rejeitados, receita] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'aprovado' }),
      Order.countDocuments({ status: { $in: ['pendente', 'em_processo'] } }),
      Order.countDocuments({ status: 'rejeitado' }),
      Order.aggregate([
        { $match: { status: 'aprovado' } },
        { $group: { _id: null, total: { $sum: '$valores.total' }, subtotal: { $sum: '$valores.subtotal' } } }
      ])
    ]);

    res.json({
      totalPedidos,
      aprovados,
      pendentes,
      rejeitados,
      receitaTotal: receita[0]?.total || 0,
      receitaLiquida: receita[0]?.subtotal || 0
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de vendas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas de vendas' });
  }
};

// @desc    Reprocessar entrega de um pedido aprovado (Admin)
// @route   POST /api/payments/admin/orders/:id/refulfill
// @access  Private/Admin
export const refulfillOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    if (order.status !== 'aprovado') {
      return res.status(400).json({ message: 'Apenas pedidos aprovados podem ser reprocessados' });
    }
    // Reabre o claim para permitir reprocessar entrega e reenviar e-mail.
    // A entrega continua idempotente: a serial key já gerada é reutilizada e os
    // contadores de cupom/lote não são incrementados novamente.
    order.entregue = false;
    order.emailEnviado = false;
    await order.save();
    await fulfillOrder((order._id as any).toString());
    const updated = await Order.findById(order._id);
    res.json({ message: 'Pedido reprocessado', order: updated });
  } catch (error) {
    console.error('Erro ao reprocessar pedido:', error);
    res.status(500).json({ message: 'Erro ao reprocessar pedido' });
  }
};

// @desc    Obter configuração de pagamento (Admin)
// @route   GET /api/payments/admin/config
// @access  Private/Admin
export const getAdminPaymentConfig = async (_req: AuthRequest, res: Response) => {
  try {
    const config = await getPaymentConfig();
    res.json(config);
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    res.status(500).json({ message: 'Erro ao obter configuração' });
  }
};

// @desc    Atualizar configuração de pagamento (Admin)
// @route   PUT /api/payments/admin/config
// @access  Private/Admin
export const updateAdminPaymentConfig = async (req: AuthRequest, res: Response) => {
  try {
    const atual = await getPaymentConfig();
    const body = req.body || {};

    const nova: PaymentConfig = {
      taxaOperacionalPercentual: body.taxaOperacionalPercentual !== undefined
        ? Math.max(0, Number(body.taxaOperacionalPercentual))
        : atual.taxaOperacionalPercentual,
      metodos: {
        pix: body.metodos?.pix !== undefined ? !!body.metodos.pix : atual.metodos.pix,
        cartaoCredito: body.metodos?.cartaoCredito !== undefined ? !!body.metodos.cartaoCredito : atual.metodos.cartaoCredito,
        cartaoDebito: body.metodos?.cartaoDebito !== undefined ? !!body.metodos.cartaoDebito : atual.metodos.cartaoDebito,
        boleto: body.metodos?.boleto !== undefined ? !!body.metodos.boleto : atual.metodos.boleto
      },
      parcelasMaximas: body.parcelasMaximas !== undefined
        ? Math.min(24, Math.max(1, Number(body.parcelasMaximas)))
        : atual.parcelasMaximas,
      termosVersao: body.termosVersao !== undefined ? String(body.termosVersao) : atual.termosVersao,
      termosCompra: body.termosCompra !== undefined ? String(body.termosCompra) : atual.termosCompra,
      vendasAtivas: body.vendasAtivas !== undefined ? !!body.vendasAtivas : atual.vendasAtivas
    };

    await setPaymentConfig(nova, req.user?._id ? String(req.user._id) : undefined);
    res.json(nova);
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ message: 'Erro ao atualizar configuração' });
  }
};

// @desc    Restaurar termos padrão (Admin)
// @route   POST /api/payments/admin/config/reset-terms
// @access  Private/Admin
export const resetTerms = async (req: AuthRequest, res: Response) => {
  try {
    const atual = await getPaymentConfig();
    atual.termosCompra = DEFAULT_PAYMENT_CONFIG.termosCompra;
    await setPaymentConfig(atual, req.user?._id ? String(req.user._id) : undefined);
    res.json(atual);
  } catch (error) {
    console.error('Erro ao restaurar termos:', error);
    res.status(500).json({ message: 'Erro ao restaurar termos' });
  }
};

// @desc    Atualizar configuração de venda de um curso (Admin)
// @route   PUT /api/payments/admin/course/:id/pricing
// @access  Private/Admin
export const updateCoursePricing = async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Curso não encontrado' });

    const { disponivel, preco, descontoAtivado, validadeAcessoDias } = req.body;

    if (!course.venda) {
      course.venda = {
        disponivel: false, preco: 0,
        descontoAtivado: { ativo: false, tipo: 'percentual', valor: 0 },
        validadeAcessoDias: 365
      } as any;
    }

    if (disponivel !== undefined) course.venda.disponivel = !!disponivel;
    if (preco !== undefined) {
      if (Number(preco) < 0) return res.status(400).json({ message: 'Preço inválido' });
      course.venda.preco = Number(preco);
    }
    if (validadeAcessoDias !== undefined) course.venda.validadeAcessoDias = Math.max(0, Number(validadeAcessoDias));
    if (descontoAtivado !== undefined && typeof descontoAtivado === 'object') {
      if (descontoAtivado.ativo !== undefined) course.venda.descontoAtivado.ativo = !!descontoAtivado.ativo;
      if (descontoAtivado.tipo !== undefined) {
        if (!['percentual', 'fixo'].includes(descontoAtivado.tipo)) {
          return res.status(400).json({ message: 'Tipo de desconto inválido' });
        }
        course.venda.descontoAtivado.tipo = descontoAtivado.tipo;
      }
      if (descontoAtivado.valor !== undefined) course.venda.descontoAtivado.valor = Math.max(0, Number(descontoAtivado.valor));
    }

    course.markModified('venda');
    await course.save();
    res.json({ message: 'Configuração de venda atualizada', venda: course.venda });
  } catch (error) {
    console.error('Erro ao atualizar preços do curso:', error);
    res.status(500).json({ message: 'Erro ao atualizar preços do curso' });
  }
};

// @desc    Estatísticas UNIFICADAS de vendas (cursos + materiais) (Admin)
// @route   GET /api/payments/admin/stats-unified
// @access  Private/Admin
// Consolida o financeiro das duas fontes de receita (Order = cursos,
// MaterialOrder = materiais) para dar a visão TOTAL do que foi arrecadado.
export const getUnifiedStats = async (_req: AuthRequest, res: Response) => {
  try {
    const buildStats = async (Model: mongoose.Model<any>) => {
      const [total, aprovados, pendentes, rejeitados, receitaAgg] = await Promise.all([
        Model.countDocuments(),
        Model.countDocuments({ status: 'aprovado' }),
        Model.countDocuments({ status: { $in: ['pendente', 'em_processo'] } }),
        Model.countDocuments({ status: 'rejeitado' }),
        Model.aggregate([
          { $match: { status: 'aprovado' } },
          {
            $group: {
              _id: null,
              total: { $sum: '$valores.total' },
              subtotal: { $sum: '$valores.subtotal' },
              taxa: { $sum: '$valores.taxaOperacional' }
            }
          }
        ])
      ]);
      return {
        total,
        aprovados,
        pendentes,
        rejeitados,
        receita: receitaAgg[0]?.total || 0,
        receitaLiquida: receitaAgg[0]?.subtotal || 0,
        taxa: receitaAgg[0]?.taxa || 0
      };
    };

    const [cursos, materiais, emailsFalhos] = await Promise.all([
      buildStats(Order),
      buildStats(MaterialOrder),
      // Alerta operacional: entregas aprovadas cujo e-mail NÃO foi enviado
      MaterialOrder.countDocuments({ status: 'aprovado', entregue: true, emailEnviado: false })
    ]);

    const receitaTotal = cursos.receita + materiais.receita;
    const aprovadosTotal = cursos.aprovados + materiais.aprovados;

    res.json({
      // Visão consolidada
      receitaTotal,
      receitaCursos: cursos.receita,
      receitaMateriais: materiais.receita,
      receitaLiquidaTotal: cursos.receitaLiquida + materiais.receitaLiquida,
      taxaArrecadadaTotal: cursos.taxa + materiais.taxa,
      totalPedidos: cursos.total + materiais.total,
      aprovados: aprovadosTotal,
      pendentes: cursos.pendentes + materiais.pendentes,
      rejeitados: cursos.rejeitados + materiais.rejeitados,
      ticketMedio: aprovadosTotal > 0 ? receitaTotal / aprovadosTotal : 0,
      emailsFalhos,
      // Detalhamento por origem
      cursos,
      materiais
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas unificadas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};

// @desc    Listar pedidos UNIFICADOS (cursos + materiais) (Admin)
// @route   GET /api/payments/admin/orders-unified
// @access  Private/Admin
export const getUnifiedOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, origem, page = 1, limit = 30 } = req.query;
    const materialColl = MaterialOrder.collection.collectionName;

    const postMatch: any = {};
    if (status) postMatch.status = status;
    if (origem === 'curso' || origem === 'material') postMatch.origem = origem;
    if (search) {
      const s = String(search).trim();
      postMatch.$or = [
        { numeroPedido: { $regex: s, $options: 'i' } },
        { 'compradorDados.nome': { $regex: s, $options: 'i' } },
        { 'compradorDados.email': { $regex: s, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const projection = {
      numeroPedido: 1,
      origem: 1,
      produtoTitulo: 1,
      compradorDados: 1,
      'valores.total': 1,
      status: 1,
      metodoPagamento: 1,
      createdAt: 1,
      entregue: 1,
      emailEnviado: 1
    };

    const pipeline: any[] = [
      // Cursos → normaliza para o formato comum
      { $addFields: { origem: 'curso', produtoTitulo: '$cursoTitulo' } },
      // Une com materiais → normaliza também
      {
        $unionWith: {
          coll: materialColl,
          pipeline: [{ $addFields: { origem: 'material', produtoTitulo: '$materialTitulo' } }]
        }
      },
      { $match: postMatch },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: Number(limit) }, { $project: projection }],
          totalArr: [{ $count: 'count' }]
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalArr?.[0]?.count || 0;

    res.json({
      orders: data,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('Erro ao listar pedidos unificados:', error);
    res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
};

// @desc    Listar cursos com configuração de venda (Admin)
// @route   GET /api/payments/admin/courses-pricing
// @access  Private/Admin
export const getCoursesPricing = async (_req: AuthRequest, res: Response) => {
  try {
    const courses = await Course.find().select('titulo imagemCapa ativo venda').sort({ ordem: 1, createdAt: -1 });
    res.json({ courses });
  } catch (error) {
    console.error('Erro ao listar preços dos cursos:', error);
    res.status(500).json({ message: 'Erro ao listar preços dos cursos' });
  }
};
