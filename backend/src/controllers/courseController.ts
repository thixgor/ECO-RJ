import { Request, Response } from 'express';
import Course, { isCourseExpired } from '../models/Course';
import Lesson from '../models/Lesson';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { registrarAcesso } from './accessLogController';
import { sendCourseEndedEmail } from '../services/emailService';

// @desc    Listar todos os cursos
// @route   GET /api/courses
// @access  Public (todos veem todos os cursos, acesso ao conteúdo é controlado nas aulas)
export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const { ativo, tipo, page = 1, limit = 1000 } = req.query;

    const query: any = {};
    if (ativo !== undefined) {
      query.ativo = ativo === 'true';
    }
    if (tipo !== undefined) {
      query.tipo = tipo;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('instrutor', 'nomeCompleto fotoPerfil')
        .sort({ ordem: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Course.countDocuments(query)
    ]);

    // Calcular duração total para cada curso
    const coursesWithDuration = await Promise.all(
      courses.map(async (course) => {
        const duracaoResult = await Lesson.aggregate([
          { $match: { cursoId: course._id } },
          { $group: { _id: null, total: { $sum: '$duracao' } } }
        ]);
        const duracaoTotal = duracaoResult.length > 0 ? duracaoResult[0].total : 0;
        const courseObj = course.toObject();
        (courseObj as any).duracaoTotal = duracaoTotal;
        return courseObj;
      })
    );

    res.json({
      courses: coursesWithDuration,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ message: 'Erro ao listar cursos' });
  }
};

// @desc    Obter curso por ID
// @route   GET /api/courses/:id
// @access  Public (todos veem o curso, mas acesso às aulas é controlado)
export const getCourseById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userCargo = req.user?.cargo;

    const course = await Course.findById(req.params.id)
      .populate('instrutor', 'nomeCompleto fotoPerfil bio')
      .populate({
        path: 'aulas',
        select: 'titulo descricao tipo duracao status ordem professor',
        options: { sort: { ordem: 1 } }
      });

    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    // Registrar acesso ao curso
    if (userId) {
      registrarAcesso(userId.toString(), 'curso', req, { cursoId: course._id.toString() });
    }

    // Curso encerrado? (data de término atingida)
    const expirado = isCourseExpired(course);

    // Envio oportunista do e-mail de término (uma única vez, em background).
    // Garante que os alunos sejam notificados mesmo sem um cron configurado.
    if (expirado && !course.terminoNotificado) {
      notifyCourseCompletion(course._id.toString()).catch((err) =>
        console.error('Erro ao notificar término do curso:', err)
      );
    }

    // Verificar se usuário tem acesso ao conteúdo (para informar no frontend)
    let temAcessoConteudo = false;
    // Administrador tem acesso total a todos os cursos
    if (userCargo === 'Administrador') {
      temAcessoConteudo = true;
    } else if (userCargo === 'Instrutor') {
      temAcessoConteudo = true;
    } else if (expirado) {
      // Curso encerrado: acesso dos alunos é interrompido a partir da data de término
      temAcessoConteudo = false;
    } else if (course.acessoRestrito) {
      // Curso restrito: precisa estar na lista de autorizados
      temAcessoConteudo = userId ? course.alunosAutorizados.some((id) => id.toString() === userId.toString()) : false;
    } else {
      // Curso não restrito: qualquer aluno tem acesso
      temAcessoConteudo = userCargo === 'Aluno';
    }

    // Contar total de aulas e materiais
    const totalAulas = await Lesson.countDocuments({ cursoId: course._id });
    const totalMateriais = await Lesson.countDocuments({ cursoId: course._id, tipo: 'material' });
    const totalAulasRegulares = await Lesson.countDocuments({
      cursoId: course._id,
      tipo: { $in: ['ao_vivo', 'gravada'] }
    });

    // Calcular duração total do curso (soma de todas as durações das aulas)
    const duracaoResult = await Lesson.aggregate([
      { $match: { cursoId: course._id } },
      { $group: { _id: null, total: { $sum: '$duracao' } } }
    ]);
    const duracaoTotal = duracaoResult.length > 0 ? duracaoResult[0].total : 0;

    // Retornar curso com info de acesso e contagens
    const courseObj = course.toObject();
    (courseObj as any).temAcessoConteudo = temAcessoConteudo;
    (courseObj as any).expirado = expirado;
    (courseObj as any).totalAulas = totalAulas;
    (courseObj as any).totalMateriais = totalMateriais;
    (courseObj as any).totalAulasRegulares = totalAulasRegulares;
    (courseObj as any).duracaoTotal = duracaoTotal;

    res.json(courseObj);
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ message: 'Erro ao buscar curso' });
  }
};

