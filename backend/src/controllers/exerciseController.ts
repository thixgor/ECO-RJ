import { Request, Response } from 'express';
import Exercise from '../models/Exercise';
import ExerciseAnswer from '../models/ExerciseAnswer';
import Lesson from '../models/Lesson';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar exercícios de uma aula
// @route   GET /api/exercises/lesson/:lessonId
// @access  Private
export const getExercisesByLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userCargo = req.user?.cargo || 'Visitante';
    const userId = req.user?._id;

    // Buscar aula com informações do curso
    const lesson = await Lesson.findById(lessonId).populate({
      path: 'cursoId',
      select: 'acessoRestrito alunosAutorizados'
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    // Verificar acesso ao curso restrito (exceto admin)
    if (userCargo !== 'Administrador') {
      const curso = lesson.cursoId as any;
      if (curso && curso.acessoRestrito) {
        const alunosAutorizados = curso.alunosAutorizados || [];
        const isAuthorized = alunosAutorizados.some((alunoId: any) =>
          alunoId.toString() === userId?.toString()
        );

        if (!isAuthorized) {
          return res.status(403).json({
            message: 'Você não tem acesso aos exercícios desta aula. Este curso possui acesso restrito.'
          });
        }
      }
    }

    const exercises = await Exercise.find({ aulaId: lessonId });

    // Filtrar exercícios baseado no cargo do usuário (admin vê todos)
    const filteredExercises = userCargo === 'Administrador'
      ? exercises
      : exercises.filter((exercise) =>
          exercise.cargosPermitidos.includes(userCargo)
        );

    res.json(filteredExercises);
  } catch (error) {
    console.error('Erro ao listar exercícios:', error);
    res.status(500).json({ message: 'Erro ao listar exercícios' });
  }
};

// @desc    Obter exercício por ID (sem respostas corretas para alunos)
// @route   GET /api/exercises/:id
// @access  Private
export const getExerciseById = async (req: AuthRequest, res: Response) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate({
        path: 'aulaId',
        select: 'titulo cursoId',
        populate: {
          path: 'cursoId',
          select: 'titulo acessoRestrito alunosAutorizados'
        }
      });

    if (!exercise) {
      return res.status(404).json({ message: 'Exercício não encontrado' });
    }

    // Verificar permissão de cargo
    const userCargo = req.user?.cargo || 'Visitante';
    const userId = req.user?._id;

    if (!exercise.cargosPermitidos.includes(userCargo) && userCargo !== 'Administrador') {
      return res.status(403).json({ message: 'Você não tem permissão para acessar este exercício' });
    }

    // Para não-admins, verificar acesso ao curso restrito
    if (userCargo !== 'Administrador' && exercise.aulaId) {
      const aula = exercise.aulaId as any;
      const curso = aula?.cursoId;

      if (curso && curso.acessoRestrito) {
        const alunosAutorizados = curso.alunosAutorizados || [];
        const isAuthorized = alunosAutorizados.some((alunoId: any) =>
          alunoId.toString() === userId?.toString()
        );

        if (!isAuthorized) {
          return res.status(403).json({
            message: 'Você não tem acesso a este exercício. Este exercício pertence a um curso com acesso restrito.'
          });
        }
      }
    }

    // Para não-admins, remover respostas corretas e comentadas
    if (userCargo !== 'Administrador') {
      const exerciseWithoutAnswers = exercise.toObject();
      exerciseWithoutAnswers.questoes = exerciseWithoutAnswers.questoes.map((q: any) => ({
        ...q,
        respostaCorreta: undefined,
        respostaComentada: undefined,
        fonteBibliografica: undefined
      }));
      return res.json(exerciseWithoutAnswers);
    }

    res.json(exercise);
  } catch (error) {
    console.error('Erro ao buscar exercício:', error);
    res.status(500).json({ message: 'Erro ao buscar exercício' });
  }
};

