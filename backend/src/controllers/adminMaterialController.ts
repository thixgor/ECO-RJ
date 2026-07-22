import { Response } from 'express';
import crypto from 'crypto';
import Material, { ConteudoTipo, normalizeMaterialTipo } from '../models/Material';
import MaterialOrder from '../models/MaterialOrder';
import MaterialEntitlement from '../models/MaterialEntitlement';
import { AuthRequest } from '../middleware/auth';
import { fulfillMaterialOrder } from '../services/materialFulfillmentService';

const TIPOS_CONTEUDO: ConteudoTipo[] = ['aula', 'pdf', 'arquivo'];

/** Sanitiza a lista de conteúdos vinda do admin. */
function sanitizeConteudos(input: any): any[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((c) => c && typeof c === 'object' && TIPOS_CONTEUDO.includes(c.tipo))
    .map((c) => ({
      tipo: c.tipo,
      titulo: String(c.titulo || '').trim() || 'Conteúdo',
      descricao: c.descricao ? String(c.descricao).trim() : undefined,
      embedVideo: c.tipo === 'aula' && c.embedVideo ? String(c.embedVideo).trim() : undefined,
      duracao: c.duracao !== undefined && c.duracao !== null ? Math.max(0, Number(c.duracao) || 0) : undefined,
      arquivoUrl: (c.tipo === 'pdf' || c.tipo === 'arquivo') && c.arquivoUrl ? String(c.arquivoUrl).trim() : undefined,
      blobKey: c.blobKey ? String(c.blobKey).trim() : undefined,
      nomeArquivo: c.nomeArquivo ? String(c.nomeArquivo).trim() : undefined,
      mimeType: c.mimeType ? String(c.mimeType).trim() : undefined,
      tamanhoBytes: c.tamanhoBytes !== undefined ? Math.max(0, Number(c.tamanhoBytes) || 0) : undefined
    }));
}

function sanitizeDesconto(input: any) {
  const d = input && typeof input === 'object' ? input : {};
  return {
    ativo: !!d.ativo,
    tipo: d.tipo === 'fixo' ? 'fixo' : 'percentual',
    valor: Math.max(0, Number(d.valor) || 0)
  };
}

// ==========================================================================
//  CRUD DE MATERIAIS
// ==========================================================================

// @desc    Listar todos os materiais (Admin)
// @route   GET /api/materials/admin/all
// @access  Private/Admin
export const listMaterialsAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    const docs = await Material.find().sort({ ordem: 1, createdAt: -1 });
    const materials = docs.map((m) => ({ ...m.toObject(), tipo: normalizeMaterialTipo(m.tipo) }));
    res.json({ materials });
  } catch (error) {
    console.error('Erro ao listar materiais (admin):', error);
    res.status(500).json({ message: 'Erro ao listar materiais' });
  }
};

// @desc    Detalhe de um material (Admin)
// @route   GET /api/materials/admin/:id
// @access  Private/Admin
export const getMaterialAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });
    res.json({ material: { ...material.toObject(), tipo: normalizeMaterialTipo(material.tipo) } });
  } catch (error) {
    console.error('Erro ao obter material (admin):', error);
    res.status(500).json({ message: 'Erro ao obter material' });
  }
};

// @desc    Criar material (Admin)
// @route   POST /api/materials/admin
// @access  Private/Admin
export const createMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body || {};
    if (!String(b.titulo || '').trim()) return res.status(400).json({ message: 'Título é obrigatório' });
    if (!String(b.descricao || '').trim()) return res.status(400).json({ message: 'Descrição é obrigatória' });
    const tipo = normalizeMaterialTipo(b.tipo);

    const material = await Material.create({
      titulo: String(b.titulo).trim(),
      descricao: String(b.descricao).trim(),
      descricaoCurta: b.descricaoCurta ? String(b.descricaoCurta).trim() : undefined,
      tipo,
      capa: b.capa ? String(b.capa).trim() : undefined,
      conteudos: sanitizeConteudos(b.conteudos),
      disponivel: !!b.disponivel,
      ativo: b.ativo !== undefined ? !!b.ativo : true,
      destaque: !!b.destaque,
      ordem: Number(b.ordem) || 0,
      preco: Math.max(0, Number(b.preco) || 0),
      descontoAtivado: sanitizeDesconto(b.descontoAtivado),
      validadeAcessoDias: Math.max(0, Number(b.validadeAcessoDias) || 0),
      createdBy: req.user?._id
    });

    res.status(201).json({ message: 'Material criado com sucesso', material });
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ message: 'Erro ao criar material' });
  }
};

