// Validação de CPF
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// Formata CPF para exibição
export function formatCPF(cpf: string): string {
  cpf = cpf.replace(/[^\d]/g, '');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Validação de CRM (apenas número, UF é validado separadamente)
export function validateCRM(crm: string): boolean {
  // Remove caracteres não numéricos
  crm = crm.replace(/[^\d]/g, '');

  // CRM deve ter entre 4 e 7 dígitos
  return crm.length >= 4 && crm.length <= 7;
}

// Lista de UFs válidas
export const validUFs = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Valida UF
export function validateUF(uf: string): boolean {
  return validUFs.includes(uf.toUpperCase());
}

// Validação de email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitiza string para prevenir XSS
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Política de força de senha usada nos fluxos sensíveis (recuperação por
 * e-mail e troca de senha autenticada).
 *
 * Regra: mínimo de 8 caracteres, com pelo menos uma letra e um número, e sem
 * conter o e-mail/nome de usuário. Senhas óbvias ("12345678", "senha123") são
 * bloqueadas por lista curta — não substitui um dicionário completo, mas corta
 * os casos mais explorados em ataques de credential stuffing.
 *
 * O cadastro continua aceitando 6 caracteres (regra histórica do schema) para
 * não invalidar contas existentes; quem redefine a senha passa a usar a regra
 * forte.
 */
export const SENHA_POLITICA_TEXTO =
  'A senha deve ter no mínimo 8 caracteres, incluindo pelo menos uma letra e um número.';

const SENHAS_PROIBIDAS = [
  '12345678', '123456789', '1234567890', 'senha123', 'password', 'password1',
  'password123', 'qwerty123', 'admin123', 'abc12345', '11111111', 'ecorj123'
];

export function validarForcaSenha(senha: unknown, email?: string): string | null {
  if (typeof senha !== 'string') return SENHA_POLITICA_TEXTO;
  if (senha.length < 8) return SENHA_POLITICA_TEXTO;
  if (senha.length > 128) return 'A senha deve ter no máximo 128 caracteres.';
  if (!/[A-Za-zÀ-ÿ]/.test(senha)) return SENHA_POLITICA_TEXTO;
  if (!/\d/.test(senha)) return SENHA_POLITICA_TEXTO;

  const normalizada = senha.toLowerCase();
  if (SENHAS_PROIBIDAS.includes(normalizada)) {
    return 'Esta senha é muito comum. Escolha uma senha diferente.';
  }
  if (email) {
    const usuarioDoEmail = String(email).toLowerCase().split('@')[0];
    if (usuarioDoEmail.length >= 3 && normalizada.includes(usuarioDoEmail)) {
      return 'A senha não pode conter o seu e-mail.';
    }
  }
  return null;
}
