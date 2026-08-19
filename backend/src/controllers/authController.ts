import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { validateCRM, validateUF } from '../utils/validators';
import { ensureCriticalUserIndexes } from '../config/database-indexes';
import { getJwtSecret } from '../config/jwt';
import { AuthRequest } from '../middleware/auth';

const TIPOS_VALIDOS = ['Médico', 'Residente', 'Acadêmico de Medicina'];
const UFS_VALIDAS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MINIMA = 6;
const MAX_IPS_REGISTRADOS = 10;

// Normaliza o e-mail vindo do cliente. Teclados de celular costumam anexar
// espaços e capitalizar a primeira letra automaticamente.
const normalizarEmail = (valor: unknown): string =>
  typeof valor === 'string' ? valor.trim().toLowerCase() : '';

// Normaliza o token de recuperação: o usuário copia do arquivo .txt e o valor
// costuma chegar com espaços, quebras de linha ou hífens de formatação.
const normalizarToken = (valor: unknown): string =>
  typeof valor === 'string' ? valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

/** Compara dois segredos em tempo constante (não vaza o prefixo acertado). */
const comparaSegura = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // `timingSafeEqual` exige buffers do mesmo tamanho; comparar contra o próprio
  // buffer mantém o custo constante quando os tamanhos diferem.
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

// Traduz erros de validação do Mongoose para uma mensagem legível.
// Sem isso, senha curta ou e-mail malformado caíam no catch genérico e o
// usuário recebia 500 "Erro ao criar conta" sem saber o que corrigir.
const validationErrorMessage = (error: any): string | null => {
  if (!error || error.name !== 'ValidationError' || !error.errors) return null;
  const primeiro: any = Object.values(error.errors)[0];
  return primeiro?.message || 'Dados inválidos';
};

// Identifica o campo de um erro de chave duplicada (E11000) do MongoDB
const duplicateKeyField = (error: any): string | null => {
  if (!error || error.code !== 11000) return null;
  const source = error.keyPattern || error.keyValue;
  if (source && typeof source === 'object') {
    const [field] = Object.keys(source);
    if (field) return field;
  }
  // Fallback: extrai o nome do índice da mensagem (ex.: "index: cpf_1 dup key")
  const match = /index:\s+([A-Za-z0-9_.]+?)_\d+/.exec(String(error.message || ''));
  return match ? match[1] : null;
};

