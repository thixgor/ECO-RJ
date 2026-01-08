import { Request, Response } from 'express';
import Exam from '../models/Exam';
import ExamAnswer from '../models/ExamAnswer';
import Question from '../models/Question';
import { AuthRequest } from '../middleware/auth';
import { registrarAcesso, getClientIp } from './accessLogController';

// @desc    Listar provas (Admin ou provas publicadas para alunos)
// @route   GET /api/exams
// @access  Private
export const getExams = async (req: AuthRequest, res: Response) => {
  try {
    const { cursoId, publicado, page = 1, limit = 20 } = req.query;
    const userCargo = req.user?.cargo;

    const query: any = { ativo: true };

    // Alunos só veem provas publicadas
    if (userCargo !== 'Administrador') {
      query.publicado = true;
      query.cargosPermitidos = { $in: [userCargo] };
    } else {
      if (publicado !== undefined) query.publicado = publicado === 'true';
    }

    if (cursoId) query.cursoId = cursoId;

    const skip = (Number(page) - 1) * Number(limit);

    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate('cursoId', 'titulo')
        .populate('criadorId', 'nomeCompleto')
        .select('-questoesRef -exerciciosRef')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Exam.countDocuments(query)
    ]);

    res.json({
      exams,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar provas:', error);
    res.status(500).json({ message: 'Erro ao listar provas' });
  }
};

// @desc    Obter prova por ID
// @route   GET /api/exams/:id
// @access  Private
export const getExamById = async (req: AuthRequest, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('cursoId', 'titulo')
      .populate('criadorId', 'nomeCompleto')
      .populate('questoesRef');

    if (!exam) {
      return res.status(404).json({ message: 'Prova não encontrada' });
    }

    const userCargo = req.user?.cargo || 'Visitante';
    const userId = req.user?._id;

    // Verificar permissão
    if (userCargo !== 'Administrador') {
      if (!exam.publicado) {
        return res.status(403).json({ message: 'Esta prova ainda não foi publicada' });
      }
      if (!exam.cargosPermitidos.includes(userCargo)) {
        return res.status(403).json({ message: 'Você não tem permissão para acessar esta prova' });
      }

      // Verificar período
      const now = new Date();
      if (exam.dataInicio && now < exam.dataInicio) {
        return res.status(403).json({ message: 'Esta prova ainda não está disponível' });
      }
      if (exam.dataFim && now > exam.dataFim) {
        return res.status(403).json({ message: 'O prazo para esta prova já encerrou' });
      }
    }

    // Registrar acesso
    if (userId) {
      registrarAcesso(userId.toString(), 'prova', req, {
        provaId: exam._id.toString(),
        cursoId: exam.cursoId?.toString()
      });
    }

    // Para não-admins, remover respostas corretas
    if (userCargo !== 'Administrador') {
      const examObj = exam.toObject();
      examObj.questoesRef = examObj.questoesRef.map((q: any) => ({
        ...q,
        respostaCorreta: undefined,
        explicacao: undefined
      }));
      return res.json(examObj);
    }

    res.json(exam);
  } catch (error) {
    console.error('Erro ao buscar prova:', error);
    res.status(500).json({ message: 'Erro ao buscar prova' });
  }
};

// @desc    Criar prova (Admin)
// @route   POST /api/exams
// @access  Private/Admin
export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const {
      titulo,
      descricao,
      instrucoes,
      questoesRef,
      exerciciosRef,
      cursoId,
      cargosPermitidos,
      tentativasPermitidas,
      tempoLimite,
      dataInicio,
      dataFim,
      embaralharQuestoes,
      embaralharOpcoes,
      mostrarRespostas,
      notaMinima,
      pesoNota,
      publicado
    } = req.body;

    if (!titulo) {
      return res.status(400).json({ message: 'Título é obrigatório' });
    }

    if ((!questoesRef || questoesRef.length === 0) && (!exerciciosRef || exerciciosRef.length === 0)) {
      return res.status(400).json({ message: 'A prova deve ter questões ou exercícios' });
    }

    const exam = await Exam.create({
      titulo,
      descricao,
      instrucoes,
      questoesRef: questoesRef || [],
      exerciciosRef: exerciciosRef || [],
      cursoId,
      cargosPermitidos: cargosPermitidos || ['Aluno', 'Administrador'],
      tentativasPermitidas: tentativasPermitidas || 1,
      tempoLimite,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      embaralharQuestoes: embaralharQuestoes !== undefined ? embaralharQuestoes : true,
      embaralharOpcoes: embaralharOpcoes !== undefined ? embaralharOpcoes : true,
      mostrarRespostas: mostrarRespostas || 'apos_prazo',
      notaMinima: notaMinima || 70,
      pesoNota,
      criadorId: req.user?._id,
      publicado: publicado || false
    });

    res.status(201).json(exam);
  } catch (error) {
    console.error('Erro ao criar prova:', error);
    res.status(500).json({ message: 'Erro ao criar prova' });
  }
};

