import { Response } from 'express';
import crypto from 'crypto';
import Material, { ConteudoTipo, normalizeMaterialTipo } from '../models/Material';
import MaterialOrder from '../models/MaterialOrder';
import MaterialEntitlement, { isEntitlementValid } from '../models/MaterialEntitlement';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { fulfillMaterialOrder } from '../services/materialFulfillmentService';
import { sendMaterialGrantEmail } from '../services/emailService';

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
      exibirVendas: b.exibirVendas !== undefined ? !!b.exibirVendas : true,
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
    if (b.exibirVendas !== undefined) material.exibirVendas = !!b.exibirVendas;

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

// ==========================================================================
//  ACESSOS (ENTITLEMENTS) — quem pode ver cada material
// ==========================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Base pública da aplicação (para montar os links de acesso). */
function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://www.ecorj.com')
    .replace(/\/+$/, '');
}

function buildAccessLink(accessToken: string): string {
  return `${appBaseUrl()}/materiais/acesso?token=${accessToken}`;
}

/** Gera um código de acesso amigável e único no formato ECO-MAT-AAAAMM-XXXXXX. */
function generateSerialKey(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = Array.from(crypto.randomBytes(6)).map((n) => chars[n % chars.length]).join('');
  return `ECO-MAT-${yearMonth}-${rand}`;
}

/**
 * Resolve a data de validade de um acesso.
 * `dias` indefinido → usa a validade padrão do material; `0` → vitalício.
 */
function resolveValidade(material: { validadeAcessoDias?: number }, dias?: unknown): Date | undefined {
  const usarPadrao = dias === undefined || dias === null || dias === '';
  const n = usarPadrao ? Number(material.validadeAcessoDias || 0) : Math.max(0, Number(dias) || 0);
  if (!(n > 0)) return undefined;
  const v = new Date();
  v.setDate(v.getDate() + n);
  return v;
}

/** Serializa um acesso para o painel admin (inclui status calculado e link). */
function serializeEntitlement(ent: any) {
  const obj = typeof ent.toObject === 'function' ? ent.toObject() : ent;
  const valido = isEntitlementValid(obj);
  const expirado = !obj.revogado && obj.ativo !== false && !!obj.validade && !valido;
  return {
    ...obj,
    valido,
    expirado,
    status: obj.revogado || obj.ativo === false ? 'revogado' : expirado ? 'expirado' : 'valido',
    accessLink: buildAccessLink(obj.accessToken)
  };
}

// @desc    Listar acessos de um material (Admin)
// @route   GET /api/materials/admin/:id/entitlements
// @access  Private/Admin
export const listMaterialEntitlements = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id).select('titulo validadeAcessoDias');
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });

    const { search, status, origem, page = 1, limit = 20 } = req.query;
    const base: any = { material: material._id };
    const query: any = { ...base };
    const now = new Date();

    if (origem && ['compra', 'cortesia', 'admin'].includes(String(origem))) {
      query.origem = origem;
    }

    if (status === 'revogado') {
      query.$and = [{ $or: [{ revogado: true }, { ativo: false }] }];
    } else if (status === 'expirado') {
      query.revogado = false;
      query.ativo = true;
      query.validade = { $ne: null, $lte: now };
    } else if (status === 'valido') {
      query.revogado = false;
      query.ativo = true;
      query.$and = [{ $or: [{ validade: { $exists: false } }, { validade: null }, { validade: { $gt: now } }] }];
    }

    if (search) {
      const s = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = { $regex: s, $options: 'i' };
      // Busca também pelo nome da conta vinculada.
      const users = await User.find({ $or: [{ nomeCompleto: rx }, { email: rx }] }).select('_id').limit(200);
      const or: any[] = [{ email: rx }, { serialKey: rx }];
      if (users.length) or.push({ user: { $in: users.map((u) => u._id) } });
      query.$and = [...(query.$and || []), { $or: or }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total, totalGeral, validos, revogados] = await Promise.all([
      MaterialEntitlement.find(query)
        .populate('user', 'nomeCompleto email cargo')
        .populate('order', 'numeroPedido status valores.total')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MaterialEntitlement.countDocuments(query),
      MaterialEntitlement.countDocuments(base),
      MaterialEntitlement.countDocuments({
        ...base,
        revogado: false,
        ativo: true,
        $or: [{ validade: { $exists: false } }, { validade: null }, { validade: { $gt: now } }]
      }),
      MaterialEntitlement.countDocuments({ ...base, $or: [{ revogado: true }, { ativo: false }] })
    ]);

    res.json({
      material: { _id: material._id, titulo: material.titulo, validadeAcessoDias: material.validadeAcessoDias },
      entitlements: docs.map(serializeEntitlement),
      resumo: {
        total: totalGeral,
        validos,
        revogados,
        expirados: Math.max(0, totalGeral - validos - revogados)
      },
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 }
    });
  } catch (error) {
    console.error('Erro ao listar acessos do material:', error);
    res.status(500).json({ message: 'Erro ao listar acessos' });
  }
};

