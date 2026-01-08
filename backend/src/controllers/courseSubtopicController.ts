import { Request, Response } from 'express';
import CourseSubtopic from '../models/CourseSubtopic';
import Lesson from '../models/Lesson';
import { AuthRequest } from '../middleware/auth';

// @desc    Listar subtópicos de um tópico
// @route   GET /api/course-subtopics/topic/:topicId
// @access  Public
export const getSubtopicsByTopic = async (req: Request, res: Response) => {
    try {
        const { topicId } = req.params;

        const subtopics = await CourseSubtopic.find({ topicoId: topicId, ativo: true })
            .sort({ ordem: 1 })
            .lean();

        // Contar aulas em cada subtópico (para exibir no frontend)
        const subtopicsWithCount = await Promise.all(
            subtopics.map(async (subtopic) => {
                const lessonCount = await Lesson.countDocuments({ subtopicoId: subtopic._id });
                return { ...subtopic, totalAulas: lessonCount };
            })
        );

        res.json(subtopicsWithCount);
    } catch (error) {
        console.error('Erro ao buscar subtópicos:', error);
        res.status(500).json({ message: 'Erro ao buscar subtópicos' });
    }
};

// @desc    Listar subtópicos de um curso
// @route   GET /api/course-subtopics/course/:courseId
// @access  Public
export const getSubtopicsByCourse = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;

        const subtopics = await CourseSubtopic.find({ cursoId: courseId, ativo: true })
            .sort({ topicoId: 1, ordem: 1 })
            .lean();

        // Contar aulas em cada subtópico (para exibir no frontend)
        const subtopicsWithCount = await Promise.all(
            subtopics.map(async (subtopic) => {
                const lessonCount = await Lesson.countDocuments({ subtopicoId: subtopic._id });
                return { ...subtopic, totalAulas: lessonCount };
            })
        );

        res.json(subtopicsWithCount);
    } catch (error) {
        console.error('Erro ao buscar subtópicos do curso:', error);
        res.status(500).json({ message: 'Erro ao buscar subtópicos do curso' });
    }
};

// @desc    Listar subtópicos de um tópico (Admin - inclui inativos)
// @route   GET /api/course-subtopics/topic/:topicId/admin
// @access  Private/Admin
export const getSubtopicsByTopicAdmin = async (req: Request, res: Response) => {
    try {
        const { topicId } = req.params;

        const subtopics = await CourseSubtopic.find({ topicoId: topicId })
            .sort({ ordem: 1 })
            .lean();

        // Contar aulas em cada subtópico
        const subtopicsWithCount = await Promise.all(
            subtopics.map(async (subtopic) => {
                const lessonCount = await Lesson.countDocuments({ subtopicoId: subtopic._id });
                return { ...subtopic, totalAulas: lessonCount };
            })
        );

        res.json(subtopicsWithCount);
    } catch (error) {
        console.error('Erro ao buscar subtópicos:', error);
        res.status(500).json({ message: 'Erro ao buscar subtópicos' });
    }
};

// @desc    Listar subtópicos de um curso (Admin)
// @route   GET /api/course-subtopics/course/:courseId/admin
// @access  Private/Admin
export const getSubtopicsByCourseAdmin = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;

        const subtopics = await CourseSubtopic.find({ cursoId: courseId })
            .populate('topicoId', 'titulo')
            .sort({ topicoId: 1, ordem: 1 })
            .lean();

        // Contar aulas em cada subtópico
        const subtopicsWithCount = await Promise.all(
            subtopics.map(async (subtopic) => {
                const lessonCount = await Lesson.countDocuments({ subtopicoId: subtopic._id });
                return { ...subtopic, totalAulas: lessonCount };
            })
        );

        res.json(subtopicsWithCount);
    } catch (error) {
        console.error('Erro ao buscar subtópicos do curso:', error);
        res.status(500).json({ message: 'Erro ao buscar subtópicos do curso' });
    }
};

// @desc    Buscar subtópico por ID
// @route   GET /api/course-subtopics/:id
// @access  Public
export const getSubtopicById = async (req: Request, res: Response) => {
    try {
        const subtopic = await CourseSubtopic.findById(req.params.id)
            .populate('cursoId', 'titulo')
            .populate('topicoId', 'titulo');

        if (!subtopic) {
            return res.status(404).json({ message: 'Subtópico não encontrado' });
        }

        res.json(subtopic);
    } catch (error) {
        console.error('Erro ao buscar subtópico:', error);
        res.status(500).json({ message: 'Erro ao buscar subtópico' });
    }
};

// @desc    Criar subtópico
// @route   POST /api/course-subtopics
// @access  Private/Admin
export const createSubtopic = async (req: AuthRequest, res: Response) => {
    try {
        const { titulo, descricao, cursoId, topicoId } = req.body;

        // Buscar maior ordem atual dentro do mesmo tópico
        const maxOrdem = await CourseSubtopic.findOne({ topicoId })
            .sort({ ordem: -1 })
            .select('ordem');

        const subtopic = await CourseSubtopic.create({
            titulo,
            descricao,
            cursoId,
            topicoId,
            ordem: maxOrdem ? maxOrdem.ordem + 1 : 0
        });

        res.status(201).json(subtopic);
    } catch (error) {
        console.error('Erro ao criar subtópico:', error);
        res.status(500).json({ message: 'Erro ao criar subtópico' });
    }
};

// @desc    Atualizar subtópico
// @route   PUT /api/course-subtopics/:id
// @access  Private/Admin
export const updateSubtopic = async (req: AuthRequest, res: Response) => {
    try {
        const { titulo, descricao, ativo } = req.body;

        const subtopic = await CourseSubtopic.findById(req.params.id);

        if (!subtopic) {
            return res.status(404).json({ message: 'Subtópico não encontrado' });
        }

        if (titulo !== undefined) subtopic.titulo = titulo;
        if (descricao !== undefined) subtopic.descricao = descricao;
        if (ativo !== undefined) subtopic.ativo = ativo;

        await subtopic.save();

        res.json(subtopic);
    } catch (error) {
        console.error('Erro ao atualizar subtópico:', error);
        res.status(500).json({ message: 'Erro ao atualizar subtópico' });
    }
};

// @desc    Deletar subtópico
// @route   DELETE /api/course-subtopics/:id
// @access  Private/Admin
export const deleteSubtopic = async (req: AuthRequest, res: Response) => {
    try {
        const subtopic = await CourseSubtopic.findById(req.params.id);

        if (!subtopic) {
            return res.status(404).json({ message: 'Subtópico não encontrado' });
        }

        // Remover referência das aulas (elas ficam sem subtópico, mas mantêm o tópico)
        await Lesson.updateMany({ subtopicoId: subtopic._id }, { $unset: { subtopicoId: 1 } });

        await CourseSubtopic.findByIdAndDelete(req.params.id);

        res.json({ message: 'Subtópico deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar subtópico:', error);
        res.status(500).json({ message: 'Erro ao deletar subtópico' });
    }
};

// @desc    Reordenar subtópicos
// @route   PUT /api/course-subtopics/reorder
// @access  Private/Admin
export const reorderSubtopics = async (req: AuthRequest, res: Response) => {
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

        await CourseSubtopic.bulkWrite(bulkOps);

        res.json({ message: 'Ordem atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao reordenar subtópicos:', error);
        res.status(500).json({ message: 'Erro ao reordenar subtópicos' });
    }
};