// @desc    Atualizar prova (Admin)
// @route   PUT /api/exams/:id
// @access  Private/Admin
export const updateExam = async (req: Request, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Prova não encontrada' });
    }

    const allowedFields = [
      'titulo', 'descricao', 'instrucoes', 'questoesRef', 'exerciciosRef',
      'cursoId', 'cargosPermitidos', 'tentativasPermitidas', 'tempoLimite',
      'dataInicio', 'dataFim', 'embaralharQuestoes', 'embaralharOpcoes',
      'mostrarRespostas', 'notaMinima', 'pesoNota', 'publicado', 'ativo'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'dataInicio' || field === 'dataFim') {
          (exam as any)[field] = req.body[field] ? new Date(req.body[field]) : undefined;
        } else {
          (exam as any)[field] = req.body[field];
        }
      }
    });

    await exam.save();

    res.json(exam);
  } catch (error) {
    console.error('Erro ao atualizar prova:', error);
    res.status(500).json({ message: 'Erro ao atualizar prova' });
  }
};

// @desc    Deletar prova (Admin)
// @route   DELETE /api/exams/:id
// @access  Private/Admin
export const deleteExam = async (req: Request, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Prova não encontrada' });
    }

    // Soft delete
    exam.ativo = false;
    await exam.save();

    res.json({ message: 'Prova desativada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar prova:', error);
    res.status(500).json({ message: 'Erro ao deletar prova' });
  }
};

// @desc    Iniciar tentativa de prova
// @route   POST /api/exams/:id/start
// @access  Private
export const startExam = async (req: AuthRequest, res: Response) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('questoesRef');
    if (!exam) {
      return res.status(404).json({ message: 'Prova não encontrada' });
    }

    const userId = req.user?._id;
    const userCargo = req.user?.cargo || 'Visitante';

    // Verificações de acesso
    if (!exam.publicado) {
      return res.status(403).json({ message: 'Esta prova ainda não foi publicada' });
    }

    if (!exam.cargosPermitidos.includes(userCargo) && userCargo !== 'Administrador') {
      return res.status(403).json({ message: 'Você não tem permissão para fazer esta prova' });
    }

    // Verificar período
    const now = new Date();
    if (exam.dataInicio && now < exam.dataInicio) {
      return res.status(403).json({ message: 'Esta prova ainda não está disponível' });
    }
    if (exam.dataFim && now > exam.dataFim) {
      return res.status(403).json({ message: 'O prazo para esta prova já encerrou' });
    }

    // Verificar tentativas
    const tentativasAnteriores = await ExamAnswer.countDocuments({
      provaId: exam._id,
      usuarioId: userId
    });

    if (tentativasAnteriores >= exam.tentativasPermitidas) {
      return res.status(400).json({
        message: `Você já utilizou todas as ${exam.tentativasPermitidas} tentativas permitidas`
      });
    }

    // Verificar se há tentativa em andamento
    const tentativaEmAndamento = await ExamAnswer.findOne({
      provaId: exam._id,
      usuarioId: userId,
      finalizadoEm: { $exists: false }
    });

    if (tentativaEmAndamento) {
      return res.json({
        message: 'Continuando tentativa em andamento',
        tentativa: tentativaEmAndamento,
        questoes: exam.questoesRef
      });
    }

    // Criar nova tentativa
    const novaTentativa = await ExamAnswer.create({
      provaId: exam._id,
      usuarioId: userId,
      respostas: [],
      tentativa: tentativasAnteriores + 1,
      ip: getClientIp(req)
    });

    // Preparar questões (embaralhar se configurado)
    let questoes = exam.questoesRef.map((q: any) => ({
      _id: q._id,
      pergunta: q.pergunta,
      tipo: q.tipo,
      opcoes: exam.embaralharOpcoes && q.opcoes ? shuffleArray([...q.opcoes]) : q.opcoes,
      pontos: q.pontos
    }));

    if (exam.embaralharQuestoes) {
      questoes = shuffleArray(questoes);
    }

    res.json({
      message: 'Prova iniciada',
      tentativa: novaTentativa,
      questoes,
      tempoLimite: exam.tempoLimite
    });
  } catch (error) {
    console.error('Erro ao iniciar prova:', error);
    res.status(500).json({ message: 'Erro ao iniciar prova' });
  }
};