// @desc    Criar exercício (Admin)
// @route   POST /api/exercises
// @access  Private/Admin
export const createExercise = async (req: Request, res: Response) => {
  try {
    const {
      titulo,
      aulaId,
      tipo,
      questoes,
      cargosPermitidos,
      tentativasPermitidas
    } = req.body;

    // Validação - aulaId agora é opcional
    if (!titulo || !tipo || !questoes || questoes.length === 0) {
      return res.status(400).json({
        message: 'Título, tipo e questões são obrigatórios'
      });
    }

    // Verificar se aula existe (somente se aulaId foi fornecido)
    if (aulaId) {
      const lesson = await Lesson.findById(aulaId);
      if (!lesson) {
        return res.status(404).json({ message: 'Aula não encontrada' });
      }
    }

    const exerciseData: any = {
      titulo,
      tipo,
      questoes,
      cargosPermitidos: cargosPermitidos || ['Aluno', 'Administrador'],
      tentativasPermitidas: tentativasPermitidas || 3
    };

    // Só incluir aulaId se foi fornecido
    if (aulaId) {
      exerciseData.aulaId = aulaId;
    }

    const exercise = await Exercise.create(exerciseData);

    res.status(201).json(exercise);
  } catch (error) {
    console.error('Erro ao criar exercício:', error);
    res.status(500).json({ message: 'Erro ao criar exercício' });
  }
};

// @desc    Atualizar exercício (Admin)
// @route   PUT /api/exercises/:id
// @access  Private/Admin
export const updateExercise = async (req: Request, res: Response) => {
  try {
    const {
      titulo,
      aulaId,
      tipo,
      questoes,
      cargosPermitidos,
      tentativasPermitidas
    } = req.body;

    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercício não encontrado' });
    }

    if (titulo) exercise.titulo = titulo;
    if (tipo) exercise.tipo = tipo;
    if (questoes) exercise.questoes = questoes;
    if (cargosPermitidos) exercise.cargosPermitidos = cargosPermitidos;
    if (tentativasPermitidas) exercise.tentativasPermitidas = tentativasPermitidas;

    // Permitir anexar/desanexar aula
    if (aulaId !== undefined) {
      if (aulaId) {
        // Verificar se aula existe antes de anexar
        const lesson = await Lesson.findById(aulaId);
        if (!lesson) {
          return res.status(404).json({ message: 'Aula não encontrada' });
        }
        exercise.aulaId = aulaId;
      } else {
        // Desanexar aula (tornar exercício independente)
        exercise.aulaId = undefined;
      }
    }

    await exercise.save();

    res.json(exercise);
  } catch (error) {
    console.error('Erro ao atualizar exercício:', error);
    res.status(500).json({ message: 'Erro ao atualizar exercício' });
  }
};

// @desc    Deletar exercício (Admin)
// @route   DELETE /api/exercises/:id
// @access  Private/Admin
export const deleteExercise = async (req: Request, res: Response) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercício não encontrado' });
    }

    // Deletar respostas associadas
    await ExerciseAnswer.deleteMany({ exercicioId: exercise._id });

    await Exercise.findByIdAndDelete(req.params.id);

    res.json({ message: 'Exercício deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar exercício:', error);
    res.status(500).json({ message: 'Erro ao deletar exercício' });
  }
};

