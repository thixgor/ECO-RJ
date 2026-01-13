import { Request, Response } from 'express';
import Lesson from '../models/Lesson';
import Course from '../models/Course';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { registrarAcesso } from './accessLogController';

// @desc    Listar aulas de um curso
// @route   GET /api/lessons/course/:courseId
// @access  Private
export const getLessonsByCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    // Retornar todas as aulas do curso para visualização
    // O controle de acesso é feito no frontend (aulas aparecem bloqueadas)
    // e no endpoint individual getLessonById
    const lessons = await Lesson.find({ cursoId: courseId })
      .sort({ ordem: 1, createdAt: 1 });

    res.json(lessons);
  } catch (error) {
    console.error('Erro ao listar aulas:', error);
    res.status(500).json({ message: 'Erro ao listar aulas' });
  }
};

// @desc    Obter aula por ID
// @route   GET /api/lessons/:id
// @access  Private
export const getLessonById = async (req: AuthRequest, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('cursoId', 'titulo acessoRestrito alunosAutorizados')
      .populate('exerciciosAnexados', 'titulo tipo')
      .populate('provasAnexadas', 'titulo');

    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    // Verificar permissão por cargo
    const userCargo = req.user?.cargo || 'Visitante';
    const userId = req.user?._id;

    if (!lesson.cargosPermitidos.includes(userCargo) && userCargo !== 'Administrador') {
      return res.status(403).json({
        message: 'Você não tem permissão para acessar esta aula. Aplique uma serial key válida no seu perfil.'
      });
    }

    // Verificar acesso restrito do curso
    const curso = lesson.cursoId as any;
    if (curso?.acessoRestrito && userCargo !== 'Administrador') {
      const autorizado = curso.alunosAutorizados?.some(
        (id: any) => id.toString() === userId?.toString()
      );
      if (!autorizado) {
        return res.status(403).json({
          message: 'Você não tem autorização para acessar aulas deste curso.'
        });
      }
    }

    // Registrar acesso à aula
    if (userId) {
      registrarAcesso(userId.toString(), 'aula', req, {
        aulaId: lesson._id.toString(),
        cursoId: curso?._id?.toString()
      });
    }

    res.json(lesson);
  } catch (error) {
    console.error('Erro ao buscar aula:', error);
    res.status(500).json({ message: 'Erro ao buscar aula' });
  }
};

// @desc    Criar aula (Admin)
// @route   POST /api/lessons
// @access  Private/Admin
export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const {
      titulo,
      descricao,
      tipo,
      embedVideo,
      dataHoraInicio,
      duracao,
      cargosPermitidos,
      cursoId,
      topicoId,
      subtopicoId,
      notasAula,
      professor,
      participantes,
      botoesPersonalizados,
      exerciciosAnexados,
      provasAnexadas,
      zoomMeetingId,
      zoomMeetingPassword
    } = req.body;

    // Descrição não é mais obrigatória
    if (!titulo || !tipo || !cursoId) {
      return res.status(400).json({
        message: 'Título, tipo e curso são obrigatórios'
      });
    }

    // Verificar se curso existe
    const course = await Course.findById(cursoId);
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    // Para aulas ao vivo, data/hora é obrigatória
    if (tipo === 'ao_vivo' && !dataHoraInicio) {
      return res.status(400).json({ message: 'Data/hora de início é obrigatória para aulas ao vivo' });
    }

    // Validar formato do Meeting ID do Zoom se fornecido
    if (zoomMeetingId) {
      const meetingIdClean = zoomMeetingId.replace(/\s|-/g, '');
      const meetingIdPattern = /^\d{9,11}$/;

      if (!meetingIdPattern.test(meetingIdClean)) {
        return res.status(400).json({
          message: 'Meeting ID inválido. Deve conter 9-11 dígitos numéricos.'
        });
      }
    }

    // Obter próxima ordem (baseado no subtópico, tópico ou curso)
    let ordemQuery: any = { cursoId };
    if (subtopicoId) {
      ordemQuery.subtopicoId = subtopicoId;
    } else if (topicoId) {
      ordemQuery.topicoId = topicoId;
      ordemQuery.subtopicoId = { $exists: false };
    } else {
      ordemQuery.topicoId = { $exists: false };
      ordemQuery.subtopicoId = { $exists: false };
    }
    const lastLesson = await Lesson.findOne(ordemQuery).sort({ ordem: -1 });
    const ordem = lastLesson ? lastLesson.ordem + 1 : 1;

    const lesson = await Lesson.create({
      titulo,
      descricao,
      tipo,
      embedVideo,
      dataHoraInicio: dataHoraInicio ? new Date(dataHoraInicio) : undefined,
      duracao,
      cargosPermitidos: cargosPermitidos || ['Aluno', 'Administrador'],
      cursoId,
      topicoId: topicoId || undefined,
      subtopicoId: subtopicoId || undefined,
      notasAula,
      ordem,
      professor,
      participantes: participantes || [],
      botoesPersonalizados: botoesPersonalizados || [],
      criadorId: req.user?._id,
      exerciciosAnexados: exerciciosAnexados || [],
      provasAnexadas: provasAnexadas || [],
      zoomMeetingId: zoomMeetingId || undefined,
      zoomMeetingPassword: zoomMeetingPassword || undefined
    });

    // Adicionar aula ao curso
    course.aulas.push(lesson._id as any);
    await course.save();

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Erro ao criar aula:', error);
    res.status(500).json({ message: 'Erro ao criar aula' });
  }
};

