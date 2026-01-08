import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      if (!user.ativo) {
        return res.status(401).json({ message: 'Conta desativada' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Token inválido' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado, token não fornecido' });
  }
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

// Middleware para verificar permissão de visualizar aulas
export const canViewLessons = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const allowedRoles = ['Aluno', 'Instrutor', 'Administrador'];
  if (!allowedRoles.includes(req.user.cargo)) {
    return res.status(403).json({
      message: 'Você precisa ser um aluno para acessar as aulas. Aplique uma serial key válida no seu perfil.'
    });
  }

  next();
};

// Middleware opcional de autenticação (não bloqueia se não tiver token)
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };

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
