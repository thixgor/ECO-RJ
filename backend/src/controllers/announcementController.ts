import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Announcement from '../models/Announcement';
import Course from '../models/Course';

// @desc    Listar todos os avisos (Admin)
// @route   GET /api/announcements
// @access  Private/Admin
export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, ativo, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (tipo) query.tipo = tipo;
    if (ativo !== undefined) query.ativo = ativo === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate('criadoPor', 'nomeCompleto email')
        .populate('cursosAlvo', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Announcement.countDocuments(query)
    ]);

    res.json({
      announcements,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar avisos:', error);
    res.status(500).json({ message: 'Erro ao listar avisos' });
  }
};

// @desc    Obter avisos para o dashboard do usuário
// @route   GET /api/announcements/user
// @access  Private
export const getUserAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const now = new Date();
    const baseQuery: any = {
      ativo: true,
      $or: [
        { dataExpiracao: { $exists: false } },
        { dataExpiracao: null },
        { dataExpiracao: { $gt: now } }
      ]
    };

    let announcements: any[] = [];

    // 1. Avisos gerais - todos os usuários veem
    const avisosGerais = await Announcement.find({
      ...baseQuery,
      tipo: 'geral'
    })
      .populate('criadoPor', 'nomeCompleto')
      .sort({ prioridade: -1, createdAt: -1 });

    announcements = [...avisosGerais];

    // 2. Avisos para alunos - todos exceto Visitante
    if (user.cargo !== 'Visitante') {
      const avisosAlunos = await Announcement.find({
        ...baseQuery,
        tipo: 'alunos'
      })
        .populate('criadoPor', 'nomeCompleto')
        .sort({ prioridade: -1, createdAt: -1 });

      announcements = [...announcements, ...avisosAlunos];
    }

    // 3. Avisos para cursos específicos - apenas usuários inscritos nesses cursos
    const cursosInscritos = user.cursosInscritos || [];

    if (cursosInscritos.length > 0) {
      const avisosCursos = await Announcement.find({
        ...baseQuery,
        tipo: 'curso_especifico',
        cursosAlvo: { $in: cursosInscritos }
      })
        .populate('criadoPor', 'nomeCompleto')
        .populate('cursosAlvo', 'titulo')
        .sort({ prioridade: -1, createdAt: -1 });

      announcements = [...announcements, ...avisosCursos];
    }

    // Ordenar por prioridade e data
    announcements.sort((a, b) => {
      const priorityOrder: Record<string, number> = { alta: 3, normal: 2, baixa: 1 };
      const priorityDiff = (priorityOrder[b.prioridade] || 2) - (priorityOrder[a.prioridade] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ announcements });
  } catch (error) {
    console.error('Erro ao buscar avisos do usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar avisos' });
  }
};

// @desc    Criar novo aviso (Admin)
// @route   POST /api/announcements
// @access  Private/Admin
export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, conteudo, tipo, cursosAlvo, prioridade, dataExpiracao } = req.body;

    if (!titulo || !conteudo || !tipo) {
      return res.status(400).json({
        message: 'Título, conteúdo e tipo são obrigatórios'
      });
    }

    // Validar tipo
    const validTypes = ['geral', 'alunos', 'curso_especifico'];
    if (!validTypes.includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de aviso inválido' });
    }

    // Se for curso_especifico, validar se cursosAlvo foi fornecido
    if (tipo === 'curso_especifico') {
      if (!cursosAlvo || !Array.isArray(cursosAlvo) || cursosAlvo.length === 0) {
        return res.status(400).json({
          message: 'Para avisos de curso específico, é necessário selecionar ao menos um curso'
        });
      }

      // Verificar se os cursos existem
      const cursosExistentes = await Course.countDocuments({
        _id: { $in: cursosAlvo }
      });

      if (cursosExistentes !== cursosAlvo.length) {
        return res.status(400).json({ message: 'Um ou mais cursos selecionados não existem' });
      }
    }

    const announcement = await Announcement.create({
      titulo,
      conteudo,
      tipo,
      cursosAlvo: tipo === 'curso_especifico' ? cursosAlvo : [],
      criadoPor: req.user!._id,
      prioridade: prioridade || 'normal',
      dataExpiracao: dataExpiracao || undefined
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('criadoPor', 'nomeCompleto email')
      .populate('cursosAlvo', 'titulo');

    res.status(201).json({
      message: 'Aviso criado com sucesso',
      announcement: populatedAnnouncement
    });
  } catch (error) {
    console.error('Erro ao criar aviso:', error);
    res.status(500).json({ message: 'Erro ao criar aviso' });
  }
};

