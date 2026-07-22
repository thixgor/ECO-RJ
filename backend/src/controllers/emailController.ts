import { Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import EmailTemplate from '../models/EmailTemplate';
import EmailLog from '../models/EmailLog';
import User from '../models/User';
import Course from '../models/Course';
import {
  ensureTemplatesSeeded,
  getTemplate,
  renderString,
  renderSubject,
  sendTemplateEmail,
  sendCoursePurchaseEmail,
  sendCourseCompletionEmail,
  isEmailConfigured,
  getAppUrl,
  SendResult
} from '../utils/emailService';
import { renderBaseLayout, DEFAULT_TEMPLATES, EMAIL_BRAND } from '../utils/emailTemplates';

/** Limite de segurança para envios em massa por disparo. */
const MAX_DESTINATARIOS = 2000;

const CARGOS_VALIDOS = ['Visitante', 'Aluno', 'Instrutor', 'Administrador'];

/* -------------------------------------------------------------------------- */
/*  Status da configuração                                                    */
/* -------------------------------------------------------------------------- */

// @desc    Verificar se o envio de e-mails está configurado (SMTP)
// @route   GET /api/emails/config
// @access  Private/Admin
export const getEmailConfig = async (_req: AuthRequest, res: Response) => {
  try {
    const configured = isEmailConfigured();
    res.json({
      configured,
      modo: configured ? 'ativo' : 'simulado',
      remetente: process.env.EMAIL_FROM || process.env.SMTP_USER || EMAIL_BRAND.email,
      appUrl: getAppUrl()
    });
  } catch (error) {
    console.error('Erro ao obter config de e-mail:', error);
    res.status(500).json({ message: 'Erro ao obter configuração de e-mail' });
  }
};

/* -------------------------------------------------------------------------- */
/*  Templates                                                                 */
/* -------------------------------------------------------------------------- */

// @desc    Listar templates (garante seed dos padrões)
// @route   GET /api/emails/templates
// @access  Private/Admin
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplatesSeeded();

    const { categoria } = req.query;
    const query: any = {};
    if (categoria) query.categoria = categoria;

    const templates = await EmailTemplate.find(query).sort({ categoria: 1, nome: 1 });
    res.json({ templates });
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ message: 'Erro ao listar templates' });
  }
};

// @desc    Obter template por ID
// @route   GET /api/emails/templates/:id
// @access  Private/Admin
export const getTemplateById = async (req: AuthRequest, res: Response) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }
    res.json(template);
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    res.status(500).json({ message: 'Erro ao buscar template' });
  }
};

// @desc    Atualizar template (assunto, corpo, descrição, ativo)
// @route   PUT /api/emails/templates/:id
// @access  Private/Admin
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { nome, assunto, corpoHtml, descricao, ativo } = req.body;

    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }

    if (assunto !== undefined) {
      if (!assunto.trim()) {
        return res.status(400).json({ message: 'O assunto não pode ficar vazio' });
      }
      template.assunto = assunto;
    }
    if (corpoHtml !== undefined) {
      if (!corpoHtml.trim()) {
        return res.status(400).json({ message: 'O corpo do e-mail não pode ficar vazio' });
      }
      template.corpoHtml = corpoHtml;
    }
    // Nome só é editável em templates manuais
    if (nome !== undefined && !template.sistema) template.nome = nome;
    if (descricao !== undefined) template.descricao = descricao;
    if (ativo !== undefined) template.ativo = Boolean(ativo);

    await template.save();
    res.json({ message: 'Template atualizado com sucesso', template });
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ message: 'Erro ao atualizar template' });
  }
};

// @desc    Restaurar template ao padrão original
// @route   POST /api/emails/templates/:id/reset
// @access  Private/Admin
export const resetTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template não encontrado' });
    }

    const def = DEFAULT_TEMPLATES.find((t) => t.key === template.key);
    if (!def) {
      return res.status(400).json({ message: 'Este template não possui um padrão para restauração' });
    }

    template.nome = def.nome;
    template.descricao = def.descricao;
    template.assunto = def.assunto;
    template.corpoHtml = def.corpoHtml;
    template.variaveis = def.variaveis;
    await template.save();

    res.json({ message: 'Template restaurado ao padrão', template });
  } catch (error) {
    console.error('Erro ao restaurar template:', error);
    res.status(500).json({ message: 'Erro ao restaurar template' });
  }
};

