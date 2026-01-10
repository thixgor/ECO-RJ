import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// Gerar Zoom Meeting SDK JWT Signature
export const generateZoomSignature = async (req: Request, res: Response) => {
  try {
    const { meetingNumber, role } = req.body;

    console.log('[Zoom] Generating signature for meeting:', meetingNumber);

    // Validar inputs
    if (!meetingNumber) {
      console.error('[Zoom] Meeting number is missing');
      return res.status(400).json({ message: 'Meeting number é obrigatório' });
    }

    // Credenciais do Zoom (do .env)
    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
      console.error('[Zoom] SDK credentials not configured in .env');
      return res.status(500).json({
        message: 'Credenciais Zoom não configuradas no servidor'
      });
    }

    // Role: 0 = participante, 1 = host (padrão: participante)
    const userRole = role || 0;

    // Criar payload para JWT seguindo EXATAMENTE a documentação oficial do Zoom
    // https://developers.zoom.us/docs/meeting-sdk/auth/#generate-a-meeting-sdk-jwt
    const iat = Math.round(new Date().getTime() / 1000) - 30; // Subtrai 30s como no exemplo oficial
    const exp = iat + 60 * 60 * 2; // Expira em 2 horas
    const tokenExp = exp;

    // Payload DEVE incluir AMBOS sdkKey E appKey (conforme exemplo oficial)
    const payload = {
      sdkKey: sdkKey,        // Obrigatório (mesmo valor de appKey)
      mn: String(meetingNumber),
      role: userRole,
      iat: iat,
      exp: exp,
      appKey: sdkKey,        // Obrigatório (mesmo valor de sdkKey)
      tokenExp: tokenExp
    };

    console.log('[Zoom] Payload:', {
      sdkKey: sdkKey.substring(0, 10) + '...',
      mn: meetingNumber,
      role: userRole,
      iat,
      exp,
      tokenExp: payload.tokenExp
    });

    // Gerar signature JWT com algoritmo HS256
    const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });

    console.log('[Zoom] Signature generated successfully');

    // Retornar apenas a signature
    // SDK JWT Signature já contém o appKey no payload, não precisa enviar sdkKey separado
    res.json({
      signature
    });
  } catch (error: any) {
    console.error('[Zoom] Error generating signature:', error);
    res.status(500).json({ message: 'Erro ao gerar signature do Zoom' });
  }
};
