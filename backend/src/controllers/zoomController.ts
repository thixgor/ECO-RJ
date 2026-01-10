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

    // Criar payload para JWT (formato correto para Zoom SDK v5.x)
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 2; // Expira em 2 horas

    const payload = {
      appKey: sdkKey,  // Zoom SDK v5.x usa 'appKey' ao invés de 'sdkKey'
      sdkKey: sdkKey,  // Mantém para compatibilidade
      mn: meetingNumber,
      role: userRole,
      iat: iat,
      exp: exp,
      tokenExp: exp
    };

    console.log('[Zoom] Payload:', { ...payload, sdkKey: sdkKey.substring(0, 8) + '...' });

    // Gerar signature JWT com algoritmo HS256
    const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });

    console.log('[Zoom] Signature generated successfully');

    res.json({
      signature,
      sdkKey
    });
  } catch (error: any) {
    console.error('[Zoom] Error generating signature:', error);
    res.status(500).json({ message: 'Erro ao gerar signature do Zoom' });
  }
};