// @desc    Pré-visualizar um e-mail renderizado (sem enviar)
// @route   POST /api/emails/preview
// @access  Private/Admin
export const previewEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { templateKey, assunto, corpoHtml, vars = {} } = req.body;

    let assuntoRaw = assunto;
    let corpoRaw = corpoHtml;

    if ((assuntoRaw === undefined || corpoRaw === undefined) && templateKey) {
      const template = await getTemplate(templateKey);
      if (!template) {
        return res.status(404).json({ message: 'Template não encontrado' });
      }
      if (assuntoRaw === undefined) assuntoRaw = template.assunto;
      if (corpoRaw === undefined) corpoRaw = template.corpoHtml;
    }

    if (assuntoRaw === undefined || corpoRaw === undefined) {
      return res.status(400).json({ message: 'Informe um template ou o assunto e corpo do e-mail' });
    }

    // Preenche variáveis de amostra para as não informadas
    const sampleVars: Record<string, string> = {
      nome: 'Maria',
      nomeCompleto: 'Maria Santos',
      email: 'maria@exemplo.com',
      cargo: 'Aluno',
      titulo: 'Título do comunicado',
      mensagem: 'Esta é uma mensagem de exemplo para pré-visualização.',
      curso: 'Ecocardiografia Básica',
      linkPlataforma: `${getAppUrl()}/dashboard`,
      ...vars
    };

    const subject = renderSubject(assuntoRaw, sampleVars);
    const inner = renderString(corpoRaw, sampleVars);
    const html = renderBaseLayout(inner);

    res.json({ subject, html });
  } catch (error) {
    console.error('Erro ao pré-visualizar e-mail:', error);
    res.status(500).json({ message: 'Erro ao pré-visualizar e-mail' });
  }
};

/* -------------------------------------------------------------------------- */
/*  Destinatários (filtragem)                                                 */
/* -------------------------------------------------------------------------- */

/** Monta o filtro Mongo de usuários a partir dos parâmetros de segmentação. */
async function buildRecipientQuery(params: {
  cargo?: string;
  cursoId?: string;
  ativo?: string;
  search?: string;
}): Promise<any> {
  const query: any = {};

  if (params.cargo && CARGOS_VALIDOS.includes(params.cargo)) {
    query.cargo = params.cargo;
  }

  // Segmentação por acesso a um curso: inscritos OU autorizados
  if (params.cursoId) {
    const course = await Course.findById(params.cursoId).select('alunosAutorizados');
    const autorizados = course?.alunosAutorizados || [];
    query.$or = [
      { cursosInscritos: params.cursoId },
      ...(autorizados.length > 0 ? [{ _id: { $in: autorizados } }] : [])
    ];
  }

  // Status ativo (padrão: apenas ativos, para não enviar a contas desativadas)
  if (params.ativo === 'false') {
    query.ativo = false;
  } else if (params.ativo === 'todos') {
    // não filtra
  } else {
    query.ativo = true;
  }

  if (params.search) {
    const regex = new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchOr = [{ nomeCompleto: regex }, { email: regex }];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchOr }];
      delete query.$or;
    } else {
      query.$or = searchOr;
    }
  }

  return query;
}

// @desc    Listar destinatários conforme filtro (com contagem)
// @route   GET /api/emails/recipients
// @access  Private/Admin
export const getRecipients = async (req: AuthRequest, res: Response) => {
  try {
    const { cargo, cursoId, ativo, search } = req.query as Record<string, string>;
    const query = await buildRecipientQuery({ cargo, cursoId, ativo, search });

    const [users, total] = await Promise.all([
      User.find(query)
        .select('nomeCompleto email cargo fotoPerfil ativo')
        .sort({ nomeCompleto: 1 })
        .limit(500),
      User.countDocuments(query)
    ]);

    res.json({ recipients: users, total });
  } catch (error) {
    console.error('Erro ao listar destinatários:', error);
    res.status(500).json({ message: 'Erro ao listar destinatários' });
  }
};

/* -------------------------------------------------------------------------- */
/*  Envio em massa                                                            */
/* -------------------------------------------------------------------------- */

