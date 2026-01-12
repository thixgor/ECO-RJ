import { Request, Response } from 'express';
import Certificate from '../models/Certificate';
import User from '../models/User';
import Course from '../models/Course';
import Lesson from '../models/Lesson';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all certificates (Admin)
// @route   GET /api/certificates
// @access  Private/Admin
export const getCertificates = async (req: Request, res: Response) => {
  try {
    const { alunoId, cursoId, page = 1, limit = 20 } = req.query;

    const query: any = {};

    if (alunoId) {
      query.alunoId = alunoId;
    }

    if (cursoId) {
      query.cursoId = cursoId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate('alunoId', 'nomeCompleto email cpf dataNascimento')
        .populate('cursoId', 'titulo')
        .sort({ dataEmissao: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Certificate.countDocuments(query)
    ]);

    res.json({
      certificates,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar certificados:', error);
    res.status(500).json({ message: 'Erro ao buscar certificados' });
  }
};

// @desc    Get certificate statistics (Admin)
// @route   GET /api/certificates/stats
// @access  Private/Admin
export const getCertificateStats = async (req: Request, res: Response) => {
  try {
    const [total, byCourse, recentCount] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.aggregate([
        {
          $group: {
            _id: '$cursoId',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'curso'
          }
        },
        {
          $unwind: '$curso'
        },
        {
          $project: {
            cursoId: '$_id',
            cursoTitulo: '$curso.titulo',
            count: 1
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      Certificate.countDocuments({
        dataEmissao: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    res.json({
      total,
      byCourse,
      recentCount
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
};

// @desc    Get current user's certificates
// @route   GET /api/certificates/my
// @access  Private
export const getMyCertificates = async (req: AuthRequest, res: Response) => {
  try {
    const certificates = await Certificate.find({ alunoId: req.user._id })
      .populate('cursoId', 'titulo')
      .sort({ dataEmissao: -1 });

    res.json(certificates);
  } catch (error: any) {
    console.error('Erro ao buscar certificados:', error);
    res.status(500).json({ message: 'Erro ao buscar certificados' });
  }
};

// @desc    Get certificate by ID (Admin)
// @route   GET /api/certificates/:id
// @access  Private/Admin
export const getCertificateById = async (req: Request, res: Response) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('alunoId', 'nomeCompleto email cpf dataNascimento')
      .populate('cursoId', 'titulo');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificado não encontrado' });
    }

    res.json(certificate);
  } catch (error: any) {
    console.error('Erro ao buscar certificado:', error);
    res.status(500).json({ message: 'Erro ao buscar certificado' });
  }
};

// @desc    Generate certificate for a student (Admin)
// @route   POST /api/certificates/generate
// @access  Private/Admin
export const generateCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const { alunoId, cursoId } = req.body;

    if (!alunoId || !cursoId) {
      return res.status(400).json({ message: 'Aluno e curso são obrigatórios' });
    }

    // Check if student exists
    const aluno = await User.findById(alunoId);
    if (!aluno) {
      return res.status(404).json({ message: 'Aluno não encontrado' });
    }

    // Check if course exists
    const curso = await Course.findById(cursoId);
    if (!curso) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    // Check if certificate already exists for this student + course
    const existingCertificate = await Certificate.findOne({ alunoId, cursoId });
    if (existingCertificate) {
      return res.status(400).json({
        message: 'Já existe um certificado para este aluno neste curso'
      });
    }

    // Calculate total hours from course lessons
    const lessons = await Lesson.find({ cursoId });
    const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.duracao || 0), 0);
    const cargaHoraria = Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal

    // Generate unique validation code using SHA-256
    const codigoValidacao = await Certificate.generateValidationCode(alunoId, cursoId);

    // Create certificate
    const certificate = await Certificate.create({
      codigoValidacao,
      alunoId,
      cursoId,
      cargaHoraria,
      dataEmissao: new Date()
    });

    // Populate and return
    const populatedCertificate = await Certificate.findById(certificate._id)
      .populate('alunoId', 'nomeCompleto email cpf dataNascimento')
      .populate('cursoId', 'titulo');

    res.status(201).json({
      message: 'Certificado gerado com sucesso',
      certificate: populatedCertificate
    });
  } catch (error: any) {
    console.error('Erro ao gerar certificado:', error);
    res.status(500).json({ message: 'Erro ao gerar certificado' });
  }
};

// @desc    Delete certificate (Admin)
// @route   DELETE /api/certificates/:id
// @access  Private/Admin
export const deleteCertificate = async (req: Request, res: Response) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificado não encontrado' });
    }

    await Certificate.findByIdAndDelete(req.params.id);

    res.json({ message: 'Certificado excluído com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir certificado:', error);
    res.status(500).json({ message: 'Erro ao excluir certificado' });
  }
};

// @desc    Delete all certificates for a user (Admin)
// @route   DELETE /api/certificates/user/:userId
// @access  Private/Admin
export const deleteUserCertificates = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const result = await Certificate.deleteMany({ alunoId: userId });

    res.json({
      message: `${result.deletedCount} certificado(s) excluído(s) com sucesso`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('Erro ao excluir certificados:', error);
    res.status(500).json({ message: 'Erro ao excluir certificados' });
  }
};

// @desc    Validate certificate (Public)
// @route   GET /api/certificates/validate/:code
// @access  Public
export const validateCertificate = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        valid: false,
        message: 'Código de validação é obrigatório'
      });
    }

    // Normalize code (lowercase, trim) - SHA-256 hashes are stored in lowercase
    const normalizedCode = code.trim().toLowerCase();

    const certificate = await Certificate.findOne({ codigoValidacao: normalizedCode })
      .populate('alunoId', 'nomeCompleto')
      .populate('cursoId', 'titulo');

    if (!certificate) {
      return res.json({
        valid: false,
        message: 'Certificado não encontrado ou inválido'
      });
    }

    res.json({
      valid: true,
      data: {
        nomeAluno: (certificate.alunoId as any).nomeCompleto,
        nomeCurso: (certificate.cursoId as any).titulo,
        cargaHoraria: certificate.cargaHoraria,
        dataEmissao: certificate.dataEmissao
      }
    });
  } catch (error: any) {
    console.error('Erro ao validar certificado:', error);
    res.status(500).json({
      valid: false,
      message: 'Erro ao validar certificado'
    });
  }
};

// @desc    Calculate course hours (Admin helper)
// @route   GET /api/certificates/course-hours/:courseId
// @access  Private/Admin
export const getCourseHours = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    const lessons = await Lesson.find({ cursoId: courseId });
    const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.duracao || 0), 0);
    const cargaHoraria = Math.round((totalMinutes / 60) * 10) / 10;

    res.json({
      courseId,
      courseName: course.titulo,
      totalLessons: lessons.length,
      totalMinutes,
      cargaHoraria
    });
  } catch (error: any) {
    console.error('Erro ao calcular horas:', error);
    res.status(500).json({ message: 'Erro ao calcular horas do curso' });
  }
};