// @desc    Criar curso (Admin)
// @route   POST /api/courses
// @access  Private/Admin
export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const {
      titulo,
      descricao,
      dataInicio,
      dataTermino,
      imagemCapa,
      dataLimiteInscricao,
      acessoRestrito,
      alunosAutorizados,
      tipo
    } = req.body;

    if (!titulo || !descricao || !dataInicio) {
      return res.status(400).json({ message: 'Título, descrição e data de início são obrigatórios' });
    }

    const course = await Course.create({
      titulo,
      descricao,
      instrutor: req.user?._id,
      dataInicio: new Date(dataInicio),
      dataTermino: dataTermino ? new Date(dataTermino) : undefined,
      imagemCapa,
      dataLimiteInscricao: dataLimiteInscricao ? new Date(dataLimiteInscricao) : undefined,
      acessoRestrito: acessoRestrito || false,
      alunosAutorizados: alunosAutorizados || [],
      tipo: tipo || 'online'
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ message: 'Erro ao criar curso' });
  }
};

// @desc    Atualizar curso (Admin)
// @route   PUT /api/courses/:id
// @access  Private/Admin
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const {
      titulo,
      descricao,
      dataInicio,
      dataTermino,
      imagemCapa,
      ativo,
      dataLimiteInscricao,
      acessoRestrito,
      alunosAutorizados,
      tipo,
      exibirDuracao,
      certificadoDisponivel,
      emissaoCertificadoImediata
    } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    if (titulo) course.titulo = titulo;
    if (descricao) course.descricao = descricao;
    if (dataInicio) course.dataInicio = new Date(dataInicio);
    if (dataTermino !== undefined) {
      const novaData = dataTermino ? new Date(dataTermino) : undefined;
      // Se a data de término mudou (ou foi removida/adiada para o futuro),
      // reabilita o disparo do e-mail de término.
      const antiga = course.dataTermino ? new Date(course.dataTermino).getTime() : undefined;
      const nova = novaData ? novaData.getTime() : undefined;
      if (antiga !== nova) {
        course.terminoNotificado = false;
      }
      course.dataTermino = novaData;
    }
    if (imagemCapa !== undefined) course.imagemCapa = imagemCapa;
    if (ativo !== undefined) course.ativo = ativo;
    if (dataLimiteInscricao !== undefined) {
      course.dataLimiteInscricao = dataLimiteInscricao ? new Date(dataLimiteInscricao) : undefined;
    }
    if (acessoRestrito !== undefined) course.acessoRestrito = acessoRestrito;
    if (alunosAutorizados !== undefined) course.alunosAutorizados = alunosAutorizados;
    if (tipo !== undefined) course.tipo = tipo;
    if (exibirDuracao !== undefined) course.exibirDuracao = exibirDuracao;
    if (certificadoDisponivel !== undefined) course.certificadoDisponivel = certificadoDisponivel;
    if (emissaoCertificadoImediata !== undefined) course.emissaoCertificadoImediata = emissaoCertificadoImediata;

    await course.save();

    res.json(course);
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ message: 'Erro ao atualizar curso' });
  }
};

// @desc    Deletar curso (Admin)
// @route   DELETE /api/courses/:id
// @access  Private/Admin
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    // Deletar aulas associadas
    await Lesson.deleteMany({ cursoId: course._id });

    // Remover curso dos usuários inscritos
    await User.updateMany(
      { cursosInscritos: course._id },
      { $pull: { cursosInscritos: course._id } }
    );

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Curso deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar curso:', error);
    res.status(500).json({ message: 'Erro ao deletar curso' });
  }
};