// Gerar JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, getJwtSecret(), {
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
      estado,
      tipoUsuario,
      // Médico
      crm,
      crmLocal,
      especialidade,
      // Residente
      areaResidencia,
      hospital,
      anoResidencia,
      semestreResidencia,
      // Acadêmico
      instituicao,
      periodo,
      dataNascimento
    } = req.body;

    // Validações básicas
    if (!email || !password || !nomeCompleto) {
      return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios' });
    }

    const emailNormalizado = normalizarEmail(email);
    if (!EMAIL_REGEX.test(emailNormalizado)) {
      return res.status(400).json({ message: 'Digite um e-mail válido' });
    }

    if (typeof password !== 'string' || password.length < SENHA_MINIMA) {
      return res.status(400).json({ message: `A senha deve ter no mínimo ${SENHA_MINIMA} caracteres` });
    }

    const nomeNormalizado = String(nomeCompleto).trim();
    if (nomeNormalizado.length < 3) {
      return res.status(400).json({ message: 'Informe seu nome completo' });
    }

    // Estado é obrigatório e vem antes de tudo
    if (!estado || !UFS_VALIDAS.includes(String(estado).toUpperCase())) {
      return res.status(400).json({ message: 'Selecione um estado válido' });
    }

    // Tipo de usuário obrigatório
    if (!tipoUsuario || !TIPOS_VALIDOS.includes(tipoUsuario)) {
      return res.status(400).json({ message: 'Selecione o tipo de perfil (Médico, Residente ou Acadêmico de Medicina)' });
    }

    // Dados a serem persistidos, montados conforme o tipo
    const dadosPerfil: Record<string, any> = {};

    let crmClean: string | undefined;

    if (tipoUsuario === 'Médico') {
      if (!especialidade || !String(especialidade).trim()) {
        return res.status(400).json({ message: 'Informe a especialidade' });
      }
      if (!crm) {
        return res.status(400).json({ message: 'Informe o CRM' });
      }
      if (!validateCRM(crm)) {
        return res.status(400).json({ message: 'CRM inválido. Deve conter de 4 a 7 dígitos numéricos.' });
      }
      const localCrm = crmLocal || estado;
      if (!validateUF(localCrm)) {
        return res.status(400).json({ message: 'UF do CRM inválida' });
      }
      crmClean = crm.replace(/[^\dA-Za-z]/g, '').toUpperCase();
      dadosPerfil.especialidade = String(especialidade).trim();
      dadosPerfil.crm = crmClean;
      dadosPerfil.crmLocal = String(localCrm).toUpperCase();
    } else if (tipoUsuario === 'Residente') {
      if (!areaResidencia || !String(areaResidencia).trim()) {
        return res.status(400).json({ message: 'Informe a área da residência' });
      }
      if (!hospital || !String(hospital).trim()) {
        return res.status(400).json({ message: 'Informe o hospital da residência' });
      }
      if (!anoResidencia || !String(anoResidencia).trim()) {
        return res.status(400).json({ message: 'Informe o ano da residência (R1, R2...)' });
      }
      dadosPerfil.areaResidencia = String(areaResidencia).trim();
      dadosPerfil.hospital = String(hospital).trim();
      dadosPerfil.anoResidencia = String(anoResidencia).trim();
      if (semestreResidencia) dadosPerfil.semestreResidencia = String(semestreResidencia).trim();
    } else if (tipoUsuario === 'Acadêmico de Medicina') {
      if (!instituicao || !String(instituicao).trim()) {
        return res.status(400).json({ message: 'Informe a instituição de ensino' });
      }
      if (!periodo || !String(periodo).trim()) {
        return res.status(400).json({ message: 'Informe o período do curso' });
      }
      dadosPerfil.instituicao = String(instituicao).trim();
      dadosPerfil.periodo = String(periodo).trim();
    }

    // Verificar se email já existe
    const emailExists = await User.findOne({ email: emailNormalizado });
    if (emailExists) {
      return res.status(400).json({ message: 'Este e-mail já está cadastrado' });
    }

    // Verificar se CRM já existe (apenas médicos)
    if (crmClean) {
      const crmExists = await User.findOne({ crm: crmClean });
      if (crmExists) {
        return res.status(400).json({ message: 'Este CRM já está cadastrado' });
      }
    }

    // Gerar token de recuperação de senha único
    const tokenRecuperacao = generateRecoveryToken();

    // Criar usuário. O CPF não é coletado aqui: ele é vinculado depois, a partir
    // do CPF usado na compra (checkout).
    const novoUsuario = {
      email: emailNormalizado,
      password,
      nomeCompleto: nomeNormalizado,
      estado: String(estado).toUpperCase(),
      tipoUsuario,
      ...dadosPerfil,
      ...(dataNascimento ? { dataNascimento: new Date(dataNascimento) } : {}),
      cargo: 'Visitante' as const,
      emailConfirmado: true, // Por enquanto sem confirmação por email
      tokenRecuperacao
    };

    let user;
    try {
      user = await User.create(novoUsuario);
    } catch (err: any) {
      // Se a colisão for em um campo que o cadastro sequer envia (CPF/CRM de quem
      // não é médico), o problema é um índice único antigo do banco indexando a
      // chave nula. Repara o índice e tenta uma única vez novamente.
      const campo = duplicateKeyField(err);
      const campoNaoEnviado = (campo === 'cpf') || (campo === 'crm' && !crmClean);
      if (!campoNaoEnviado) throw err;

      await ensureCriticalUserIndexes(true);
      user = await User.create(novoUsuario);
    }

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

    // Erros de validação do schema viram 400 com a mensagem real
    const validacao = validationErrorMessage(error);
    if (validacao) {
      return res.status(400).json({ message: validacao });
    }

    // Tratar erros de duplicação do MongoDB
    const field = duplicateKeyField(error);
    if (field) {
      const fieldNames: Record<string, string> = {
        email: 'E-mail',
        cpf: 'CPF',
        crm: 'CRM'
      };
      // O cadastro não envia CPF; se ainda assim houve colisão, é problema de
      // índice no banco — não faz sentido culpar o dado do usuário.
      if (field === 'cpf') {
        return res.status(500).json({
          message: 'Erro ao criar conta. Tente novamente em instantes.'
        });
      }
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

    const emailNormalizado = normalizarEmail(email);
    if (!emailNormalizado || typeof password !== 'string') {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Buscar usuário
    const user = await User.findOne({ email: emailNormalizado });
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

    // Registrar último login e IP.
    // Feito com updateOne (em vez de user.save()) por dois motivos: não revalida o
    // documento inteiro — contas antigas com campos fora do schema atual travariam
    // o login com erro 500 — e mantém apenas os últimos acessos, já que a lista de
    // IPs crescia indefinidamente a cada rede nova (celular troca de IP o tempo todo).
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ipsAtualizados = [ip, ...(user.ipsAcesso || []).filter((registrado) => registrado !== ip)]
      .slice(0, MAX_IPS_REGISTRADOS);

    try {
      await User.updateOne(
        { _id: user._id },
        { $set: { ultimoLogin: new Date(), ipsAcesso: ipsAtualizados } }
      );
    } catch (err: any) {
      // Falha ao registrar o acesso não pode impedir o login de quem já se autenticou
      console.error('Não foi possível registrar o acesso do usuário:', err?.message || err);
    }

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
    const {
      nomeCompleto,
      especialidade,
      bio,
      fotoPerfil,
      // Campos por tipo de perfil
      areaResidencia,
      hospital,
      anoResidencia,
      semestreResidencia,
      instituicao,
      periodo
    } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (nomeCompleto) user.nomeCompleto = nomeCompleto;
    if (especialidade !== undefined) user.especialidade = especialidade;
    if (bio !== undefined) user.bio = bio;
    if (fotoPerfil !== undefined) user.fotoPerfil = fotoPerfil;
    // Atualização dos campos específicos (residente / acadêmico)
    if (areaResidencia !== undefined) user.areaResidencia = areaResidencia;
    if (hospital !== undefined) user.hospital = hospital;
    if (anoResidencia !== undefined) user.anoResidencia = anoResidencia;
    if (semestreResidencia !== undefined) user.semestreResidencia = semestreResidencia;
    if (instituicao !== undefined) user.instituicao = instituicao;
    if (periodo !== undefined) user.periodo = periodo;

    await user.save();

    res.json({
      _id: user._id,
      nomeCompleto: user.nomeCompleto,
      email: user.email,
      especialidade: user.especialidade,
      bio: user.bio,
      fotoPerfil: user.fotoPerfil,
      cargo: user.cargo,
      tipoUsuario: user.tipoUsuario,
      estado: user.estado,
      areaResidencia: user.areaResidencia,
      hospital: user.hospital,
      anoResidencia: user.anoResidencia,
      semestreResidencia: user.semestreResidencia,
      instituicao: user.instituicao,
      periodo: user.periodo
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

    if (typeof novaSenha !== 'string' || novaSenha.length < SENHA_MINIMA) {
      return res.status(400).json({ message: `Nova senha deve ter no mínimo ${SENHA_MINIMA} caracteres` });
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

    if (typeof novaSenha !== 'string' || novaSenha.length < SENHA_MINIMA) {
      return res.status(400).json({ message: `Nova senha deve ter no mínimo ${SENHA_MINIMA} caracteres` });
    }

    // Mensagem única para qualquer falha de identificação: mensagens diferentes
    // permitiriam descobrir quais e-mails possuem conta na plataforma.
    const TOKEN_INVALIDO = 'Token inválido. Verifique as informações e tente novamente.';

    const user = await User.findOne({ email: normalizarEmail(email) });
    if (!user || !user.tokenRecuperacao) {
      return res.status(400).json({ message: TOKEN_INVALIDO });
    }

    // O token é copiado do arquivo .txt baixado no cadastro, então costuma vir com
    // espaços, quebras de linha ou hífens — normaliza antes de comparar.
    // A comparação é feita em tempo constante para não vazar, pelo tempo de
    // resposta, quantos caracteres iniciais do token o atacante já acertou.
    const tokenInformado = normalizarToken(tokenRecuperacao);
    if (!tokenInformado || !comparaSegura(normalizarToken(user.tokenRecuperacao), tokenInformado)) {
      return res.status(400).json({ message: TOKEN_INVALIDO });
    }

    // Verificar se a conta está ativa
    if (!user.ativo) {
      return res.status(400).json({ message: 'Conta desativada. Entre em contato com o suporte.' });
    }

    // Atualizar senha e ROTACIONAR o token de recuperação.
    //
    // O token era permanente: quem tivesse obtido uma cópia do .txt (e-mail
    // encaminhado, backup, computador compartilhado) mantinha para sempre o poder
    // de redefinir a senha da conta — inclusive depois de a vítima trocá-la.
    // Trocando o token a cada uso, uma redefinição feita pelo dono invalida
    // qualquer cópia antiga.
    const novoTokenRecuperacao = generateRecoveryToken();
    user.password = novaSenha;
    user.tokenRecuperacao = novoTokenRecuperacao;
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
      token,
      // O token anterior deixou de valer — o usuário precisa guardar este.
      tokenRecuperacao: novoTokenRecuperacao
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
};