// @desc    Enviar e-mail para destinatários filtrados ou selecionados
// @route   POST /api/emails/send
// @access  Private/Admin
export const sendBulkEmail = async (req: AuthRequest, res: Response) => {
  try {
    const {
      templateKey,
      assunto,          // opcional: sobrescreve o assunto do template
      corpoHtml,        // opcional: sobrescreve o corpo do template
      vars = {},        // variáveis fixas (titulo, mensagem, etc.)
      userIds,          // lista explícita de destinatários (opcional)
      filtro = {}       // { cargo, cursoId, ativo, search }
    } = req.body;

    // Validar que há conteúdo
    let assuntoBase = assunto;
    let corpoBase = corpoHtml;

    if ((!assuntoBase || !corpoBase) && templateKey) {
      const template = await getTemplate(templateKey);
      if (!template) {
        return res.status(404).json({ message: 'Template não encontrado' });
      }
      if (!assuntoBase) assuntoBase = template.assunto;
      if (!corpoBase) corpoBase = template.corpoHtml;
    }

    if (!assuntoBase || !corpoBase) {
      return res.status(400).json({ message: 'Informe um template ou o assunto e o corpo do e-mail' });
    }

    // Resolver destinatários
    let users;
    if (Array.isArray(userIds) && userIds.length > 0) {
      users = await User.find({ _id: { $in: userIds }, ativo: true })
        .select('nomeCompleto email cargo');
    } else {
      const query = await buildRecipientQuery(filtro);
      users = await User.find(query).select('nomeCompleto email cargo').limit(MAX_DESTINATARIOS);
    }

    if (!users || users.length === 0) {
      return res.status(400).json({ message: 'Nenhum destinatário encontrado para os filtros selecionados' });
    }

    if (users.length > MAX_DESTINATARIOS) {
      return res.status(400).json({
        message: `Muitos destinatários (${users.length}). Limite por envio: ${MAX_DESTINATARIOS}.`
      });
    }

    const loteId = crypto.randomBytes(8).toString('hex');
    const linkPlataforma = `${getAppUrl()}/dashboard`;

    const contadores = { enviados: 0, simulados: 0, falhas: 0 };

    // Envio sequencial para não sobrecarregar o SMTP
    for (const u of users) {
      const primeiroNome = u.nomeCompleto?.split(' ')[0] || u.nomeCompleto;
      const result: SendResult = await sendTemplateEmail({
        templateKey: templateKey || 'personalizado',
        to: u.email,
        nomeDestinatario: u.nomeCompleto,
        destinatario: u._id,
        enviadoPor: req.user!._id,
        categoria: 'manual',
        loteId,
        assuntoOverride: assuntoBase,
        corpoOverride: corpoBase,
        vars: {
          ...vars,
          nome: primeiroNome,
          nomeCompleto: u.nomeCompleto,
          email: u.email,
          cargo: u.cargo,
          linkPlataforma
        }
      });

      if (result.status === 'enviado') contadores.enviados++;
      else if (result.status === 'simulado') contadores.simulados++;
      else contadores.falhas++;
    }

    res.json({
      message: isEmailConfigured()
        ? `E-mails processados: ${contadores.enviados} enviado(s), ${contadores.falhas} falha(s).`
        : `Modo simulado (SMTP não configurado): ${contadores.simulados} e-mail(s) registrado(s) no histórico, mas não enviados.`,
      loteId,
      total: users.length,
      ...contadores,
      modo: isEmailConfigured() ? 'ativo' : 'simulado'
    });
  } catch (error) {
    console.error('Erro ao enviar e-mails:', error);
    res.status(500).json({ message: 'Erro ao enviar e-mails' });
  }
};

/* -------------------------------------------------------------------------- */
/*  Comprovante de compra (placeholder Mercado Pago)                          */
/* -------------------------------------------------------------------------- */

