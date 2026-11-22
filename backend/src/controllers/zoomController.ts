import { Response } from 'express';
import jwt from 'jsonwebtoken';
import Lesson from '../models/Lesson';
import { AuthRequest } from '../middleware/auth';
import { avaliarAcessoAoItem } from '../utils/courseAccess';
import { normalizarMeetingId } from '../utils/zoom';

/**
 * @desc    Credenciais para entrar na aula ao vivo pelo Zoom integrado
 * @route   POST /api/zoom/signature   body: { lessonId }
 * @access  Private — só quem tem acesso à aula
 *
 * Antes, qualquer usuário logado podia pedir uma assinatura para QUALQUER
 * número de reunião (e escolher role=1). Agora o cliente informa apenas a
 * aula; o servidor confere o acesso com a mesma regra de getLessonById e
 * devolve número, senha e assinatura de participante (role 0).
 */
export const generateZoomSignature = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ code: 'AULA_INVALIDA', message: 'Aula não informada.' });
    }

    const lesson = await Lesson.findById(lessonId)
      .select('tipo status zoomMeetingId zoomMeetingPassword cargosPermitidos cursoId')
      .populate('cursoId', 'acessoRestrito alunosAutorizados dataTermino');

    if (!lesson) {
      return res.status(404).json({ code: 'AULA_NAO_ENCONTRADA', message: 'Aula não encontrada.' });
    }

    const acesso = avaliarAcessoAoItem(lesson.cursoId as any, req.user, lesson.cargosPermitidos);
    if (!acesso.permitido) {
      return res.status(403).json({ code: 'SEM_ACESSO', message: acesso.mensagem });
    }

    if (lesson.status === 'inativa') {
      return res.status(409).json({ code: 'AULA_INATIVA', message: 'Esta aula não está disponível no momento.' });
    }

    const meetingNumber = normalizarMeetingId(lesson.zoomMeetingId);
    if (!meetingNumber) {
      return res.status(409).json({
        code: 'SEM_REUNIAO',
        message: 'Esta aula ainda não tem uma sala do Zoom configurada.'
      });
    }

    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;
    if (!sdkKey || !sdkSecret) {
      console.error('[Zoom] ZOOM_SDK_KEY/ZOOM_SDK_SECRET ausentes no ambiente');
      return res.status(503).json({
        code: 'ZOOM_NAO_CONFIGURADO',
        message: 'A sala integrada está temporariamente indisponível.'
      });
    }

    // Meeting SDK JWT — https://developers.zoom.us/docs/meeting-sdk/auth/
    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const signature = jwt.sign(
      { appKey: sdkKey, mn: meetingNumber, role: 0, iat, exp, tokenExp: exp },
      sdkSecret,
      { algorithm: 'HS256' }
    );

    res.json({
      signature,
      meetingNumber,
      password: lesson.zoomMeetingPassword || ''
    });
  } catch (error) {
    console.error('[Zoom] Erro ao gerar assinatura:', error);
    res.status(500).json({ code: 'ERRO_INTERNO', message: 'Não foi possível preparar a sala agora.' });
  }
};
