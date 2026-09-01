import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { getJwtSecret } from '../config/jwt';
import { CARGOS_COM_ACESSO } from '../config/roles';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || '';
  let token;

  if (/^bearer\s/i.test(authHeader)) {
    try {
      token = authHeader.replace(/^bearer\s+/i, '').trim();

      const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      if (!user.ativo) {
        return res.status(401).json({ message: 'Conta desativada' });
      }

      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Sessão expirada. Entre novamente.' });
    }
  }

  return res.status(401).json({ message: 'Não autorizado, token não fornecido' });
};

// Middleware para verificar cargo específico
export const authorize = (...cargos: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    if (!cargos.includes(req.user.cargo)) {
      return res.status(403).json({
        message: `Acesso negado. Cargo '${req.user.cargo}' não tem permissão para esta ação`
      });
    }

    next();
  };
};

// Middleware específico para admin
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  if (req.user.cargo !== 'Administrador') {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }

  next();
};

/**
 * Middleware de cargo "com acesso" (Aluno+). NÃO use para aulas/materiais de um
 * curso: o acesso ao conteúdo depende do vínculo com o curso, não só do cargo
 * global — veja `utils/courseAccess`.
 */
export const requireCargoComAcesso = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  if (!CARGOS_COM_ACESSO.includes(req.user.cargo as any)) {
    return res.status(403).json({
      message: 'Você precisa ser Aluno para acessar este recurso. Compre um curso ou ative sua chave de acesso no perfil.'
    });
  }

  next();
};

// Middleware opcional de autenticação (não bloqueia se não tiver token)
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || '';

  if (/^bearer\s/i.test(authHeader)) {
    try {
      const token = authHeader.replace(/^bearer\s+/i, '').trim();

      const decoded = jwt.verify(token, getJwtSecret()) as { id: string };

      const user = await User.findById(decoded.id).select('-password');

      if (user && user.ativo) {
        req.user = user;
      }
    } catch (error) {
      // Token inválido, mas não bloqueia a requisição
    }
  }

  next();
};