// @desc    Atualizar aula (Admin)
// @route   PUT /api/lessons/:id
// @access  Private/Admin
export const updateLesson = async (req: Request, res: Response) => {
  try {
    const {
      titulo,
      descricao,
      tipo,
      embedVideo,
      dataHoraInicio,
      duracao,
      cargosPermitidos,
      topicoId,
      subtopicoId,
      notasAula,
      status,
      ordem,
      professor,
      participantes,
      botoesPersonalizados,
      exerciciosAnexados,
      provasAnexadas,
      zoomMeetingId,
      zoomMeetingPassword
    } = req.body;

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    if (titulo) lesson.titulo = titulo;
    if (descricao) lesson.descricao = descricao;
    if (tipo) lesson.tipo = tipo;
    if (embedVideo !== undefined) lesson.embedVideo = embedVideo;
    if (dataHoraInicio) lesson.dataHoraInicio = new Date(dataHoraInicio);
    if (duracao !== undefined) lesson.duracao = duracao;
    if (cargosPermitidos) lesson.cargosPermitidos = cargosPermitidos;
    if (topicoId !== undefined) lesson.topicoId = topicoId || undefined;
    if (subtopicoId !== undefined) lesson.subtopicoId = subtopicoId || undefined;
    if (notasAula !== undefined) lesson.notasAula = notasAula;
    if (status) lesson.status = status;
    if (ordem !== undefined) lesson.ordem = ordem;
    if (professor !== undefined) lesson.professor = professor;
    if (participantes !== undefined) lesson.participantes = participantes;
    if (botoesPersonalizados !== undefined) lesson.botoesPersonalizados = botoesPersonalizados;
    if (exerciciosAnexados !== undefined) lesson.exerciciosAnexados = exerciciosAnexados;
    if (provasAnexadas !== undefined) lesson.provasAnexadas = provasAnexadas;
    if (zoomMeetingId !== undefined) lesson.zoomMeetingId = zoomMeetingId || undefined;
    if (zoomMeetingPassword !== undefined) lesson.zoomMeetingPassword = zoomMeetingPassword || undefined;

    await lesson.save();

    res.json(lesson);
  } catch (error) {
    console.error('Erro ao atualizar aula:', error);
    res.status(500).json({ message: 'Erro ao atualizar aula' });
  }
};

// @desc    Deletar aula (Admin)
// @route   DELETE /api/lessons/:id
// @access  Private/Admin
export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    // Remover aula do curso
    await Course.updateOne(
      { _id: lesson.cursoId },
      { $pull: { aulas: lesson._id } }
    );

    // Remover das aulas assistidas dos usuários
    await User.updateMany(
      { aulasAssistidas: lesson._id },
      { $pull: { aulasAssistidas: lesson._id } }
    );

    await Lesson.findByIdAndDelete(req.params.id);

    res.json({ message: 'Aula deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar aula:', error);
    res.status(500).json({ message: 'Erro ao deletar aula' });
  }
};

