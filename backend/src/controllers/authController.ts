import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Course from '../models/Course';
import PasswordReset from '../models/PasswordReset';
import { CARGOS_COM_ACESSO } from '../config/roles';
import { validateCRM, validateUF, validarForcaSenha, SENHA_POLITICA_TEXTO } from '../utils/validators';
import { consumirLimite, limparLimite, getClientIp } from '../services/rateLimitService';
import {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  ultimoErroEnvio
} from '../services/emailService';
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

    // Freio de força bruta em duas dimensões: por conta (protege UMA senha de
    // ser adivinhada) e por IP (protege o conjunto de contas de uma varredura
    // com senhas comuns). A chave usa o hash do e-mail para não guardar o
    // endereço no contador. Os limites são generosos o bastante para não
    // atrapalhar quem só errou a senha algumas vezes.
    const ipLogin = getClientIp(req);
    const chaveConta = `login:email:${crypto.createHash('sha256').update(emailNormalizado).digest('hex')}`;
    const limiteConta = await consumirLimite(chaveConta, 10, 15 * 60);
    if (!limiteConta.permitido) {
      return res.status(429).json({
        message: 'Muitas tentativas de login para esta conta. Aguarde alguns minutos ou redefina sua senha.',
        retryAfter: limiteConta.retryAfter
      });
    }
    const limiteIp = await consumirLimite(`login:ip:${ipLogin}`, 50, 15 * 60);
    if (!limiteIp.permitido) {
      return res.status(429).json({
        message: 'Muitas tentativas de login a partir deste dispositivo. Aguarde alguns minutos.',
        retryAfter: limiteIp.retryAfter
      });
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

    // Login correto: zera o contador de tentativas desta conta.
    await limparLimite(chaveConta);

    // Registrar último login e IP.
    // Feito com updateOne (em vez de user.save()) por dois motivos: não revalida o
    // documento inteiro — contas antigas com campos fora do schema atual travariam
    // o login com erro 500 — e mantém apenas os últimos acessos, já que a lista de
    // IPs crescia indefinidamente a cada rede nova (celular troca de IP o tempo todo).
    const ip = ipLogin || req.ip || req.socket.remoteAddress || 'unknown';
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

    // Acesso a conteúdo não depende só do cargo: quem foi autorizado em algum
    // curso pelo admin é aluno daquele curso mesmo continuando "Visitante".
    // A interface usa este campo para não tratar essas pessoas como visitantes.
    const cursosAutorizados = CARGOS_COM_ACESSO.includes(user.cargo as any)
      ? 0
      : await Course.countDocuments({ alunosAutorizados: user._id });

    const userObj = user.toObject();
    (userObj as any).temAcessoAConteudo =
      CARGOS_COM_ACESSO.includes(user.cargo as any) || cursosAutorizados > 0;

    res.json(userObj);
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

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Política de senha forte (a mesma da redefinição por e-mail). O cadastro
    // antigo aceitava 6 caracteres; ao TROCAR a senha, exigimos a regra atual.
    const erroSenha = validarForcaSenha(novaSenha, user.email);
    if (erroSenha) {
      return res.status(400).json({ message: erroSenha });
    }

    const isMatch = await user.comparePassword(senhaAtual);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }

    if (senhaAtual === novaSenha) {
      return res.status(400).json({ message: 'A nova senha deve ser diferente da senha atual.' });
    }

    user.password = novaSenha;
    await user.save();

    // Avisa o titular — se não foi ele, precisa reagir rápido.
    sendPasswordChangedEmail({ to: user.email, nome: user.nomeCompleto, ip: getClientIp(req) })
      .catch((err) => console.error('Falha ao enviar aviso de troca de senha:', err));

    // A troca invalida as sessões antigas (inclusive a que fez a requisição):
    // devolvemos um token novo para o próprio usuário continuar navegando.
    const novoToken = generateToken(user._id.toString());

    res.json({ message: 'Senha alterada com sucesso', token: novoToken });
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

    const emailNormalizado = normalizarEmail(email);

    // Política de senha forte, igual à da redefinição por e-mail.
    const erroSenha = validarForcaSenha(novaSenha, emailNormalizado);
    if (erroSenha) {
      return res.status(400).json({ message: erroSenha });
    }

    // Freio de força bruta sobre o token permanente do cadastro.
    const ipReset = getClientIp(req);
    const limiteIpReset = await consumirLimite(`reset-token:ip:${ipReset}`, 20, 60 * 60);
    if (!limiteIpReset.permitido) {
      return res.status(429).json({
        message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        retryAfter: limiteIpReset.retryAfter
      });
    }
    const limiteEmailReset = await consumirLimite(
      `reset-token:email:${crypto.createHash('sha256').update(emailNormalizado).digest('hex')}`,
      10,
      60 * 60
    );
    if (!limiteEmailReset.permitido) {
      return res.status(429).json({
        message: 'Muitas tentativas para esta conta. Aguarde alguns minutos e tente novamente.',
        retryAfter: limiteEmailReset.retryAfter
      });
    }

    // Mensagem única para qualquer falha de identificação: mensagens diferentes
    // permitiriam descobrir quais e-mails possuem conta na plataforma.
    const TOKEN_INVALIDO = 'Token inválido. Verifique as informações e tente novamente.';

    const user = await User.findOne({ email: emailNormalizado });
    if (!user || !user.tokenRecuperacao) {
      return res.status(400).json({ message: TOKEN_INVALIDO });
    }

    // O token é copiado do arquivo .txt baixado no cadastro, então costuma vir com
    // espaços, quebras de linha ou hífens — normaliza antes de comparar.
    const tokenInformado = normalizarToken(tokenRecuperacao);
    if (!tokenInformado || normalizarToken(user.tokenRecuperacao) !== tokenInformado) {
      return res.status(400).json({ message: TOKEN_INVALIDO });
    }

    // Verificar se a conta está ativa
    if (!user.ativo) {
      return res.status(400).json({ message: 'Conta desativada. Entre em contato com o suporte.' });
    }

    // Atualizar senha
    user.password = novaSenha;
    await user.save();

    // Qualquer link de redefinição por e-mail que estivesse pendente perde a
    // validade: a senha já foi trocada por outro caminho.
    await PasswordReset.updateMany(
      { user: user._id, usadoEm: { $exists: false }, invalidadoEm: { $exists: false } },
      { $set: { invalidadoEm: new Date() } }
    );

    // Avisa o titular sobre a troca (best-effort).
    sendPasswordChangedEmail({ to: user.email, nome: user.nomeCompleto, ip: ipReset })
      .catch((err) => console.error('Falha ao enviar aviso de troca de senha:', err));

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

