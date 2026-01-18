import { Request, Response } from 'express';
import CertificateRequest from '../models/CertificateRequest';
import Certificate from '../models/Certificate';
import User from '../models/User';
import Course from '../models/Course';
import Lesson from '../models/Lesson';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all certificate requests (Admin)
// @route   GET /api/certificate-requests
// @access  Private/Admin
export const getCertificateRequests = async (req: Request, res: Response) => {
  try {
    const { status, cursoId, page = 1, limit = 20 } = req.query;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (cursoId) {
      query.cursoId = cursoId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      CertificateRequest.find(query)
        .populate('alunoId', 'nomeCompleto email fotoPerfil')
        .populate('cursoId', 'titulo')
        .populate('respondidoPor', 'nomeCompleto')
        .sort({ dataSolicitacao: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CertificateRequest.countDocuments(query)
    ]);

    res.json({
      requests,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar solicitacoes de certificado:', error);
    res.status(500).json({ message: 'Erro ao buscar solicitacoes de certificado' });
  }
};

// @desc    Get certificate request statistics (Admin)
// @route   GET /api/certificate-requests/stats
// @access  Private/Admin
export const getCertificateRequestStats = async (req: Request, res: Response) => {
  try {
    const [pendentes, aprovados, recusados] = await Promise.all([
      CertificateRequest.countDocuments({ status: 'pendente' }),
      CertificateRequest.countDocuments({ status: 'aprovado' }),
      CertificateRequest.countDocuments({ status: 'recusado' })
    ]);

    res.json({
      pendentes,
      aprovados,
      recusados,
      total: pendentes + aprovados + recusados
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatisticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatisticas' });
  }
};

// @desc    Get current user's certificate requests
// @route   GET /api/certificate-requests/my
// @access  Private
export const getMyCertificateRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await CertificateRequest.find({ alunoId: req.user._id })
      .populate('cursoId', 'titulo')
      .populate('certificadoId')
      .sort({ dataSolicitacao: -1 });

    res.json(requests);
  } catch (error: any) {
    console.error('Erro ao buscar solicitacoes:', error);
    res.status(500).json({ message: 'Erro ao buscar solicitacoes' });
  }
};

// @desc    Create certificate request
// @route   POST /api/certificate-requests
// @access  Private
export const createCertificateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { cursoId } = req.body;
    const alunoId = req.user._id;

    if (!cursoId) {
      return res.status(400).json({ message: 'Curso e obrigatorio' });
    }

    // Verificar se o curso existe
    const curso = await Course.findById(cursoId);
    if (!curso) {
      return res.status(404).json({ message: 'Curso nao encontrado' });
    }

    // Verificar se ja existe uma solicitacao pendente para este aluno e curso
    const existingRequest = await CertificateRequest.findOne({
      alunoId,
      cursoId,
      status: 'pendente'
    });

    if (existingRequest) {
      return res.status(400).json({
        message: 'Voce ja possui uma solicitacao pendente para este curso'
      });
    }

    // Verificar se ja existe um certificado para este aluno e curso
    const existingCertificate = await Certificate.findOne({ alunoId, cursoId });
    if (existingCertificate) {
      return res.status(400).json({
        message: 'Voce ja possui um certificado para este curso'
      });
    }

    // Verificar se o aluno concluiu 100% do curso (excluindo materiais)
    const user = await User.findById(alunoId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario nao encontrado' });
    }

    // Buscar todas as aulas do curso que nao sao materiais
    const aulasValidas = await Lesson.find({
      cursoId,
      tipo: { $in: ['ao_vivo', 'gravada'] }
    });

    const totalAulasValidas = aulasValidas.length;

    // Contar quantas aulas validas o usuario assistiu
    const aulasAssistidas = user.aulasAssistidas.filter((aulaId) =>
      aulasValidas.some((aula) => aula._id.toString() === aulaId.toString())
    ).length;

    const progresso = totalAulasValidas > 0
      ? Math.round((aulasAssistidas / totalAulasValidas) * 100)
      : 0;

    if (progresso < 100) {
      return res.status(400).json({
        message: `Voce precisa concluir 100% do curso para solicitar o certificado. Progresso atual: ${progresso}%`
      });
    }

    // Criar a solicitacao
    const request = await CertificateRequest.create({
      alunoId,
      cursoId,
      dataSolicitacao: new Date(),
      status: 'pendente'
    });

    // Populate e retornar
    const populatedRequest = await CertificateRequest.findById(request._id)
      .populate('cursoId', 'titulo');

    res.status(201).json({
      message: 'Solicitacao de certificado enviada com sucesso',
      request: populatedRequest
    });
  } catch (error: any) {
    console.error('Erro ao criar solicitacao:', error);
    res.status(500).json({ message: 'Erro ao criar solicitacao de certificado' });
  }
};

// @desc    Approve certificate request (Admin)
// @route   PUT /api/certificate-requests/:id/approve
// @access  Private/Admin
export const approveCertificateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const request = await CertificateRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Solicitacao nao encontrada' });
    }

    if (request.status !== 'pendente') {
      return res.status(400).json({
        message: 'Esta solicitacao ja foi processada'
      });
    }

    // Verificar se ja existe um certificado para este aluno e curso
    const existingCertificate = await Certificate.findOne({
      alunoId: request.alunoId,
      cursoId: request.cursoId
    });

    if (existingCertificate) {
      // Atualizar a solicitacao para aprovada e vincular o certificado existente
      request.status = 'aprovado';
      request.dataResposta = new Date();
      request.respondidoPor = req.user._id;
      request.certificadoId = existingCertificate._id as any;
      await request.save();

      return res.json({
        message: 'Solicitacao aprovada. Certificado ja existente foi vinculado.',
        request,
        certificate: existingCertificate
      });
    }

    // Calcular carga horaria do curso
    const lessons = await Lesson.find({ cursoId: request.cursoId });
    const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.duracao || 0), 0);
    const cargaHoraria = Math.round((totalMinutes / 60) * 10) / 10;

    // Gerar codigo de validacao unico
    const codigoValidacao = await Certificate.generateValidationCode(
      request.alunoId.toString(),
      request.cursoId.toString()
    );

    // Criar o certificado
    const certificate = await Certificate.create({
      codigoValidacao,
      alunoId: request.alunoId,
      cursoId: request.cursoId,
      cargaHoraria,
      dataEmissao: new Date()
    });

    // Atualizar a solicitacao
    request.status = 'aprovado';
    request.dataResposta = new Date();
    request.respondidoPor = req.user._id;
    request.certificadoId = certificate._id as any;
    await request.save();

    // Populate e retornar
    const populatedCertificate = await Certificate.findById(certificate._id)
      .populate('alunoId', 'nomeCompleto email cpf dataNascimento')
      .populate('cursoId', 'titulo');

    res.json({
      message: 'Solicitacao aprovada e certificado gerado com sucesso',
      request,
      certificate: populatedCertificate
    });
  } catch (error: any) {
    console.error('Erro ao aprovar solicitacao:', error);
    res.status(500).json({ message: 'Erro ao aprovar solicitacao de certificado' });
  }
};

