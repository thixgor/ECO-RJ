import { Request, Response } from 'express';
import Question from '../models/Question';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar todas as questões (Admin)
// @route   GET /api/questions
// @access  Private/Admin
export const getQuestions = async (req: Request, res: Response) => {
  try {
    const { tipo, dificuldade, tags, page = 1, limit = 20 } = req.query;

    const query: any = { ativo: true };

    if (tipo) query.tipo = tipo;
    if (dificuldade) query.dificuldade = dificuldade;
    if (tags) {
      const tagArray = (tags as string).split(',');
      query.tags = { $in: tagArray };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate('criadorId', 'nomeCompleto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Question.countDocuments(query)
    ]);

    res.json({
      questions,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar questões:', error);
    res.status(500).json({ message: 'Erro ao listar questões' });
  }
};

// @desc    Obter questão por ID (Admin)
// @route   GET /api/questions/:id
// @access  Private/Admin
export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('criadorId', 'nomeCompleto');

    if (!question) {
      return res.status(404).json({ message: 'Questão não encontrada' });
    }

    res.json(question);
  } catch (error) {
    console.error('Erro ao buscar questão:', error);
    res.status(500).json({ message: 'Erro ao buscar questão' });
  }
};

// @desc    Criar questão (Admin)
// @route   POST /api/questions
// @access  Private/Admin
export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const {
      pergunta,
      tipo,
      opcoes,
      respostaCorreta,
      pontos,
      explicacao,
      tags,
      dificuldade
    } = req.body;

    if (!pergunta || !tipo || respostaCorreta === undefined) {
      return res.status(400).json({
        message: 'Pergunta, tipo e resposta correta são obrigatórios'
      });
    }

    // Validações específicas por tipo
    if (tipo === 'multipla_escolha' && (!opcoes || opcoes.length < 2)) {
      return res.status(400).json({
        message: 'Questões de múltipla escolha precisam de pelo menos 2 opções'
      });
    }

    if (tipo === 'verdadeiro_falso' && typeof respostaCorreta !== 'boolean') {
      return res.status(400).json({
        message: 'Questões de verdadeiro/falso precisam ter resposta booleana'
      });
    }

    const question = await Question.create({
      pergunta,
      tipo,
      opcoes: opcoes || [],
      respostaCorreta,
      pontos: pontos || 1,
      explicacao,
      tags: tags || [],
      dificuldade: dificuldade || 'medio',
      criadorId: req.user?._id
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    res.status(500).json({ message: 'Erro ao criar questão' });
  }
};

// @desc    Atualizar questão (Admin)
// @route   PUT /api/questions/:id
// @access  Private/Admin
export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const {
      pergunta,
      tipo,
      opcoes,
      respostaCorreta,
      pontos,
      explicacao,
      tags,
      dificuldade,
      ativo
    } = req.body;

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Questão não encontrada' });
    }

    if (pergunta) question.pergunta = pergunta;
    if (tipo) question.tipo = tipo;
    if (opcoes !== undefined) question.opcoes = opcoes;
    if (respostaCorreta !== undefined) question.respostaCorreta = respostaCorreta;
    if (pontos !== undefined) question.pontos = pontos;
    if (explicacao !== undefined) question.explicacao = explicacao;
    if (tags !== undefined) question.tags = tags;
    if (dificuldade) question.dificuldade = dificuldade;
    if (ativo !== undefined) question.ativo = ativo;

    await question.save();

    res.json(question);
  } catch (error) {
    console.error('Erro ao atualizar questão:', error);
    res.status(500).json({ message: 'Erro ao atualizar questão' });
  }
};

// @desc    Deletar questão (Admin)
// @route   DELETE /api/questions/:id
// @access  Private/Admin
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Questão não encontrada' });
    }

    // Soft delete - apenas desativar
    question.ativo = false;
    await question.save();

    res.json({ message: 'Questão desativada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar questão:', error);
    res.status(500).json({ message: 'Erro ao deletar questão' });
  }
};

// @desc    Buscar questões por tags (Admin)
// @route   GET /api/questions/search
// @access  Private/Admin
export const searchQuestions = async (req: Request, res: Response) => {
  try {
    const { q, tipo, dificuldade, limit = 20 } = req.query;

    const query: any = { ativo: true };

    if (q) {
      query.$or = [
        { pergunta: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    if (tipo) query.tipo = tipo;
    if (dificuldade) query.dificuldade = dificuldade;

    const questions = await Question.find(query)
      .select('pergunta tipo dificuldade tags pontos')
      .limit(Number(limit));

    res.json(questions);
  } catch (error) {
    console.error('Erro ao buscar questões:', error);
    res.status(500).json({ message: 'Erro ao buscar questões' });
  }
};

// @desc    Listar todas as tags (Admin)
// @route   GET /api/questions/tags
// @access  Private/Admin
export const getAllTags = async (req: Request, res: Response) => {
  try {
    const tags = await Question.distinct('tags', { ativo: true });
    res.json(tags.sort());
  } catch (error) {
    console.error('Erro ao listar tags:', error);
    res.status(500).json({ message: 'Erro ao listar tags' });
  }
};