/* ======================================================================== */
/*  RECUPERAÇÃO DE SENHA POR E-MAIL                                          */
/* ======================================================================== */

/**
 * Como este fluxo foi desenhado (e por que cada decisão existe):
 *
 *  1. TOKEN FORTE: 32 bytes aleatórios de `crypto.randomBytes` (256 bits),
 *     codificados em base64url. Adivinhar por força bruta é inviável.
 *  2. GUARDADO COMO HASH: o banco só tem o SHA-256 do token. Um vazamento do
 *     banco não permite redefinir a senha de ninguém. A validação é feita
 *     buscando pelo hash do token informado — não há comparação byte a byte,
 *     então também não existe brecha de timing.
 *  3. CURTA DURAÇÃO: 30 minutos.
 *  4. USO ÚNICO: ao ser usado, o token é marcado e nenhum outro pedido antigo
 *     continua válido (um pedido novo invalida os anteriores).
 *  5. SEM ENUMERAÇÃO DE CONTAS: a resposta é sempre a mesma, exista ou não a
 *     conta. Quem não tem conta simplesmente não recebe e-mail.
 *  6. RATE LIMIT EM DUAS DIMENSÕES: por e-mail (não vira ferramenta de spam
 *     contra uma pessoa) e por IP (não vira disparador em massa).
 *  7. INVALIDAÇÃO DE SESSÕES: trocar a senha atualiza `senhaAlteradaEm` e
 *     derruba todos os JWTs emitidos antes — inclusive o de um invasor.
 *  8. SENHA FORTE: a nova senha passa pela política de força (8+, letra+número).
 *  9. AVISO PÓS-TROCA: um segundo e-mail confirma a alteração, para a vítima de
 *     um acesso indevido perceber e reagir.
 */

const RESET_TOKEN_BYTES = 32;
const RESET_VALIDADE_MINUTOS = 30;
const RESET_RETENCAO_HORAS = 24; // trilha de auditoria/rate limit após expirar

// Resposta única do "esqueci minha senha" — nunca revela se o e-mail existe.
const RESPOSTA_GENERICA_RESET =
  'Se houver uma conta com este e-mail, enviamos as instruções de redefinição. Verifique sua caixa de entrada e o spam.';

const hashSha256 = (valor: string): string =>
  crypto.createHash('sha256').update(valor).digest('hex');

/** Token que vai no link do e-mail: aleatório, longo e seguro para URL. */
const gerarTokenReset = (): string =>
  crypto.randomBytes(RESET_TOKEN_BYTES).toString('base64url');

function getBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://ecorj.com').replace(/\/+$/, '');
}

/** Mascara o e-mail exibido na tela de redefinição (confirmação sem exposição). */
function mascararEmail(email: string): string {
  const [usuario, dominio] = String(email || '').split('@');
  if (!usuario || !dominio) return '***';
  const visivel = usuario.length <= 2 ? usuario.charAt(0) : usuario.substring(0, 2);
  return `${visivel}${'*'.repeat(Math.max(2, usuario.length - visivel.length))}@${dominio}`;
}