// @desc    Disparar manualmente o comprovante de compra de um curso
// @route   POST /api/emails/purchase-receipt
// @access  Private/Admin
export const sendPurchaseReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, cursoId, valor, metodoPagamento, idTransacao, duracao } = req.body;

    if (!userId || !cursoId) {
      return res.status(400).json({ message: 'Usuário e curso são obrigatórios' });
    }

    const [user, course] = await Promise.all([
      User.findById(userId).select('nomeCompleto email _id'),
      Course.findById(cursoId).select('titulo descricao dataInicio dataTermino _id')
    ]);

    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (!course) return res.status(404).json({ message: 'Curso não encontrado' });

    const result = await sendCoursePurchaseEmail(
      user,
      course as any,
      { valor, metodoPagamento, idTransacao, duracao },
      req.user!._id
    );

    res.json({ message: 'Comprovante de compra disparado', status: result.status, erro: result.erro });
  } catch (error) {
    console.error('Erro ao enviar comprovante de compra:', error);
    res.status(500).json({ message: 'Erro ao enviar comprovante de compra' });
  }
};

/* -------------------------------------------------------------------------- */
/*  Término de cursos (job disparável)                                        */
/* -------------------------------------------------------------------------- */

// @desc    Processar cursos que atingiram a data de término e enviar e-mails
// @route   POST /api/emails/process-course-completions
// @access  Private/Admin
export const processCourseCompletions = async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    // Cursos com data de término já atingida
    const cursos = await Course.find({
      dataTermino: { $exists: true, $ne: null, $lte: now }
    }).select('titulo dataInicio dataTermino alunosAutorizados _id');

    let totalEnviados = 0;
    let totalIgnorados = 0;
    let cursosProcessados = 0;

    for (const curso of cursos) {
      cursosProcessados++;

      // Alunos com acesso: inscritos + autorizados
      const alunos = await User.find({
        ativo: true,
        $or: [
          { cursosInscritos: curso._id },
          ...(curso.alunosAutorizados?.length ? [{ _id: { $in: curso.alunosAutorizados } }] : [])
        ]
      }).select('nomeCompleto email _id');

      for (const aluno of alunos) {
        const result = await sendCourseCompletionEmail(aluno, curso as any);
        if (result.status === 'ignorado') totalIgnorados++;
        else totalEnviados++;
      }
    }

    res.json({
      message: `Processamento concluído: ${totalEnviados} e-mail(s) de término disparado(s).`,
      cursosProcessados,
      enviados: totalEnviados,
      ignorados: totalIgnorados
    });
  } catch (error) {
    console.error('Erro ao processar términos de curso:', error);
    res.status(500).json({ message: 'Erro ao processar términos de curso' });
  }
};

/* -------------------------------------------------------------------------- */
/*  Histórico e estatísticas                                                  */
/* -------------------------------------------------------------------------- */

// @desc    Listar histórico de e-mails
// @route   GET /api/emails/logs
// @access  Private/Admin
export const getEmailLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { status, categoria, templateKey, search, page = 1, limit = 30 } = req.query as Record<string, string>;

    const query: any = {};
    if (status) query.status = status;
    if (categoria) query.categoria = categoria;
    if (templateKey) query.templateKey = templateKey;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ para: regex }, { assunto: regex }, { nomeDestinatario: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .populate('enviadoPor', 'nomeCompleto')
        .populate('cursoRelacionado', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      EmailLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar histórico de e-mails:', error);
    res.status(500).json({ message: 'Erro ao listar histórico de e-mails' });
  }
};

// @desc    Estatísticas de e-mails
// @route   GET /api/emails/stats
// @access  Private/Admin
export const getEmailStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [porStatus, total, ultimos30] = await Promise.all([
      EmailLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      EmailLog.countDocuments({}),
      EmailLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    const statusMap: Record<string, number> = { enviado: 0, falhou: 0, simulado: 0, pendente: 0 };
    porStatus.forEach((s: any) => { statusMap[s._id] = s.count; });

    res.json({
      total,
      ultimos30dias: ultimos30,
      porStatus: statusMap,
      configurado: isEmailConfigured()
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de e-mail:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas de e-mail' });
  }
};

// @desc    Deletar registros do histórico (limpeza)
// @route   DELETE /api/emails/logs
// @access  Private/Admin
export const clearEmailLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const query: any = {};
    if (status) query.status = status;

    const result = await EmailLog.deleteMany(query);
    res.json({ message: `${result.deletedCount} registro(s) removido(s)`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Erro ao limpar histórico de e-mails:', error);
    res.status(500).json({ message: 'Erro ao limpar histórico de e-mails' });
  }
};
