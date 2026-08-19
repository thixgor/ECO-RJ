import crypto from 'crypto';

/**
 * Segredo usado para assinar/verificar os JWTs.
 *
 * Antes cada arquivo usava `process.env.JWT_SECRET || 'secret'`. Se a variável
 * não estivesse definida em produção, todos os tokens passavam a ser assinados
 * com a string pública "secret" — qualquer pessoa poderia forjar um token de
 * Administrador. O fallback abaixo continua permitindo que a aplicação suba
 * (não derruba o site em produção), mas usa um valor derivado e não adivinhável.
 */
const DEV_SECRET = 'eco-rj-dev-secret-nao-usar-em-producao';

const resolveSecret = (): string => {
  const configurado = (process.env.JWT_SECRET || '').trim();

  if (configurado && configurado !== 'secret' && configurado.length >= 16) {
    return configurado;
  }

  if (process.env.NODE_ENV !== 'production') {
    return configurado || DEV_SECRET;
  }

  // Produção sem JWT_SECRET válido: deriva um segredo estável (sobrevive a cold
  // starts e é igual em todas as instâncias) a partir de outra variável secreta,
  // em vez de cair em uma string pública.
  const materia = process.env.MONGODB_URI || process.env.ADMIN_PASSWORD;

  if (materia) {
    console.error(
      '🔴 JWT_SECRET não está definido (ou é fraco demais). Usando um segredo derivado. ' +
      'Defina JWT_SECRET nas variáveis de ambiente — ao definir, todos os usuários precisarão entrar novamente.'
    );
    return crypto.createHash('sha256').update(`eco-rj:jwt:${materia}`).digest('hex');
  }

  // Sem nenhuma variável secreta disponível não há como derivar nada seguro.
  throw new Error('JWT_SECRET não configurado. Defina JWT_SECRET nas variáveis de ambiente.');
};

let cache: string | null = null;

export const getJwtSecret = (): string => {
  if (cache === null) cache = resolveSecret();
  return cache;
};