/**
 * Concede (ou reativa) o acesso de um e-mail a um material.
 * Idempotente: se já existir um acesso para o mesmo e-mail, ele é reaproveitado
 * — nunca cria acessos duplicados para a mesma pessoa.
 */
async function grantOne(
  material: any,
  email: string,
  opts: { validadeDias?: unknown; origem: 'cortesia' | 'admin'; enviarEmail: boolean }
) {
  const existente = await MaterialEntitlement.findOne({ material: material._id, email });
  const validade = resolveValidade(material, opts.validadeDias);
  const conta = await User.findOne({ email }).select('_id nomeCompleto');

  let ent = existente;
  let acao: 'criado' | 'reativado' | 'atualizado';

  if (ent) {
    const estavaValido = isEntitlementValid(ent);
    ent.revogado = false;
    ent.ativo = true;
    ent.validade = validade;
    if (conta && !ent.user) ent.user = conta._id as any;
    await ent.save();
    acao = estavaValido ? 'atualizado' : 'reativado';
  } else {
    ent = await MaterialEntitlement.create({
      material: material._id,
      materialTitulo: material.titulo,
      email,
      user: conta?._id,
      serialKey: generateSerialKey(),
      accessToken: crypto.randomBytes(32).toString('hex'),
      origem: opts.origem,
      validade,
      ativo: true,
      revogado: false,
      podeAvaliar: true
    });
    acao = 'criado';
  }

  const accessLink = buildAccessLink(ent!.accessToken);
  let emailEnviado = false;
  if (opts.enviarEmail) {
    emailEnviado = await sendMaterialGrantEmail({
      to: email,
      nome: conta?.nomeCompleto,
      materialTitulo: material.titulo,
      serialKey: ent!.serialKey,
      accessLink,
      validade: ent!.validade
    });
  }

  return { email, acao, emailEnviado, accessLink, entitlement: serializeEntitlement(ent) };
}