// @desc    Marcar aula como assistida
// @route   POST /api/lessons/:id/watched
// @access  Private
export const markAsWatched = async (req: AuthRequest, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se já assistiu
    if (!user.aulasAssistidas.includes(lesson._id as any)) {
      user.aulasAssistidas.push(lesson._id as any);
    }

    // Obter o cursoId corretamente
    const cursoId = typeof lesson.cursoId === 'string'
      ? lesson.cursoId
      : (lesson.cursoId as any)?._id || lesson.cursoId;

    // Atualizar última aula assistida
    user.ultimaAulaAssistida = {
      lessonId: lesson._id as any,
      cursoId: cursoId as any,
      assistidaEm: new Date(),
      progresso: undefined
    };

    await user.save();

    res.json({ message: 'Aula marcada como assistida' });
  } catch (error) {
    console.error('Erro ao marcar aula:', error);
    res.status(500).json({ message: 'Erro ao marcar aula como assistida' });
  }
};

// @desc    Atualizar progresso da aula (salva última aula assistida)
// @route   POST /api/lessons/:id/update-progress
// @access  Private
export const updateLessonProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { progresso } = req.body;

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Obter o cursoId corretamente
    const cursoId = typeof lesson.cursoId === 'string'
      ? lesson.cursoId
      : (lesson.cursoId as any)?._id || lesson.cursoId;

    // Atualizar última aula assistida com progresso
    user.ultimaAulaAssistida = {
      lessonId: lesson._id as any,
      cursoId: cursoId as any,
      assistidaEm: new Date(),
      progresso: progresso !== undefined ? Math.min(100, Math.max(0, Number(progresso))) : undefined
    };

    await user.save();

    res.json({
      message: 'Progresso atualizado',
      ultimaAulaAssistida: user.ultimaAulaAssistida
    });
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    res.status(500).json({ message: 'Erro ao atualizar progresso' });
  }
};

// @desc    Obter última aula assistida pelo usuário
// @route   GET /api/lessons/last-watched
// @access  Private
export const getLastWatchedLesson = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id)
      .populate({
        path: 'ultimaAulaAssistida.lessonId',
        select: 'titulo tipo duracao embedVideo status'
      })
      .populate({
        path: 'ultimaAulaAssistida.cursoId',
        select: 'titulo imagemCapa'
      });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (!user.ultimaAulaAssistida?.lessonId) {
      return res.json({ lastWatched: null });
    }

    const lesson = user.ultimaAulaAssistida.lessonId as any;
    const curso = user.ultimaAulaAssistida.cursoId as any;

    // Verificar se a aula ainda existe e está ativa
    if (!lesson || lesson.status === 'inativa') {
      return res.json({ lastWatched: null });
    }

    res.json({
      lastWatched: {
        _id: lesson._id,
        titulo: lesson.titulo,
        tipo: lesson.tipo,
        duracao: lesson.duracao,
        cursoId: curso?._id,
        cursoTitulo: curso?.titulo,
        cursoImagem: curso?.imagemCapa,
        progresso: user.ultimaAulaAssistida.progresso,
        assistidaEm: user.ultimaAulaAssistida.assistidaEm
      }
    });
  } catch (error) {
    console.error('Erro ao buscar última aula:', error);
    res.status(500).json({ message: 'Erro ao buscar última aula assistida' });
  }
};