// @desc    Submeter respostas da prova
// @route   POST /api/exams/:id/submit
// @access  Private
export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    const { respostas } = req.body;
    const userId = req.user?._id;

    if (!respostas || !Array.isArray(respostas)) {
      return res.status(400).json({ message: 'Respostas são obrigatórias' });
    }

    const exam = await Exam.findById(req.params.id).populate('questoesRef');
    if (!exam) {
      return res.status(404).json({ message: 'Prova não encontrada' });
    }

    // Buscar tentativa em andamento
    const tentativa = await ExamAnswer.findOne({
      provaId: exam._id,
      usuarioId: userId,
      finalizadoEm: { $exists: false }
    });

    if (!tentativa) {
      return res.status(400).json({ message: 'Nenhuma tentativa em andamento encontrada' });
    }

    // Verificar tempo limite
    if (exam.tempoLimite) {
      const tempoDecorrido = (Date.now() - tentativa.iniciadoEm.getTime()) / 1000 / 60;
      if (tempoDecorrido > exam.tempoLimite + 1) { // +1 minuto de tolerância
        tentativa.finalizadoEm = new Date();
        tentativa.nota = 0;
        tentativa.aprovado = false;
        await tentativa.save();
        return res.status(400).json({ message: 'Tempo esgotado' });
      }
    }

    // Calcular nota
    let pontosTotais = 0;
    let pontosObtidos = 0;

    const respostasCorrigidas = respostas.map((r: any) => {
      const questao = (exam.questoesRef as any[]).find(
        (q: any) => q._id.toString() === r.questaoId
      );

      if (!questao) return r;

      pontosTotais += questao.pontos;
      const correta = String(questao.respostaCorreta) === String(r.resposta);

      if (correta) {
        pontosObtidos += questao.pontos;
      }

      return {
        questaoId: r.questaoId,
        resposta: r.resposta,
        correta,
        pontosObtidos: correta ? questao.pontos : 0
      };
    });

    const nota = pontosTotais > 0 ? Math.round((pontosObtidos / pontosTotais) * 100) : 0;
    const aprovado = nota >= exam.notaMinima;

    // Atualizar tentativa
    tentativa.respostas = respostasCorrigidas;
    tentativa.nota = nota;
    tentativa.aprovado = aprovado;
    tentativa.finalizadoEm = new Date();
    await tentativa.save();

    // Preparar resposta baseado na configuração
    let resultado: any = {
      nota,
      aprovado,
      notaMinima: exam.notaMinima,
      tentativa: tentativa.tentativa,
      tentativasRestantes: exam.tentativasPermitidas - tentativa.tentativa
    };

    if (exam.mostrarRespostas === 'imediato' ||
        (exam.mostrarRespostas === 'apos_prazo' && exam.dataFim && new Date() > exam.dataFim)) {
      resultado.detalhes = respostasCorrigidas.map((r: any, i: number) => {
        const questao = (exam.questoesRef as any[]).find(
          (q: any) => q._id.toString() === r.questaoId
        );
        return {
          pergunta: questao?.pergunta,
          suaResposta: r.resposta,
          respostaCorreta: questao?.respostaCorreta,
          correta: r.correta,
          explicacao: questao?.explicacao
        };
      });
    }

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao submeter prova:', error);
    res.status(500).json({ message: 'Erro ao submeter prova' });
  }
};

// @desc    Obter minhas tentativas de uma prova
// @route   GET /api/exams/:id/my-attempts
// @access  Private
export const getMyAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const attempts = await ExamAnswer.find({
      provaId: req.params.id,
      usuarioId: req.user?._id
    }).sort({ tentativa: -1 });

    res.json(attempts);
  } catch (error) {
    console.error('Erro ao buscar tentativas:', error);
    res.status(500).json({ message: 'Erro ao buscar tentativas' });
  }
};

// @desc    Listar todas as respostas de uma prova (Admin)
// @route   GET /api/exams/:id/answers
// @access  Private/Admin
export const getExamAnswers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [answers, total] = await Promise.all([
      ExamAnswer.find({ provaId: req.params.id })
        .populate('usuarioId', 'nomeCompleto email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ExamAnswer.countDocuments({ provaId: req.params.id })
    ]);

    res.json({
      answers,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    res.status(500).json({ message: 'Erro ao buscar respostas' });
  }
};

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