// @desc    Inscrever-se em um curso
// @route   POST /api/courses/:id/enroll
// @access  Private
export const enrollCourse = async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    if (!course.ativo) {
      return res.status(400).json({ message: 'Este curso não está disponível para inscrição' });
    }

    // Verificar data limite de inscrição
    if (course.dataLimiteInscricao && new Date() > course.dataLimiteInscricao) {
      return res.status(400).json({ message: 'O prazo de inscrição para este curso já encerrou' });
    }

    // Verificar acesso restrito (administradores têm acesso irrestrito)
    const userId = req.user?._id;
    const userCargo = req.user?.cargo;
    if (course.acessoRestrito && userCargo !== 'Administrador') {
      const autorizado = course.alunosAutorizados.some((id) => id.toString() === userId?.toString());
      if (!autorizado) {
        return res.status(403).json({ message: 'Você não está autorizado a se inscrever neste curso' });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se já está inscrito
    if (user.cursosInscritos.includes(course._id as any)) {
      return res.status(400).json({ message: 'Você já está inscrito neste curso' });
    }

    user.cursosInscritos.push(course._id as any);
    await user.save();

    res.json({ message: 'Inscrição realizada com sucesso' });
  } catch (error) {
    console.error('Erro ao inscrever no curso:', error);
    res.status(500).json({ message: 'Erro ao inscrever no curso' });
  }
};

// @desc    Cancelar inscrição em um curso
// @route   DELETE /api/courses/:id/enroll
// @access  Private
export const unenrollCourse = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    user.cursosInscritos = user.cursosInscritos.filter(
      (id) => id.toString() !== req.params.id
    );
    await user.save();

    res.json({ message: 'Inscrição cancelada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar inscrição:', error);
    res.status(500).json({ message: 'Erro ao cancelar inscrição' });
  }
};

// @desc    Obter progresso do usuário no curso
// @route   GET /api/courses/:id/progress
// @access  Private
export const getCourseProgress = async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findById(req.params.id).populate('aulas');
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Filtrar apenas aulas válidas para progresso (excluir materiais)
    const aulasValidas = course.aulas.filter((aula: any) => aula.tipo !== 'material');
    const totalAulasValidas = aulasValidas.length;

    // Contar apenas aulas assistidas que não são materiais
    const aulasAssistidas = user.aulasAssistidas.filter((aulaId) =>
      aulasValidas.some((aula: any) => aula._id.toString() === aulaId.toString())
    ).length;

    const progresso = totalAulasValidas > 0 ? Math.round((aulasAssistidas / totalAulasValidas) * 100) : 0;

    // Também retornar informações sobre materiais separadamente
    const totalMateriais = course.aulas.filter((aula: any) => aula.tipo === 'material').length;

    res.json({
      totalAulas: totalAulasValidas,
      totalMateriais,
      aulasAssistidas,
      progresso
    });
  } catch (error) {
    console.error('Erro ao obter progresso:', error);
    res.status(500).json({ message: 'Erro ao obter progresso' });
  }
};

// @desc    Adicionar aluno autorizado ao curso (Admin)
// @route   POST /api/courses/:id/authorize
// @access  Private/Admin
export const addAuthorizedStudent = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se já está autorizado
    if (course.alunosAutorizados.some((id) => id.toString() === userId)) {
      return res.status(400).json({ message: 'Usuário já está autorizado para este curso' });
    }

    course.alunosAutorizados.push(userId);
    await course.save();

    res.json({ message: 'Usuário autorizado com sucesso', course });
  } catch (error) {
    console.error('Erro ao autorizar aluno:', error);
    res.status(500).json({ message: 'Erro ao autorizar aluno' });
  }
};

// @desc    Remover aluno autorizado do curso (Admin)
// @route   DELETE /api/courses/:id/authorize/:userId
// @access  Private/Admin
export const removeAuthorizedStudent = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    course.alunosAutorizados = course.alunosAutorizados.filter(
      (id) => id.toString() !== userId
    );
    await course.save();

    res.json({ message: 'Autorização removida com sucesso', course });
  } catch (error) {
    console.error('Erro ao remover autorização:', error);
    res.status(500).json({ message: 'Erro ao remover autorização' });
  }
};

