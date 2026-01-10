import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// Gerar Zoom Meeting SDK JWT Signature
export const generateZoomSignature = async (req: Request, res: Response) => {
  try {
    const { meetingNumber, role } = req.body;

    // Validar inputs
    if (!meetingNumber) {
      return res.status(400).json({ message: 'Meeting number é obrigatório' });
    }

    // Credenciais do Zoom (do .env)
    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
      return res.status(500).json({
        message: 'Credenciais Zoom não configuradas no servidor'
      });
    }

    // Role: 0 = participante, 1 = host (padrão: participante)
    const userRole = role || 0;

    // Criar payload para JWT
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 2; // Expira em 2 horas

    const payload = {
      sdkKey: sdkKey,
      mn: meetingNumber,
      role: userRole,
      iat: iat,
      exp: exp,
      tokenExp: exp
    };

    // Gerar signature JWT
    const signature = jwt.sign(payload, sdkSecret);

    res.json({
      signature,
      sdkKey
    });
  } catch (error: any) {
    console.error('Erro ao gerar Zoom signature:', error);
    res.status(500).json({ message: 'Erro ao gerar signature do Zoom' });
  }
};