// @desc    Responder exercício
// @route   POST /api/exercises/:id/answer
// @access  Private
export const answerExercise = async (req: AuthRequest, res: Response) => {
  try {
    const { respostas } = req.body;
    const exerciseId = req.params.id;
    const userId = req.user?._id;

    if (!respostas || !Array.isArray(respostas)) {
      return res.status(400).json({ message: 'Respostas são obrigatórias' });
    }

    const exercise = await Exercise.findById(exerciseId)
      .populate({
        path: 'aulaId',
        select: 'cursoId',
        populate: {
          path: 'cursoId',
          select: 'acessoRestrito alunosAutorizados'
        }
      });

    if (!exercise) {
      return res.status(404).json({ message: 'Exercício não encontrado' });
    }

    // Verificar permissão de cargo
    const userCargo = req.user?.cargo || 'Visitante';
    if (!exercise.cargosPermitidos.includes(userCargo) && userCargo !== 'Administrador') {
      return res.status(403).json({ message: 'Você não tem permissão para responder este exercício' });
    }

    // Verificar acesso ao curso restrito
    if (userCargo !== 'Administrador' && exercise.aulaId) {
      const aula = exercise.aulaId as any;
      const curso = aula?.cursoId;

      if (curso && curso.acessoRestrito) {
        const alunosAutorizados = curso.alunosAutorizados || [];
        const isAuthorized = alunosAutorizados.some((alunoId: any) =>
          alunoId.toString() === userId?.toString()
        );

        if (!isAuthorized) {
          return res.status(403).json({
            message: 'Você não tem acesso a este exercício. Este exercício pertence a um curso com acesso restrito.'
          });
        }
      }
    }

    // Verificar número de tentativas
    const tentativasAnteriores = await ExerciseAnswer.countDocuments({
      exercicioId: exerciseId,
      usuarioId: userId
    });

    // Se for um número muito alto (ex: 999999), consideramos ilimitado
    const isUnlimited = exercise.tentativasPermitidas >= 999999;

    if (!isUnlimited && tentativasAnteriores >= exercise.tentativasPermitidas) {
      return res.status(400).json({
        message: `Você já atingiu o número máximo de tentativas (${exercise.tentativasPermitidas})`
      });
    }

    // Calcular nota
    let pontosTotais = 0;
    let pontosObtidos = 0;

    exercise.questoes.forEach((questao, index) => {
      pontosTotais += questao.pontos;
      if (respostas[index] !== undefined && respostas[index] === questao.respostaCorreta) {
        pontosObtidos += questao.pontos;
      }
    });

    const nota = pontosTotais > 0 ? Math.round((pontosObtidos / pontosTotais) * 100) : 0;

    // Salvar resposta
    const answer = await ExerciseAnswer.create({
      exercicioId: exerciseId,
      usuarioId: userId,
      respostas,
      nota,
      tentativa: tentativasAnteriores + 1
    });

    // Atualizar usuário
    const user = await User.findById(userId);
    if (user && !user.exerciciosRespondidos.includes(answer._id as any)) {
      user.exerciciosRespondidos.push(answer._id as any);
      await user.save();
    }

    // Retornar resultado com respostas corretas
    const resultado = {
      nota,
      tentativa: tentativasAnteriores + 1,
      tentativasRestantes: exercise.tentativasPermitidas - tentativasAnteriores - 1,
      questoes: exercise.questoes.map((q, i) => ({
        pergunta: q.pergunta,
        suaResposta: respostas[i],
        respostaCorreta: q.respostaCorreta,
        correto: respostas[i] === q.respostaCorreta,
        imagem: q.imagem,
        respostaComentada: q.respostaComentada,
        fonteBibliografica: q.fonteBibliografica
      }))
    };

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao responder exercício:', error);
    res.status(500).json({ message: 'Erro ao responder exercício' });
  }
};

// @desc    Obter minhas respostas de um exercício
// @route   GET /api/exercises/:id/my-answers
// @access  Private
export const getMyAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const answers = await ExerciseAnswer.find({
      exercicioId: req.params.id,
      usuarioId: req.user?._id
    }).sort({ tentativa: -1 });

    res.json(answers);
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    res.status(500).json({ message: 'Erro ao buscar respostas' });
  }
};

// @desc    Listar todas as respostas de um exercício (Admin)
// @route   GET /api/exercises/:id/answers
// @access  Private/Admin
export const getExerciseAnswers = async (req: Request, res: Response) => {
  try {
    const answers = await ExerciseAnswer.find({ exercicioId: req.params.id })
      .populate('usuarioId', 'nomeCompleto email')
      .sort({ createdAt: -1 });

    res.json(answers);
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    res.status(500).json({ message: 'Erro ao buscar respostas' });
  }
};