// @desc    Solicitar redefinição de senha por e-mail
// @route   POST /api/auth/forgot-password
// @access  Public (rate limited)
export const forgotPassword = async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  try {
    const email = normalizarEmail(req.body?.email);
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Digite um e-mail válido' });
    }

    // Rate limit por IP: impede varredura e uso da plataforma como spammer.
    const limiteIp = await consumirLimite(`pwd-reset:ip:${ip}`, 10, 60 * 60);
    if (!limiteIp.permitido) {
      return res.status(429).json({
        message: 'Muitas solicitações a partir deste dispositivo. Tente novamente mais tarde.',
        retryAfter: limiteIp.retryAfter
      });
    }

    // Rate limit por e-mail: ninguém consegue inundar a caixa de outra pessoa.
    // A chave é o HASH do e-mail — o contador não guarda o endereço em claro.
    const emailHash = hashSha256(email);
    const limiteEmail = await consumirLimite(`pwd-reset:email:${emailHash}`, 3, 60 * 60);
    if (!limiteEmail.permitido) {
      // Continua respondendo a mensagem genérica: um atacante não deve
      // conseguir descobrir nada — nem sequer que o limite foi atingido.
      return res.json({ message: RESPOSTA_GENERICA_RESET });
    }

    const agora = new Date();
    const user = await User.findOne({ email }).select('_id nomeCompleto ativo email');

    // Sem conta (ou conta desativada): registra a tentativa para auditoria e
    // responde exatamente como no caso de sucesso.
    if (!user || !user.ativo) {
      await PasswordReset.create({
        emailHash,
        expiraEm: agora,
        purgarEm: new Date(agora.getTime() + RESET_RETENCAO_HORAS * 3600 * 1000),
        ipSolicitacao: ip,
        userAgentSolicitacao: String(req.headers['user-agent'] || '').substring(0, 300)
      }).catch(() => { /* auditoria é best-effort */ });
      return res.json({ message: RESPOSTA_GENERICA_RESET });
    }

    // Um pedido novo invalida os anteriores: só o último link funciona.
    await PasswordReset.updateMany(
      { user: user._id, usadoEm: { $exists: false }, invalidadoEm: { $exists: false } },
      { $set: { invalidadoEm: agora } }
    );

    const token = gerarTokenReset();
    await PasswordReset.create({
      user: user._id,
      emailHash,
      tokenHash: hashSha256(token),
      expiraEm: new Date(agora.getTime() + RESET_VALIDADE_MINUTOS * 60 * 1000),
      purgarEm: new Date(agora.getTime() + RESET_RETENCAO_HORAS * 3600 * 1000),
      ipSolicitacao: ip,
      userAgentSolicitacao: String(req.headers['user-agent'] || '').substring(0, 300)
    });

    const link = `${getBaseUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
    const enviado = await sendPasswordResetEmail({
      to: user.email,
      nome: user.nomeCompleto,
      link,
      minutosValidade: RESET_VALIDADE_MINUTOS,
      ip
    });

    if (!enviado) {
      // O envio falhou (SMTP fora do ar). Só neste caso saímos da resposta
      // genérica: seria cruel deixar a pessoa esperando um e-mail que nunca vai
      // chegar. A mensagem não revela se a conta existe — descreve uma falha do
      // servidor, que aconteceria igualmente para um e-mail sem conta.
      // `ultimoErroEnvio` traz o motivo real (timeout, auth, DNS...) que o
      // nodemailer devolveu — sem isso, o log só dizia "falhou", sem o porquê.
      console.error(`Falha ao enviar e-mail de redefinição (IP ${ip}): ${ultimoErroEnvio || 'motivo desconhecido'}`);
      return res.status(503).json({
        message: 'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos ou fale com o suporte.'
      });
    }

    return res.json({ message: RESPOSTA_GENERICA_RESET });
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error);
    // Mesmo em erro, resposta genérica (não vaza estado interno).
    return res.json({ message: RESPOSTA_GENERICA_RESET });
  }
};

/** Busca um pedido de redefinição válido a partir do token em claro. */
async function buscarResetValido(token: string) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const registro = await PasswordReset.findOne({ tokenHash: hashSha256(token) });
  if (!registro) return null;
  if (registro.usadoEm || registro.invalidadoEm) return null;
  if (registro.expiraEm.getTime() < Date.now()) return null;
  return registro;
}

// @desc    Verificar se um link de redefinição ainda é válido
// @route   POST /api/auth/reset-password/validate
// @access  Public (rate limited)
export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const limite = await consumirLimite(`pwd-reset-validate:ip:${ip}`, 30, 60 * 60);
    if (!limite.permitido) {
      return res.status(429).json({ valido: false, message: 'Muitas tentativas. Aguarde alguns minutos.' });
    }

    const registro = await buscarResetValido(String(req.body?.token || ''));
    if (!registro || !registro.user) {
      return res.status(400).json({
        valido: false,
        message: 'Este link de redefinição é inválido, já foi usado ou expirou. Solicite um novo.'
      });
    }

    const user = await User.findById(registro.user).select('email nomeCompleto ativo');
    if (!user || !user.ativo) {
      return res.status(400).json({ valido: false, message: 'Este link de redefinição não é mais válido.' });
    }

    return res.json({
      valido: true,
      emailMascarado: mascararEmail(user.email),
      expiraEm: registro.expiraEm,
      politicaSenha: SENHA_POLITICA_TEXTO
    });
  } catch (error) {
    console.error('Erro ao validar token de redefinição:', error);
    return res.status(400).json({ valido: false, message: 'Não foi possível validar este link.' });
  }
};

// @desc    Concluir a redefinição de senha usando o link do e-mail
// @route   POST /api/auth/reset-password/confirm
// @access  Public (rate limited)
export const confirmPasswordReset = async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  try {
    const token = String(req.body?.token || '');
    const novaSenha = req.body?.novaSenha;

    // Limite por IP: mesmo com token de 256 bits, não deixamos ninguém tentar
    // indefinidamente.
    const limite = await consumirLimite(`pwd-reset-confirm:ip:${ip}`, 20, 60 * 60);
    if (!limite.permitido) {
      return res.status(429).json({
        message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        retryAfter: limite.retryAfter
      });
    }

    const registro = await buscarResetValido(token);
    if (!registro || !registro.user) {
      return res.status(400).json({
        message: 'Este link de redefinição é inválido, já foi usado ou expirou. Solicite um novo.'
      });
    }

    const user = await User.findById(registro.user);
    if (!user || !user.ativo) {
      return res.status(400).json({ message: 'Este link de redefinição não é mais válido.' });
    }

    // Política de senha forte — este é o momento de exigir mais.
    const erroSenha = validarForcaSenha(novaSenha, user.email);
    if (erroSenha) {
      return res.status(400).json({ message: erroSenha });
    }

    // A senha nova não pode ser igual à atual (senão o "vazamento" que motivou
    // a troca continua valendo).
    const igualAAtual = await user.comparePassword(novaSenha);
    if (igualAAtual) {
      return res.status(400).json({ message: 'A nova senha deve ser diferente da senha atual.' });
    }

    // Consumo ATÔMICO do token: só uma requisição consegue marcá-lo como usado,
    // mesmo se o link for aberto em dois lugares ao mesmo tempo.
    const consumido = await PasswordReset.findOneAndUpdate(
      { _id: registro._id, usadoEm: { $exists: false }, invalidadoEm: { $exists: false } },
      { $set: { usadoEm: new Date(), ipUso: ip } },
      { new: true }
    );
    if (!consumido) {
      return res.status(400).json({ message: 'Este link já foi utilizado. Solicite um novo.' });
    }

    // O hook `pre('save')` do User faz o hash e atualiza `senhaAlteradaEm` —
    // é isso que derruba todas as sessões abertas com a senha anterior.
    user.password = novaSenha;
    await user.save();

    // Qualquer outro link pendente perde a validade.
    await PasswordReset.updateMany(
      { user: user._id, usadoEm: { $exists: false }, invalidadoEm: { $exists: false } },
      { $set: { invalidadoEm: new Date() } }
    );

    // Libera o bloqueio de login por tentativas: a senha mudou legitimamente.
    await limparLimite(`login:email:${hashSha256(user.email)}`);

    // Aviso de segurança (best-effort — não pode falhar a troca).
    sendPasswordChangedEmail({ to: user.email, nome: user.nomeCompleto, ip })
      .catch((err) => console.error('Falha ao enviar aviso de troca de senha:', err));

    // Sem login automático: quem redefine entra com a senha nova. Isso garante
    // que um link interceptado não vire sessão ativa sem o novo segredo.
    return res.json({
      message: 'Senha redefinida com sucesso! Entre com a sua nova senha.',
      email: user.email
    });
  } catch (error) {
    console.error('Erro ao redefinir senha por e-mail:', error);
    return res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
};

// @desc    Informa ao front-end se a recuperação por e-mail está disponível
// @route   GET /api/auth/recovery-options
// @access  Public
export const getRecoveryOptions = (_req: Request, res: Response) => {
  res.json({
    // Sem SMTP configurado o front esconde a opção "receber link por e-mail" e
    // deixa apenas a recuperação pelo token gerado no cadastro.
    emailDisponivel: isEmailConfigured(),
    validadeMinutos: RESET_VALIDADE_MINUTOS,
    politicaSenha: SENHA_POLITICA_TEXTO
  });
};