// @desc    Atualizar aviso (Admin)
// @route   PUT /api/announcements/:id
// @access  Private/Admin
export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, conteudo, tipo, cursosAlvo, prioridade, dataExpiracao, ativo } = req.body;

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Aviso não encontrado' });
    }

    // Validar tipo se fornecido
    if (tipo) {
      const validTypes = ['geral', 'alunos', 'curso_especifico'];
      if (!validTypes.includes(tipo)) {
        return res.status(400).json({ message: 'Tipo de aviso inválido' });
      }

      // Se for curso_especifico, validar cursosAlvo
      if (tipo === 'curso_especifico') {
        const cursos = cursosAlvo || announcement.cursosAlvo;
        if (!cursos || cursos.length === 0) {
          return res.status(400).json({
            message: 'Para avisos de curso específico, é necessário selecionar ao menos um curso'
          });
        }
      }
    }

    // Atualizar campos
    if (titulo !== undefined) announcement.titulo = titulo;
    if (conteudo !== undefined) announcement.conteudo = conteudo;
    if (tipo !== undefined) {
      announcement.tipo = tipo;
      // Limpar cursosAlvo se não for curso_especifico
      if (tipo !== 'curso_especifico') {
        announcement.cursosAlvo = [];
      }
    }
    if (cursosAlvo !== undefined && announcement.tipo === 'curso_especifico') {
      announcement.cursosAlvo = cursosAlvo;
    }
    if (prioridade !== undefined) announcement.prioridade = prioridade;
    if (dataExpiracao !== undefined) announcement.dataExpiracao = dataExpiracao || undefined;
    if (ativo !== undefined) announcement.ativo = ativo;

    await announcement.save();

    const updatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('criadoPor', 'nomeCompleto email')
      .populate('cursosAlvo', 'titulo');

    res.json({
      message: 'Aviso atualizado com sucesso',
      announcement: updatedAnnouncement
    });
  } catch (error) {
    console.error('Erro ao atualizar aviso:', error);
    res.status(500).json({ message: 'Erro ao atualizar aviso' });
  }
};

// @desc    Alternar visibilidade do aviso (ocultar/exibir)
// @route   PUT /api/announcements/:id/toggle
// @access  Private/Admin
export const toggleAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Aviso não encontrado' });
    }

    announcement.ativo = !announcement.ativo;
    await announcement.save();

    res.json({
      message: announcement.ativo ? 'Aviso exibido com sucesso' : 'Aviso ocultado com sucesso',
      ativo: announcement.ativo
    });
  } catch (error) {
    console.error('Erro ao alternar visibilidade do aviso:', error);
    res.status(500).json({ message: 'Erro ao alternar visibilidade' });
  }
};

// @desc    Deletar aviso (Admin)
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Aviso não encontrado' });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({ message: 'Aviso deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar aviso:', error);
    res.status(500).json({ message: 'Erro ao deletar aviso' });
  }
};

// @desc    Deletar todos os avisos (Admin)
// @route   DELETE /api/announcements/all
// @access  Private/Admin
export const deleteAllAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const result = await Announcement.deleteMany({});

    res.json({
      message: `${result.deletedCount} avisos deletados com sucesso`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Erro ao deletar todos os avisos:', error);
    res.status(500).json({ message: 'Erro ao deletar avisos' });
  }
};

// @desc    Obter aviso por ID (Admin)
// @route   GET /api/announcements/:id
// @access  Private/Admin
export const getAnnouncementById = async (req: AuthRequest, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('criadoPor', 'nomeCompleto email')
      .populate('cursosAlvo', 'titulo');

    if (!announcement) {
      return res.status(404).json({ message: 'Aviso não encontrado' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Erro ao buscar aviso:', error);
    res.status(500).json({ message: 'Erro ao buscar aviso' });
  }
};