// @desc    Reject certificate request (Admin)
// @route   PUT /api/certificate-requests/:id/reject
// @access  Private/Admin
export const rejectCertificateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { motivoRecusa } = req.body;

    const request = await CertificateRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Solicitacao nao encontrada' });
    }

    if (request.status !== 'pendente') {
      return res.status(400).json({
        message: 'Esta solicitacao ja foi processada'
      });
    }

    // Atualizar a solicitacao
    request.status = 'recusado';
    request.dataResposta = new Date();
    request.respondidoPor = req.user._id;
    request.motivoRecusa = motivoRecusa || 'Solicitacao recusada pelo administrador';
    await request.save();

    res.json({
      message: 'Solicitacao recusada',
      request
    });
  } catch (error: any) {
    console.error('Erro ao recusar solicitacao:', error);
    res.status(500).json({ message: 'Erro ao recusar solicitacao de certificado' });
  }
};

// @desc    Delete certificate request (Admin)
// @route   DELETE /api/certificate-requests/:id
// @access  Private/Admin
export const deleteCertificateRequest = async (req: Request, res: Response) => {
  try {
    const request = await CertificateRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Solicitacao nao encontrada' });
    }

    await CertificateRequest.findByIdAndDelete(req.params.id);

    res.json({ message: 'Solicitacao excluida com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir solicitacao:', error);
    res.status(500).json({ message: 'Erro ao excluir solicitacao de certificado' });
  }
};