// @desc    Atualizar material (Admin)
// @route   PUT /api/materials/admin/:id
// @access  Private/Admin
export const updateMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });
    const b = req.body || {};

    if (b.titulo !== undefined) {
      if (!String(b.titulo).trim()) return res.status(400).json({ message: 'Título é obrigatório' });
      material.titulo = String(b.titulo).trim();
    }
    if (b.descricao !== undefined) {
      if (!String(b.descricao).trim()) return res.status(400).json({ message: 'Descrição é obrigatória' });
      material.descricao = String(b.descricao).trim();
    }
    if (b.descricaoCurta !== undefined) material.descricaoCurta = String(b.descricaoCurta).trim();
    if (b.tipo !== undefined) material.tipo = normalizeMaterialTipo(b.tipo);
    if (b.capa !== undefined) material.capa = String(b.capa).trim();
    if (b.conteudos !== undefined) {
      material.conteudos = sanitizeConteudos(b.conteudos) as any;
      material.markModified('conteudos');
    }
    if (b.disponivel !== undefined) material.disponivel = !!b.disponivel;
    if (b.ativo !== undefined) material.ativo = !!b.ativo;
    if (b.destaque !== undefined) material.destaque = !!b.destaque;
    if (b.ordem !== undefined) material.ordem = Number(b.ordem) || 0;
    if (b.preco !== undefined) {
      if (Number(b.preco) < 0) return res.status(400).json({ message: 'Preço inválido' });
      material.preco = Number(b.preco);
    }
    if (b.descontoAtivado !== undefined) {
      material.descontoAtivado = sanitizeDesconto(b.descontoAtivado) as any;
      material.markModified('descontoAtivado');
    }
    if (b.validadeAcessoDias !== undefined) material.validadeAcessoDias = Math.max(0, Number(b.validadeAcessoDias) || 0);

    await material.save();
    res.json({ message: 'Material atualizado com sucesso', material });
  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({ message: 'Erro ao atualizar material' });
  }
};

// @desc    Excluir material (Admin) — bloqueia se houver compras
// @route   DELETE /api/materials/admin/:id
// @access  Private/Admin
export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });

    const vendas = await MaterialOrder.countDocuments({ material: material._id, status: 'aprovado' });
    if (vendas > 0) {
      // Preserva o histórico: desativa (soft-delete) em vez de apagar.
      material.ativo = false;
      material.disponivel = false;
      await material.save();
      return res.json({
        message: 'Material possui compras registradas. Foi desativado (removido da loja) para preservar o acesso dos compradores.',
        softDeleted: true
      });
    }

    await material.deleteOne();
    res.json({ message: 'Material excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    res.status(500).json({ message: 'Erro ao excluir material' });
  }
};

// ==========================================================================
//  PEDIDOS / VENDAS
// ==========================================================================

// @desc    Listar pedidos de materiais (Admin)
// @route   GET /api/materials/admin/orders
// @access  Private/Admin
export const listMaterialOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, materialId, page = 1, limit = 30 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (materialId) query.material = materialId;
    if (search) {
      const s = String(search).trim();
      query.$or = [
        { numeroPedido: { $regex: s, $options: 'i' } },
        { 'compradorDados.nome': { $regex: s, $options: 'i' } },
        { 'compradorDados.email': { $regex: s, $options: 'i' } },
        { serialKeyCodigo: { $regex: s, $options: 'i' } }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      MaterialOrder.find(query)
        .populate('material', 'titulo tipo')
        .populate('comprador', 'nomeCompleto email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MaterialOrder.countDocuments(query)
    ]);
    res.json({
      orders,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('Erro ao listar pedidos de materiais:', error);
    res.status(500).json({ message: 'Erro ao listar pedidos' });
  }
};

// @desc    Detalhe de um pedido de material (Admin)
// @route   GET /api/materials/admin/orders/:id
// @access  Private/Admin
export const getMaterialOrderAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const order = await MaterialOrder.findById(req.params.id)
      .populate('material', 'titulo tipo')
      .populate('comprador', 'nomeCompleto email cpf')
      .populate('entitlement')
      .populate('cupomAplicado.couponId', 'codigo');
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    res.json(order);
  } catch (error) {
    console.error('Erro ao obter pedido de material:', error);
    res.status(500).json({ message: 'Erro ao obter pedido' });
  }
};

