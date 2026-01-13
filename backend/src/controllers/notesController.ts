import { Response } from 'express';
import UserLessonNote from '../models/UserLessonNote';
import Lesson from '../models/Lesson';
import { AuthRequest } from '../middleware/auth';

// @desc    Criar nota
// @route   POST /api/notes
// @access  Private
export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId, conteudo, timestamp } = req.body;
    const userId = req.user?._id;

    if (!lessonId || !conteudo || timestamp === undefined) {
      return res.status(400).json({
        message: 'ID da aula, conteúdo e timestamp são obrigatórios'
      });
    }

    // Verificar se a aula existe
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Aula não encontrada' });
    }

    // Obter o cursoId da aula
    const cursoId = typeof lesson.cursoId === 'string'
      ? lesson.cursoId
      : (lesson.cursoId as any)?._id || lesson.cursoId;

    const note = await UserLessonNote.create({
      userId,
      lessonId,
      cursoId,
      conteudo: conteudo.trim(),
      timestamp: Math.max(0, Number(timestamp))
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    res.status(500).json({ message: 'Erro ao criar nota' });
  }
};

// @desc    Obter notas de uma aula
// @route   GET /api/notes/lesson/:lessonId
// @access  Private
export const getNotesByLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?._id;

    const notes = await UserLessonNote.find({ userId, lessonId })
      .sort({ timestamp: 1, createdAt: 1 });

    res.json(notes);
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    res.status(500).json({ message: 'Erro ao buscar notas' });
  }
};

// @desc    Obter todas as notas do usuário
// @route   GET /api/notes/my
// @access  Private
export const getNotesByUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { cursoId, lessonId, page = 1, limit = 50 } = req.query;

    const query: any = { userId };
    if (cursoId) query.cursoId = cursoId;
    if (lessonId) query.lessonId = lessonId;

    const skip = (Number(page) - 1) * Number(limit);

    const [notes, total] = await Promise.all([
      UserLessonNote.find(query)
        .populate('lessonId', 'titulo tipo cursoId')
        .populate('cursoId', 'titulo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      UserLessonNote.countDocuments(query)
    ]);

    // Agrupar notas por curso e aula para melhor visualização
    const groupedByCourse: Record<string, any> = {};

    notes.forEach((note: any) => {
      const cursoTitulo = note.cursoId?.titulo || 'Curso Desconhecido';
      const cursoIdStr = note.cursoId?._id?.toString() || 'unknown';

      if (!groupedByCourse[cursoIdStr]) {
        groupedByCourse[cursoIdStr] = {
          cursoId: cursoIdStr,
          cursoTitulo,
          aulas: {}
        };
      }

      const lessonIdStr = note.lessonId?._id?.toString() || 'unknown';
      const lessonTitulo = note.lessonId?.titulo || 'Aula Desconhecida';

      if (!groupedByCourse[cursoIdStr].aulas[lessonIdStr]) {
        groupedByCourse[cursoIdStr].aulas[lessonIdStr] = {
          lessonId: lessonIdStr,
          lessonTitulo,
          notas: []
        };
      }

      groupedByCourse[cursoIdStr].aulas[lessonIdStr].notas.push({
        _id: note._id,
        conteudo: note.conteudo,
        timestamp: note.timestamp,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      });
    });

    // Converter para array
    const grouped = Object.values(groupedByCourse).map((curso: any) => ({
      ...curso,
      aulas: Object.values(curso.aulas)
    }));

    res.json({
      notes,
      grouped,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar notas do usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar notas' });
  }
};

// @desc    Atualizar nota
// @route   PUT /api/notes/:id
// @access  Private
export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { conteudo } = req.body;
    const userId = req.user?._id;

    if (!conteudo) {
      return res.status(400).json({ message: 'Conteúdo é obrigatório' });
    }

    const note = await UserLessonNote.findById(id);
    if (!note) {
      return res.status(404).json({ message: 'Nota não encontrada' });
    }

    // Verificar se o usuário é o dono da nota
    if (note.userId.toString() !== userId?.toString()) {
      return res.status(403).json({ message: 'Você não tem permissão para editar esta nota' });
    }

    note.conteudo = conteudo.trim();
    await note.save();

    res.json(note);
  } catch (error) {
    console.error('Erro ao atualizar nota:', error);
    res.status(500).json({ message: 'Erro ao atualizar nota' });
  }
};

// @desc    Deletar nota
// @route   DELETE /api/notes/:id
// @access  Private
export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const note = await UserLessonNote.findById(id);
    if (!note) {
      return res.status(404).json({ message: 'Nota não encontrada' });
    }

    // Verificar se o usuário é o dono da nota
    if (note.userId.toString() !== userId?.toString()) {
      return res.status(403).json({ message: 'Você não tem permissão para deletar esta nota' });
    }

    await UserLessonNote.findByIdAndDelete(id);

    res.json({ message: 'Nota deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar nota:', error);
    res.status(500).json({ message: 'Erro ao deletar nota' });
  }
};