// @desc    Check if user can request certificate for a course
// @route   GET /api/certificate-requests/can-request/:courseId
// @access  Private
export const canRequestCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const alunoId = req.user._id;

    // Buscar informacoes do curso
    const curso = await Course.findById(courseId);
    if (!curso) {
      return res.status(404).json({ message: 'Curso nao encontrado' });
    }

    // Verificar se ja existe um certificado
    const existingCertificate = await Certificate.findOne({ alunoId, cursoId: courseId });
    if (existingCertificate) {
      return res.json({
        canRequest: false,
        reason: 'already_has_certificate',
        message: 'Voce ja possui um certificado para este curso',
        certificateId: existingCertificate._id,
        emissaoImediata: curso.emissaoCertificadoImediata || false
      });
    }

    // Verificar se ja existe uma solicitacao (pendente ou recusada)
    const existingRequest = await CertificateRequest.findOne({
      alunoId,
      cursoId: courseId
    }).sort({ dataSolicitacao: -1 });

    if (existingRequest) {
      if (existingRequest.status === 'pendente') {
        return res.json({
          canRequest: false,
          reason: 'pending_request',
          message: 'Voce ja possui uma solicitacao pendente para este curso',
          requestId: existingRequest._id,
          request: {
            status: existingRequest.status,
            dataSolicitacao: existingRequest.dataSolicitacao,
            motivoRecusa: existingRequest.motivoRecusa
          },
          emissaoImediata: curso.emissaoCertificadoImediata || false
        });
      } else if (existingRequest.status === 'recusado') {
        // Permitir nova solicitacao se a anterior foi recusada
        // Mas informar sobre a recusa anterior
        return res.json({
          canRequest: true,
          reason: 'previous_rejected',
          message: 'Sua solicitacao anterior foi recusada. Voce pode tentar novamente.',
          previousRequest: {
            status: existingRequest.status,
            dataSolicitacao: existingRequest.dataSolicitacao,
            dataResposta: existingRequest.dataResposta,
            motivoRecusa: existingRequest.motivoRecusa
          },
          emissaoImediata: curso.emissaoCertificadoImediata || false
        });
      }
    }

    // Verificar progresso
    const user = await User.findById(alunoId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario nao encontrado' });
    }

    const aulasValidas = await Lesson.find({
      cursoId: courseId,
      tipo: { $in: ['ao_vivo', 'gravada'] }
    });

    const totalAulasValidas = aulasValidas.length;
    const aulasAssistidas = user.aulasAssistidas.filter((aulaId) =>
      aulasValidas.some((aula) => aula._id.toString() === aulaId.toString())
    ).length;

    const progresso = totalAulasValidas > 0
      ? Math.round((aulasAssistidas / totalAulasValidas) * 100)
      : 0;

    if (progresso < 100) {
      return res.json({
        canRequest: false,
        reason: 'incomplete_course',
        message: `Voce precisa concluir 100% do curso para solicitar o certificado. Progresso atual: ${progresso}%`,
        progresso,
        emissaoImediata: curso.emissaoCertificadoImediata || false
      });
    }

    res.json({
      canRequest: true,
      reason: 'eligible',
      message: 'Voce pode solicitar o certificado',
      progresso,
      emissaoImediata: curso.emissaoCertificadoImediata || false
    });
  } catch (error: any) {
    console.error('Erro ao verificar elegibilidade:', error);
    res.status(500).json({ message: 'Erro ao verificar elegibilidade para certificado' });
  }
};

// @desc    Immediate certificate issuance (when course has emissaoCertificadoImediata enabled)
// @route   POST /api/certificate-requests/immediate/:courseId
// @access  Private
export const issueCertificateImmediate = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const alunoId = req.user._id;

    // Verificar se o curso existe e tem emissao imediata habilitada
    const curso = await Course.findById(courseId);
    if (!curso) {
      return res.status(404).json({ message: 'Curso nao encontrado' });
    }

    if (!curso.emissaoCertificadoImediata) {
      return res.status(400).json({
        message: 'Este curso nao permite emissao imediata de certificado'
      });
    }

    // Verificar se ja existe um certificado
    const existingCertificate = await Certificate.findOne({ alunoId, cursoId: courseId });
    if (existingCertificate) {
      return res.status(400).json({
        message: 'Voce ja possui um certificado para este curso',
        certificateId: existingCertificate._id
      });
    }

    // Verificar progresso
    const user = await User.findById(alunoId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario nao encontrado' });
    }

    const aulasValidas = await Lesson.find({
      cursoId: courseId,
      tipo: { $in: ['ao_vivo', 'gravada'] }
    });

    const totalAulasValidas = aulasValidas.length;
    const aulasAssistidas = user.aulasAssistidas.filter((aulaId) =>
      aulasValidas.some((aula) => aula._id.toString() === aulaId.toString())
    ).length;

    const progresso = totalAulasValidas > 0
      ? Math.round((aulasAssistidas / totalAulasValidas) * 100)
      : 0;

    if (progresso < 100) {
      return res.status(400).json({
        message: `Voce precisa concluir 100% do curso para obter o certificado. Progresso atual: ${progresso}%`
      });
    }

    // Calcular carga horaria do curso
    const lessons = await Lesson.find({ cursoId: courseId });
    const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.duracao || 0), 0);
    const cargaHoraria = Math.round((totalMinutes / 60) * 10) / 10;

    // Gerar codigo de validacao unico
    const codigoValidacao = await Certificate.generateValidationCode(
      alunoId.toString(),
      courseId
    );

    // Criar o certificado
    const certificate = await Certificate.create({
      codigoValidacao,
      alunoId,
      cursoId: courseId,
      cargaHoraria,
      dataEmissao: new Date()
    });

    // Populate e retornar
    const populatedCertificate = await Certificate.findById(certificate._id)
      .populate('alunoId', 'nomeCompleto email cpf dataNascimento')
      .populate('cursoId', 'titulo');

    res.status(201).json({
      message: 'Certificado emitido com sucesso!',
      certificate: populatedCertificate
    });
  } catch (error: any) {
    console.error('Erro ao emitir certificado imediato:', error);
    res.status(500).json({ message: 'Erro ao emitir certificado' });
  }
};