// @desc    Listar todos os exercícios (Admin)
// @route   GET /api/exercises/admin
// @access  Private/Admin
export const getAllExercisesAdmin = async (req: Request, res: Response) => {
  try {
    const { aulaId, tipo, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (aulaId) query.aulaId = aulaId;
    if (tipo) query.tipo = tipo;

    const skip = (Number(page) - 1) * Number(limit);

    const [exercises, total] = await Promise.all([
      Exercise.find(query)
        .populate('aulaId', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Exercise.countDocuments(query)
    ]);

    res.json({
      exercises,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar exercícios:', error);
    res.status(500).json({ message: 'Erro ao listar exercícios' });
  }
};

// @desc    Listar exercícios disponíveis para o usuário
// @route   GET /api/exercises
// @access  Private
export const getAllExercises = async (req: AuthRequest, res: Response) => {
  try {
    const { aulaId, tipo, page = 1, limit = 20 } = req.query;
    const userCargo = req.user?.cargo || 'Visitante';
    const userId = req.user?._id;

    const query: any = {};
    if (aulaId) query.aulaId = aulaId;
    if (tipo) query.tipo = tipo;

    // Para admin, mostra todos; para outros, filtra por cargo
    if (userCargo !== 'Administrador') {
      query.cargosPermitidos = userCargo;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Buscar exercícios com informações da aula e do curso
    let exercises = await Exercise.find(query)
      .populate({
        path: 'aulaId',
        select: 'titulo cursoId',
        populate: {
          path: 'cursoId',
          select: 'titulo acessoRestrito alunosAutorizados'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Para não-admins, filtrar exercícios com base no acesso ao curso
    if (userCargo !== 'Administrador') {
      exercises = exercises.filter((ex) => {
        // Exercícios sem aula são acessíveis (exercícios independentes)
        if (!ex.aulaId) return true;

        const aula = ex.aulaId as any;
        const curso = aula?.cursoId;

        // Se não tem curso, é acessível
        if (!curso) return true;

        // Se o curso não é restrito, é acessível
        if (!curso.acessoRestrito) return true;

        // Se o curso é restrito, verificar se o usuário está autorizado
        const alunosAutorizados = curso.alunosAutorizados || [];
        return alunosAutorizados.some((alunoId: any) =>
          alunoId.toString() === userId?.toString()
        );
      });
    }

    // Contar total (considerando filtros de acesso)
    // Para uma contagem precisa, precisamos fazer a mesma lógica
    let total: number;
    if (userCargo === 'Administrador') {
      total = await Exercise.countDocuments(query);
    } else {
      // Para não-admins, contar apenas os que passaram no filtro
      // Como já aplicamos o filtro, usamos o length
      // Mas para paginação correta, precisamos contar todos os exercícios filtrados
      const allExercisesForCount = await Exercise.find(query)
        .populate({
          path: 'aulaId',
          select: 'cursoId',
          populate: {
            path: 'cursoId',
            select: 'acessoRestrito alunosAutorizados'
          }
        });

      const filteredCount = allExercisesForCount.filter((ex) => {
        if (!ex.aulaId) return true;
        const aula = ex.aulaId as any;
        const curso = aula?.cursoId;
        if (!curso) return true;
        if (!curso.acessoRestrito) return true;
        const alunosAutorizados = curso.alunosAutorizados || [];
        return alunosAutorizados.some((alunoId: any) =>
          alunoId.toString() === userId?.toString()
        );
      });

      total = filteredCount.length;
    }

    // Para não-admins, remover respostas corretas
    const processedExercises = userCargo === 'Administrador'
      ? exercises
      : exercises.map((ex) => {
          const exObj = ex.toObject();
          exObj.questoes = exObj.questoes.map((q: any) => ({
            ...q,
            respostaCorreta: undefined,
            respostaComentada: undefined,
            fonteBibliografica: undefined
          }));
          return exObj;
        });

    res.json({
      exercises: processedExercises,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar exercícios:', error);
    res.status(500).json({ message: 'Erro ao listar exercícios' });
  }
};
