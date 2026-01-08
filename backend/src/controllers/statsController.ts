import { Request, Response } from 'express';
import User from '../models/User';
import Course from '../models/Course';
import Lesson from '../models/Lesson';
import Exercise from '../models/Exercise';
import ExerciseAnswer from '../models/ExerciseAnswer';
import ForumTopic from '../models/ForumTopic';
import SerialKey from '../models/SerialKey';

// @desc    Obter estatísticas gerais (Admin)
// @route   GET /api/stats
// @access  Private/Admin
export const getGeneralStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsuarios,
      usuariosAtivos,
      totalCursos,
      totalAulas,
      totalExercicios,
      exerciciosRespondidos,
      totalTopicos,
      cargoDistribution,
      usuariosPorSemana
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({
        ultimoLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      Course.countDocuments(),
      Lesson.countDocuments(),
      Exercise.countDocuments(),
      ExerciseAnswer.countDocuments(),
      ForumTopic.countDocuments(),
      User.aggregate([
        { $group: { _id: '$cargo', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%U', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 12 }
      ])
    ]);

    // Calcular taxa de conclusão
    const usersWithProgress = await User.find({
      cursosInscritos: { $exists: true, $ne: [] }
    }).select('cursosInscritos aulasAssistidas');

    let totalAulasInscritas = 0;
    let totalAulasAssistidas = 0;

    for (const user of usersWithProgress) {
      for (const cursoId of user.cursosInscritos) {
        const curso = await Course.findById(cursoId);
        if (curso) {
          totalAulasInscritas += curso.aulas.length;
          totalAulasAssistidas += user.aulasAssistidas.filter((aulaId) =>
            curso.aulas.some((a: any) => a.toString() === aulaId.toString())
          ).length;
        }
      }
    }

    const taxaConclusao = totalAulasInscritas > 0
      ? Math.round((totalAulasAssistidas / totalAulasInscritas) * 100)
      : 0;

    // Formatação da distribuição de cargos
    const distribution: Record<string, number> = {};
    cargoDistribution.forEach((item: any) => {
      distribution[item._id] = item.count;
    });

    res.json({
      usuarios: {
        total: totalUsuarios,
        ativos: usuariosAtivos,
        distribuicao: distribution
      },
      conteudo: {
        cursos: totalCursos,
        aulas: totalAulas,
        exercicios: totalExercicios,
        exerciciosRespondidos
      },
      forum: {
        topicos: totalTopicos
      },
      taxaConclusao,
      usuariosPorSemana
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};

// @desc    Obter aulas mais assistidas
// @route   GET /api/stats/top-lessons
// @access  Private/Admin
export const getTopLessons = async (req: Request, res: Response) => {
  try {
    const topLessons = await User.aggregate([
      { $unwind: '$aulasAssistidas' },
      { $group: { _id: '$aulasAssistidas', count: { $sum: 1 } } },
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
      {
        $project: {
          _id: 1,
          titulo: '$aula.titulo',
          tipo: '$aula.tipo',
          visualizacoes: '$count'
        }
      }
    ]);

    res.json(topLessons);
  } catch (error) {
    console.error('Erro ao obter aulas mais assistidas:', error);
    res.status(500).json({ message: 'Erro ao obter aulas mais assistidas' });
  }
};

// @desc    Obter cursos mais populares
// @route   GET /api/stats/top-courses
// @access  Private/Admin
export const getTopCourses = async (req: Request, res: Response) => {
  try {
    const topCourses = await User.aggregate([
      { $unwind: '$cursosInscritos' },
      { $group: { _id: '$cursosInscritos', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'curso'
        }
      },
      { $unwind: '$curso' },
      {
        $project: {
          _id: 1,
          titulo: '$curso.titulo',
          inscritos: '$count'
        }
      }
    ]);

    res.json(topCourses);
  } catch (error) {
    console.error('Erro ao obter cursos mais populares:', error);
    res.status(500).json({ message: 'Erro ao obter cursos mais populares' });
  }
};

// @desc    Obter atividade recente
// @route   GET /api/stats/recent-activity
// @access  Private/Admin
export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const [recentUsers, recentTopics, recentAnswers] = await Promise.all([
      User.find()
        .select('nomeCompleto email cargo createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      ForumTopic.find()
        .populate('autor', 'nomeCompleto')
        .select('titulo autor createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      ExerciseAnswer.find()
        .populate('usuarioId', 'nomeCompleto')
        .populate('exercicioId', 'titulo')
        .select('nota tentativa createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.json({
      recentUsers,
      recentTopics,
      recentAnswers
    });
  } catch (error) {
    console.error('Erro ao obter atividade recente:', error);
    res.status(500).json({ message: 'Erro ao obter atividade recente' });
  }
};
