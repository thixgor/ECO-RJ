import { Request, Response } from 'express';
import CourseTopic from '../models/CourseTopic';
import Lesson from '../models/Lesson';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar tópicos de um curso
// @route   GET /api/course-topics/course/:courseId
// @access  Public
export const getTopicsByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const topics = await CourseTopic.find({ cursoId: courseId, ativo: true })
      .sort({ ordem: 1 })
      .lean();

    // Contar aulas em cada tópico (para exibir no frontend)
    const topicsWithCount = await Promise.all(
      topics.map(async (topic) => {
        const lessonCount = await Lesson.countDocuments({ topicoId: topic._id });
        return { ...topic, totalAulas: lessonCount };
      })
    );

    res.json(topicsWithCount);
  } catch (error) {
    console.error('Erro ao buscar tópicos:', error);
    res.status(500).json({ message: 'Erro ao buscar tópicos' });
  }
};

// @desc    Listar tópicos de um curso (Admin - inclui inativos)
// @route   GET /api/course-topics/course/:courseId/admin
// @access  Private/Admin
export const getTopicsByCourseAdmin = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const topics = await CourseTopic.find({ cursoId: courseId })
      .sort({ ordem: 1 })
      .lean();

    // Contar aulas em cada tópico
    const topicsWithCount = await Promise.all(
      topics.map(async (topic) => {
        const lessonCount = await Lesson.countDocuments({ topicoId: topic._id });
        return { ...topic, totalAulas: lessonCount };
      })
    );

    res.json(topicsWithCount);
  } catch (error) {
    console.error('Erro ao buscar tópicos:', error);
    res.status(500).json({ message: 'Erro ao buscar tópicos' });
  }
};

// @desc    Buscar tópico por ID
// @route   GET /api/course-topics/:id
// @access  Public
export const getTopicById = async (req: Request, res: Response) => {
  try {
    const topic = await CourseTopic.findById(req.params.id)
      .populate('cursoId', 'titulo');

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    res.json(topic);
  } catch (error) {
    console.error('Erro ao buscar tópico:', error);
    res.status(500).json({ message: 'Erro ao buscar tópico' });
  }
};

// @desc    Criar tópico
// @route   POST /api/course-topics
// @access  Private/Admin
export const createTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, descricao, cursoId } = req.body;

    // Buscar maior ordem atual
    const maxOrdem = await CourseTopic.findOne({ cursoId })
      .sort({ ordem: -1 })
      .select('ordem');

    const topic = await CourseTopic.create({
      titulo,
      descricao,
      cursoId,
      ordem: maxOrdem ? maxOrdem.ordem + 1 : 0
    });

    res.status(201).json(topic);
  } catch (error) {
    console.error('Erro ao criar tópico:', error);
    res.status(500).json({ message: 'Erro ao criar tópico' });
  }
};

// @desc    Atualizar tópico
// @route   PUT /api/course-topics/:id
// @access  Private/Admin
export const updateTopic = async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, descricao, ativo } = req.body;

    const topic = await CourseTopic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    if (titulo !== undefined) topic.titulo = titulo;
    if (descricao !== undefined) topic.descricao = descricao;
    if (ativo !== undefined) topic.ativo = ativo;

    await topic.save();

    res.json(topic);
  } catch (error) {
    console.error('Erro ao atualizar tópico:', error);
    res.status(500).json({ message: 'Erro ao atualizar tópico' });
  }
};

// @desc    Deletar tópico
// @route   DELETE /api/course-topics/:id
// @access  Private/Admin
export const deleteTopic = async (req: AuthRequest, res: Response) => {
  try {
    const topic = await CourseTopic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Tópico não encontrado' });
    }

    // Remover referência das aulas (elas ficam sem tópico)
    await Lesson.updateMany({ topicoId: topic._id }, { $unset: { topicoId: 1 } });

    await CourseTopic.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tópico deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tópico:', error);
    res.status(500).json({ message: 'Erro ao deletar tópico' });
  }
};

// @desc    Reordenar tópicos
// @route   PUT /api/course-topics/reorder
// @access  Private/Admin
export const reorderTopics = async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body; // [{id: string, ordem: number}]

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items deve ser um array' });
    }

    const bulkOps: any[] = items.map((item: { id: string; ordem: number }) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { ordem: item.ordem } }
      }
    }));

    await CourseTopic.bulkWrite(bulkOps);

    res.json({ message: 'Ordem atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar tópicos:', error);
    res.status(500).json({ message: 'Erro ao reordenar tópicos' });
  }
};