// @desc    Listar todas as aulas (Admin)
// @route   GET /api/lessons
// @access  Private/Admin
export const getAllLessons = async (req: Request, res: Response) => {
  try {
    const { cursoId, tipo, status, topicoId, subtopicoId, page = 1, limit = 500 } = req.query;

    const query: any = {};
    if (cursoId) query.cursoId = cursoId;
    if (tipo) query.tipo = tipo;
    if (status) query.status = status;
    if (topicoId) {
      if (topicoId === 'null') {
        query.topicoId = { $exists: false };
      } else {
        query.topicoId = topicoId;
      }
    }
    if (subtopicoId) {
      if (subtopicoId === 'null') {
        query.subtopicoId = { $exists: false };
      } else {
        query.subtopicoId = subtopicoId;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [lessons, total] = await Promise.all([
      Lesson.find(query)
        .populate('cursoId', 'titulo')
        .populate('topicoId', 'titulo ordem')
        .populate('subtopicoId', 'titulo ordem')
        .sort({ ordem: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Lesson.countDocuments(query)
    ]);

    res.json({
      lessons,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar aulas:', error);
    res.status(500).json({ message: 'Erro ao listar aulas' });
  }
};

// @desc    Obter aulas ao vivo de hoje para os cursos do usuário
// @route   GET /api/lessons/live-today
// @access  Private
export const getLiveLessonsToday = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Obter IDs dos cursos inscritos (pode ser string ou objeto)
    const cursosInscritosRaw = user.cursosInscritos || [];
    if (cursosInscritosRaw.length === 0) {
      return res.json({ lessons: [] });
    }

    // Extrair IDs corretamente (pode ser ObjectId, string ou objeto populado)
    const cursoIds = cursosInscritosRaw.map((curso: any) => {
      if (typeof curso === 'string') return curso;
      if (curso._id) return curso._id.toString();
      return curso.toString();
    });

    // Calcular início e fim do dia atual no timezone do Brasil (UTC-3)
    const now = new Date();

    // Criar datas para início e fim do dia em UTC, ajustado para Brasil (UTC-3)
    // Início do dia no Brasil = 03:00 UTC do mesmo dia
    // Fim do dia no Brasil = 02:59:59 UTC do dia seguinte
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(3, 0, 0, 0); // 00:00 em Brasília = 03:00 UTC

    // Se agora for antes das 03:00 UTC, o dia brasileiro ainda é o dia anterior
    if (now.getUTCHours() < 3) {
      startOfDay.setUTCDate(startOfDay.getUTCDate() - 1);
    }

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCMilliseconds(-1); // 23:59:59.999 em Brasília

    // Buscar aulas ao vivo de hoje dos cursos inscritos
    const lessons = await Lesson.find({
      cursoId: { $in: cursoIds },
      tipo: 'ao_vivo',
      status: { $ne: 'inativa' },
      dataHoraInicio: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate('cursoId', 'titulo imagemCapa')
      .sort({ dataHoraInicio: 1 });

    // Filtrar por permissão de cargo
    const userCargo = user.cargo || 'Visitante';
    const filteredLessons = lessons.filter(lesson =>
      lesson.cargosPermitidos.includes(userCargo) || userCargo === 'Administrador'
    );

    res.json({ lessons: filteredLessons });
  } catch (error) {
    console.error('Erro ao buscar aulas ao vivo:', error);
    res.status(500).json({ message: 'Erro ao buscar aulas ao vivo' });
  }
};

// @desc    Obter próximas aulas ao vivo (próximos 7 dias)
// @route   GET /api/lessons/upcoming-live
// @access  Private
export const getUpcomingLiveLessons = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const cursosInscritos = user.cursosInscritos || [];
    if (cursosInscritos.length === 0) {
      return res.json({ lessons: [] });
    }

    const now = new Date();
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const lessons = await Lesson.find({
      cursoId: { $in: cursosInscritos },
      tipo: 'ao_vivo',
      status: { $ne: 'inativa' },
      dataHoraInicio: {
        $gte: now,
        $lte: oneWeekFromNow
      }
    })
      .populate('cursoId', 'titulo imagemCapa')
      .sort({ dataHoraInicio: 1 })
      .limit(10);

    const userCargo = user.cargo || 'Visitante';
    const filteredLessons = lessons.filter(lesson =>
      lesson.cargosPermitidos.includes(userCargo) || userCargo === 'Administrador'
    );

    res.json({ lessons: filteredLessons });
  } catch (error) {
    console.error('Erro ao buscar próximas aulas ao vivo:', error);
    res.status(500).json({ message: 'Erro ao buscar próximas aulas ao vivo' });
  }
};

// @desc    Reordenar aulas (Admin)
// @route   PUT /api/lessons/reorder
// @access  Private/Admin
export const reorderLessons = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ message: 'Lista de ordens é obrigatória' });
    }

    // orders deve ser um array de { id: string, ordem: number, topicoId?: string, subtopicoId?: string }
    const bulkOps: any[] = orders.map((item: { id: string; ordem: number; topicoId?: string | null; subtopicoId?: string | null }) => ({
      updateOne: {
        filter: { _id: item.id },
        update: {
          $set: {
            ordem: item.ordem,
            ...(item.topicoId !== undefined && { topicoId: item.topicoId || undefined }),
            ...(item.subtopicoId !== undefined && { subtopicoId: item.subtopicoId || undefined })
          }
        }
      }
    }));

    await Lesson.bulkWrite(bulkOps);

    res.json({ message: 'Aulas reordenadas com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar aulas:', error);
    res.status(500).json({ message: 'Erro ao reordenar aulas' });
  }
};
