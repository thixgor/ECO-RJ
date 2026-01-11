import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { validateCPF, validateCRM, validateUF } from '../utils/validators';
import { AuthRequest } from '../middleware/auth';

// Gerar JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any
  });
};

// Gerar token de recuperação de senha (único e permanente)
const generateRecoveryToken = (): string => {
  return crypto.randomBytes(24).toString('hex').toUpperCase();
};

// @desc    Registrar novo usuário
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      nomeCompleto,
      cpf,
      crm,
      crmLocal,
      dataNascimento,
      especialidade
    } = req.body;

    // Validações
    if (!email || !password || !nomeCompleto || !cpf || !crm || !crmLocal || !dataNascimento) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // Validar CPF
    if (!validateCPF(cpf)) {
      return res.status(400).json({ message: 'CPF inválido' });
    }

    // Validar CRM
    if (!validateCRM(crm)) {
      return res.status(400).json({ message: 'CRM inválido. Deve conter de 4 a 7 dígitos numéricos.' });
    }

    // Validar UF
    if (!validateUF(crmLocal)) {
      return res.status(400).json({ message: 'UF do CRM inválida' });
    }

    // Verificar se email já existe
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: 'Este e-mail já está cadastrado' });
    }

    // Verificar se CPF já existe
    const cpfClean = cpf.replace(/[^\d]/g, '');
    const cpfExists = await User.findOne({ cpf: cpfClean });
    if (cpfExists) {
      return res.status(400).json({ message: 'Este CPF já está cadastrado' });
    }

    // Verificar se CRM já existe
    const crmClean = crm.replace(/[^\dA-Za-z]/g, '').toUpperCase();
    const crmExists = await User.findOne({ crm: crmClean });
    if (crmExists) {
      return res.status(400).json({ message: 'Este CRM já está cadastrado' });
    }

    // Gerar token de recuperação de senha único
    const tokenRecuperacao = generateRecoveryToken();

    // Criar usuário
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      nomeCompleto,
      cpf: cpfClean,
      crm: crmClean,
      crmLocal: crmLocal.toUpperCase(),
      dataNascimento: new Date(dataNascimento),
      especialidade,
      cargo: 'Visitante',
      emailConfirmado: true, // Por enquanto sem confirmação por email
      tokenRecuperacao
    });

    // Gerar token JWT
    const token = generateToken(user._id.toString());

    // Retornar dados incluindo token de recuperação (apenas neste momento!)
    res.status(201).json({
      _id: user._id,
      nomeCompleto: user.nomeCompleto,
      email: user.email,
      cargo: user.cargo,
      token,
      tokenRecuperacao // Único momento em que o token de recuperação é retornado!
    });
  } catch (error: any) {
    console.error('Erro no registro:', error);

    // Tratar erros de duplicação do MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldNames: Record<string, string> = {
        email: 'E-mail',
        cpf: 'CPF',
        crm: 'CRM'
      };
      return res.status(400).json({
        message: `${fieldNames[field] || field} já está cadastrado`
      });
    }

    res.status(500).json({ message: 'Erro ao criar conta' });
  }
};

// @desc    Login de usuário
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Verificar se está ativo
    if (!user.ativo) {
      return res.status(401).json({ message: 'Conta desativada. Entre em contato com o suporte.' });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Atualizar último login e IP
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    user.ultimoLogin = new Date();
    if (!user.ipsAcesso.includes(ip)) {
      user.ipsAcesso.push(ip);
    }
    await user.save();

    // Gerar token
    const token = generateToken(user._id.toString());

    res.json({
      _id: user._id,
      nomeCompleto: user.nomeCompleto,
      email: user.email,
      cargo: user.cargo,
      fotoPerfil: user.fotoPerfil,
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
};

// @desc    Obter perfil do usuário logado
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id)
      .select('-password -tokenRecuperacao') // Nunca expor token de recuperação
      .populate('cursosInscritos', 'titulo imagemCapa')
      .populate('serialKeysUsadas', 'chave cargoAtribuido dataUso');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
};

// @desc    Atualizar perfil do usuário
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { nomeCompleto, especialidade, bio, fotoPerfil } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (nomeCompleto) user.nomeCompleto = nomeCompleto;
    if (especialidade !== undefined) user.especialidade = especialidade;
    if (bio !== undefined) user.bio = bio;
    if (fotoPerfil !== undefined) user.fotoPerfil = fotoPerfil;

    await user.save();

    res.json({
      _id: user._id,
      nomeCompleto: user.nomeCompleto,
      email: user.email,
      especialidade: user.especialidade,
      bio: user.bio,
      fotoPerfil: user.fotoPerfil,
      cargo: user.cargo
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
};

// @desc    Alterar senha
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ message: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const isMatch = await user.comparePassword(senhaAtual);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }

    user.password = novaSenha;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro ao alterar senha' });
  }
};

// @desc    Recuperar senha usando token de recuperação
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPasswordWithToken = async (req: Request, res: Response) => {
  try {
    const { email, tokenRecuperacao, novaSenha } = req.body;

    if (!email || !tokenRecuperacao || !novaSenha) {
      return res.status(400).json({ message: 'E-mail, token de recuperação e nova senha são obrigatórios' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ message: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    // Buscar usuário pelo email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Token inválido. Verifique as informações e tente novamente.' });
    }

    // Verificar se o usuário tem token de recuperação
    if (!user.tokenRecuperacao) {
      return res.status(400).json({ message: 'Token de recuperação não configurado para este usuário. Entre em contato com o suporte.' });
    }

    // Verificar se o token corresponde (comparação case-insensitive)
    if (user.tokenRecuperacao.toUpperCase() !== tokenRecuperacao.toUpperCase()) {
      return res.status(400).json({ message: 'Token inválido. Verifique as informações e tente novamente.' });
    }

    // Verificar se a conta está ativa
    if (!user.ativo) {
      return res.status(400).json({ message: 'Conta desativada. Entre em contato com o suporte.' });
    }

    // Atualizar senha
    user.password = novaSenha;
    await user.save();

    // Gerar token JWT para login automático
    const token = generateToken(user._id.toString());

    res.json({
      message: 'Senha redefinida com sucesso!',
      _id: user._id,
      nomeCompleto: user.nomeCompleto,
      email: user.email,
      cargo: user.cargo,
      fotoPerfil: user.fotoPerfil,
      token
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
};
