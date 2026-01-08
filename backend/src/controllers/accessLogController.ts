import { Request, Response } from 'express';
import AccessLog from '../models/AccessLog';
import { AuthRequest } from '../middleware/auth';

// Helper para obter IP do request
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
};

// Helper para registrar acesso (usado por outros controllers)
export const registrarAcesso = async (
  usuarioId: string,
  tipo: 'curso' | 'aula' | 'exercicio' | 'prova' | 'login',
  req: Request,
  opcoes?: {
    cursoId?: string;
    aulaId?: string;
    exercicioId?: string;
    provaId?: string;
  }
) => {
  try {
    await AccessLog.create({
      usuarioId,
      tipo,
      cursoId: opcoes?.cursoId,
      aulaId: opcoes?.aulaId,
      exercicioId: opcoes?.exercicioId,
      provaId: opcoes?.provaId,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent']
    });
  } catch (error) {
    console.error('Erro ao registrar log de acesso:', error);
  }
};

// @desc    Listar logs de acesso (Admin)
// @route   GET /api/access-logs
// @access  Private/Admin
export const getAccessLogs = async (req: Request, res: Response) => {
  try {
    const {
      usuarioId,
      tipo,
      cursoId,
      aulaId,
      dataInicio,
      dataFim,
      page = 1,
      limit = 50
    } = req.query;

    const query: any = {};

    if (usuarioId) query.usuarioId = usuarioId;
    if (tipo) query.tipo = tipo;
    if (cursoId) query.cursoId = cursoId;
    if (aulaId) query.aulaId = aulaId;

    // Filtro de data
    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) query.createdAt.$gte = new Date(dataInicio as string);
      if (dataFim) query.createdAt.$lte = new Date(dataFim as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AccessLog.find(query)
        .populate('usuarioId', 'nomeCompleto email cargo')
        .populate('cursoId', 'titulo')
        .populate('aulaId', 'titulo')
        .populate('exercicioId', 'titulo')
        .populate('provaId', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AccessLog.countDocuments(query)
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
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ message: 'Erro ao listar logs de acesso' });
  }
};

// @desc    Obter logs de um usuário específico (Admin)
// @route   GET /api/access-logs/user/:userId
// @access  Private/Admin
export const getUserAccessLogs = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AccessLog.find({ usuarioId: userId })
        .populate('cursoId', 'titulo')
        .populate('aulaId', 'titulo')
        .populate('exercicioId', 'titulo')
        .populate('provaId', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AccessLog.countDocuments({ usuarioId: userId })
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
    console.error('Erro ao listar logs do usuário:', error);
    res.status(500).json({ message: 'Erro ao listar logs do usuário' });
  }
};

// @desc    Estatísticas de acesso (Admin)
// @route   GET /api/access-logs/stats
// @access  Private/Admin
export const getAccessStats = async (req: Request, res: Response) => {
  try {
    const { dataInicio, dataFim } = req.query;

    const matchStage: any = {};
    if (dataInicio || dataFim) {
      matchStage.createdAt = {};
      if (dataInicio) matchStage.createdAt.$gte = new Date(dataInicio as string);
      if (dataFim) matchStage.createdAt.$lte = new Date(dataFim as string);
    }

    const [
      totalLogs,
      logsPorTipo,
      logsPorDia,
      aulasMAisAcessadas,
      usuariosMaisAtivos
    ] = await Promise.all([
      // Total de logs
      AccessLog.countDocuments(matchStage),

      // Logs por tipo
      AccessLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$tipo', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Logs por dia (últimos 30 dias)
      AccessLog.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Aulas mais acessadas
      AccessLog.aggregate([
        { $match: { ...matchStage, tipo: 'aula', aulaId: { $exists: true } } },
        { $group: { _id: '$aulaId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'lessons',
            localField: '_id',
            foreignField: '_id',
            as: 'aula'
          }
        },
        { $unwind: '$aula' },
        { $project: { titulo: '$aula.titulo', count: 1 } }
      ]),

      // Usuários mais ativos
      AccessLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$usuarioId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'usuario'
          }
        },
        { $unwind: '$usuario' },
        { $project: { nomeCompleto: '$usuario.nomeCompleto', email: '$usuario.email', count: 1 } }
      ])
    ]);

    res.json({
      totalLogs,
      logsPorTipo,
      logsPorDia,
      aulasMAisAcessadas,
      usuariosMaisAtivos
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas de acesso' });
  }
};

// @desc    Obter meus logs de acesso
// @route   GET /api/access-logs/me
// @access  Private
export const getMyAccessLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AccessLog.find({ usuarioId: req.user?._id })
        .populate('cursoId', 'titulo')
        .populate('aulaId', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AccessLog.countDocuments({ usuarioId: req.user?._id })
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
    console.error('Erro ao listar meus logs:', error);
    res.status(500).json({ message: 'Erro ao listar histórico de acesso' });
  }
};