// @desc    Conceder acesso manual a um material (cortesia / suporte) (Admin)
// @route   POST /api/materials/admin/:id/grant
// @access  Private/Admin
export const grantMaterialAccess = async (req: AuthRequest, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material não encontrado' });

    const b = req.body || {};

    // Aceita: email (string), emails (array ou texto separado por vírgula/quebra
    // de linha) e/ou userIds (contas selecionadas no painel).
    const brutos: string[] = [];
    if (typeof b.emails === 'string') brutos.push(...b.emails.split(/[\s,;]+/));
    else if (Array.isArray(b.emails)) brutos.push(...b.emails.map((e: any) => String(e)));
    if (b.email) brutos.push(String(b.email));

    if (Array.isArray(b.userIds) && b.userIds.length) {
      const contas = await User.find({ _id: { $in: b.userIds } }).select('email');
      brutos.push(...contas.map((u) => u.email));
    }

    const emails = Array.from(new Set(brutos.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    if (!emails.length) return res.status(400).json({ message: 'Informe ao menos um e-mail' });

    const invalidos = emails.filter((e) => !EMAIL_REGEX.test(e));
    if (invalidos.length === emails.length) {
      return res.status(400).json({ message: `E-mail inválido: ${invalidos[0]}` });
    }

    const validos = emails.filter((e) => EMAIL_REGEX.test(e));
    const origem: 'cortesia' | 'admin' = b.origem === 'cortesia' ? 'cortesia' : 'admin';
    const enviarEmail = b.enviarEmail !== undefined ? !!b.enviarEmail : false;

    const resultados: any[] = [];
    for (const email of validos) {
      try {
        resultados.push(await grantOne(material, email, { validadeDias: b.validadeDias, origem, enviarEmail }));
      } catch (err) {
        console.error(`Erro ao conceder acesso para ${email}:`, err);
        resultados.push({ email, acao: 'erro', message: 'Falha ao conceder acesso' });
      }
    }
    for (const email of invalidos) {
      resultados.push({ email, acao: 'erro', message: 'E-mail inválido' });
    }

    const criados = resultados.filter((r) => r.acao === 'criado').length;
    const reativados = resultados.filter((r) => r.acao === 'reativado').length;
    const atualizados = resultados.filter((r) => r.acao === 'atualizado').length;
    const erros = resultados.filter((r) => r.acao === 'erro').length;

    const partes: string[] = [];
    if (criados) partes.push(`${criados} acesso(s) concedido(s)`);
    if (reativados) partes.push(`${reativados} reativado(s)`);
    if (atualizados) partes.push(`${atualizados} já tinha(m) acesso (validade atualizada)`);
    if (erros) partes.push(`${erros} com erro`);

    const primeiro = resultados.find((r) => r.acao !== 'erro');
    res.status(criados ? 201 : 200).json({
      message: partes.join(' · ') || 'Nenhum acesso alterado',
      resultados,
      // Compatibilidade com o formato antigo (concessão de um único e-mail)
      entitlement: primeiro?.entitlement,
      accessLink: primeiro?.accessLink
    });
  } catch (error) {
    console.error('Erro ao conceder acesso de material:', error);
    res.status(500).json({ message: 'Erro ao conceder acesso' });
  }
};

// @desc    Revogar/reativar/ajustar validade de um acesso (Admin)
// @route   PUT /api/materials/admin/entitlements/:id
// @access  Private/Admin
export const updateEntitlement = async (req: AuthRequest, res: Response) => {
  try {
    const ent = await MaterialEntitlement.findById(req.params.id);
    if (!ent) return res.status(404).json({ message: 'Acesso não encontrado' });
    const b = req.body || {};

    if (b.revogado !== undefined) {
      ent.revogado = !!b.revogado;
      // Reativar também religa o acesso (evita ficar "ativo: false" invisível).
      if (!b.revogado) ent.ativo = true;
    }
    if (b.ativo !== undefined) ent.ativo = !!b.ativo;
    if (b.podeAvaliar !== undefined) ent.podeAvaliar = !!b.podeAvaliar;

    // Validade: `null`/0 dias = vitalício; data ISO = data exata; dias = a partir de agora.
    if (b.validade !== undefined) {
      if (b.validade === null || b.validade === '') {
        ent.validade = undefined;
      } else {
        const d = new Date(b.validade);
        if (isNaN(d.getTime())) return res.status(400).json({ message: 'Data de validade inválida' });
        ent.validade = d;
      }
    } else if (b.validadeDias !== undefined) {
      const dias = Math.max(0, Number(b.validadeDias) || 0);
      if (dias === 0) {
        ent.validade = undefined;
      } else {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        ent.validade = d;
      }
    }

    await ent.save();
    res.json({ message: 'Acesso atualizado', entitlement: serializeEntitlement(ent) });
  } catch (error) {
    console.error('Erro ao atualizar acesso:', error);
    res.status(500).json({ message: 'Erro ao atualizar acesso' });
  }
};

// @desc    Remover definitivamente um acesso (Admin)
// @route   DELETE /api/materials/admin/entitlements/:id
// @access  Private/Admin
export const deleteEntitlement = async (req: AuthRequest, res: Response) => {
  try {
    const ent = await MaterialEntitlement.findById(req.params.id);
    if (!ent) return res.status(404).json({ message: 'Acesso não encontrado' });

    // Salvaguarda: acessos vindos de uma compra aprovada guardam o histórico do
    // cliente. Exigimos confirmação explícita para apagá-los (o normal é revogar).
    const force = req.query.force === 'true' || req.body?.force === true;
    if (ent.origem === 'compra' && !force) {
      return res.status(409).json({
        message: 'Este acesso veio de uma compra. Prefira revogar para preservar o histórico — ou confirme a exclusão definitiva.',
        requerConfirmacao: true
      });
    }

    await ent.deleteOne();
    res.json({ message: 'Acesso removido definitivamente' });
  } catch (error) {
    console.error('Erro ao remover acesso:', error);
    res.status(500).json({ message: 'Erro ao remover acesso' });
  }
};