// @desc    Listar alunos autorizados do curso (Admin)
// @route   GET /api/courses/:id/authorized
// @access  Private/Admin
export const getAuthorizedStudents = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('alunosAutorizados', 'nomeCompleto email cargo fotoPerfil');

    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    res.json(course.alunosAutorizados);
  } catch (error) {
    console.error('Erro ao listar alunos autorizados:', error);
    res.status(500).json({ message: 'Erro ao listar alunos autorizados' });
  }
};

// @desc    Reordenar cursos (Admin)
// @route   PUT /api/courses/reorder
// @access  Private/Admin
export const reorderCourses = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ message: 'Lista de ordens é obrigatória' });
    }

    // orders deve ser um array de { id: string, ordem: number }
    const bulkOps: any[] = orders.map((item: { id: string; ordem: number }) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { ordem: item.ordem } }
      }
    }));

    await Course.bulkWrite(bulkOps);

    res.json({ message: 'Cursos reordenados com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar cursos:', error);
    res.status(500).json({ message: 'Erro ao reordenar cursos' });
  }
};

/**
 * Notifica (uma única vez) os alunos de um curso encerrado, enviando o e-mail
 * de término. Usa reivindicação atômica (terminoNotificado) para evitar envios
 * duplicados mesmo com concorrência em ambiente serverless.
 *
 * @returns quantidade de e-mails enviados (0 se o curso não era elegível ou já
 *          foi notificado).
 */
export async function notifyCourseCompletion(courseId: string): Promise<number> {
  // Reivindicação atômica: só prossegue se o curso estiver vencido e ainda não notificado
  const curso = await Course.findOneAndUpdate(
    {
      _id: courseId,
      terminoNotificado: { $ne: true },
      dataTermino: { $exists: true, $ne: null, $lte: new Date() }
    },
    { $set: { terminoNotificado: true } },
    { new: true }
  ).select('titulo dataInicio dataTermino alunosAutorizados _id');

  if (!curso) return 0; // não elegível ou já notificado por outra execução

  // Alunos com acesso: inscritos no curso OU autorizados (curso restrito)
  const alunos = await User.find({
    ativo: true,
    $or: [
      { cursosInscritos: curso._id },
      ...(curso.alunosAutorizados?.length ? [{ _id: { $in: curso.alunosAutorizados } }] : [])
    ]
  }).select('nomeCompleto email');

  let enviados = 0;
  for (const aluno of alunos) {
    try {
      const ok = await sendCourseEndedEmail({
        to: aluno.email,
        nome: aluno.nomeCompleto,
        cursoTitulo: curso.titulo,
        dataInicio: curso.dataInicio,
        dataTermino: curso.dataTermino
      });
      if (ok) enviados++;
    } catch (err) {
      console.error(`Erro ao enviar e-mail de término para ${aluno.email}:`, err);
    }
  }
  return enviados;
}

// @desc    Processar cursos com data de término atingida: enviar e-mail de
//          encerramento aos alunos (o acesso já é interrompido automaticamente
//          pela verificação de data em getCourseById/getLessonById).
// @route   POST /api/courses/process-completions
// @access  Private/Admin (ou job agendado)
// @nota    Como a hospedagem é serverless (sem cron nativo), este endpoint pode
//          ser chamado por um agendador (ex: Vercel Cron). Além dele, o envio
//          também ocorre de forma oportunista quando um curso encerrado é
//          acessado. É idempotente: cada curso é notificado uma única vez.
export const processCourseCompletions = async (_req: AuthRequest, res: Response) => {
  try {
    // Cursos vencidos que ainda não notificaram os alunos
    const cursos = await Course.find({
      dataTermino: { $exists: true, $ne: null, $lte: new Date() },
      terminoNotificado: { $ne: true }
    }).select('_id');

    let emailsEnviados = 0;
    for (const curso of cursos) {
      emailsEnviados += await notifyCourseCompletion((curso._id as any).toString());
    }

    res.json({
      message: `Processamento concluído: ${cursos.length} curso(s) verificado(s), ${emailsEnviados} e-mail(s) enviado(s).`,
      cursosVerificados: cursos.length,
      emailsEnviados
    });
  } catch (error) {
    console.error('Erro ao processar términos de curso:', error);
    res.status(500).json({ message: 'Erro ao processar términos de curso' });
  }
};