// @desc    Estatísticas de vendas de materiais (Admin)
// @route   GET /api/materials/admin/stats
// @access  Private/Admin
export const getMaterialStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalPedidos, aprovados, pendentes, rejeitados, receita, emailsFalhos, totalMateriais] = await Promise.all([
      MaterialOrder.countDocuments(),
      MaterialOrder.countDocuments({ status: 'aprovado' }),
      MaterialOrder.countDocuments({ status: { $in: ['pendente', 'em_processo'] } }),
      MaterialOrder.countDocuments({ status: 'rejeitado' }),
      MaterialOrder.aggregate([
        { $match: { status: 'aprovado' } },
        { $group: { _id: null, total: { $sum: '$valores.total' }, subtotal: { $sum: '$valores.subtotal' } } }
      ]),
      // Alerta operacional: compras entregues cujo e-mail NÃO foi enviado
      MaterialOrder.countDocuments({ status: 'aprovado', entregue: true, emailEnviado: false }),
      Material.countDocuments({ ativo: true })
    ]);
    res.json({
      totalPedidos,
      aprovados,
      pendentes,
      rejeitados,
      receitaTotal: receita[0]?.total || 0,
      receitaLiquida: receita[0]?.subtotal || 0,
      emailsFalhos,
      totalMateriais
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de materiais:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};

// @desc    Reprocessar entrega / reenviar e-mail de um pedido (Admin)
// @route   POST /api/materials/admin/orders/:id/refulfill
// @access  Private/Admin
export const refulfillMaterialOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    if (order.status !== 'aprovado') {
      return res.status(400).json({ message: 'Apenas pedidos aprovados podem ser reprocessados' });
    }
    // Reabre o claim (idempotente): mantém o mesmo acesso/serial e apenas reenvia.
    order.entregue = false;
    order.emailEnviado = false;
    await order.save();
    await fulfillMaterialOrder((order._id as any).toString());
    const updated = await MaterialOrder.findById(order._id);
    res.json({ message: 'Pedido reprocessado e e-mail reenviado', order: updated });
  } catch (error) {
    console.error('Erro ao reprocessar pedido de material:', error);
    res.status(500).json({ message: 'Erro ao reprocessar pedido' });
  }
};

// @desc    Conceder acesso manual a um material (cortesia / suporte) (Admin)
// @route   POST /api/materials/admin/:id/grant
// @access  Private/Admin
export const grantMaterialAccess = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = Array.from(crypto.randomBytes(6)).map((n) => chars[n % chars.length]).join('');
    const serialKey = `ECO-MAT-${yearMonth}-${rand}`;
    const accessToken = crypto.randomBytes(32).toString('hex');

    let validade: Date | undefined;
    if (material.validadeAcessoDias > 0) {
      validade = new Date();
      validade.setDate(validade.getDate() + material.validadeAcessoDias);
    }

    const ent = await MaterialEntitlement.create({
      material: material._id,
      materialTitulo: material.titulo,
      email,
      serialKey,
      accessToken,
      origem: 'admin',
      validade,
      ativo: true,
      revogado: false,
      podeAvaliar: true
    });

    const base = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://www.cursodeecocardiografia.com').replace(/\/+$/, '');
    res.status(201).json({
      message: 'Acesso concedido com sucesso',
      entitlement: ent,
      accessLink: `${base}/materiais/acesso?token=${accessToken}`
    });
  } catch (error) {
    console.error('Erro ao conceder acesso de material:', error);
    res.status(500).json({ message: 'Erro ao conceder acesso' });
  }
};

// @desc    Revogar/reativar um acesso (Admin)
// @route   PUT /api/materials/admin/entitlements/:id
// @access  Private/Admin
export const updateEntitlement = async (req: AuthRequest, res: Response) => {
  try {
    const ent = await MaterialEntitlement.findById(req.params.id);
    if (!ent) return res.status(404).json({ message: 'Acesso não encontrado' });
    if (req.body?.revogado !== undefined) ent.revogado = !!req.body.revogado;
    if (req.body?.ativo !== undefined) ent.ativo = !!req.body.ativo;
    await ent.save();
    res.json({ message: 'Acesso atualizado', entitlement: ent });
  } catch (error) {
    console.error('Erro ao atualizar acesso:', error);
    res.status(500).json({ message: 'Erro ao atualizar acesso' });
  }
};
