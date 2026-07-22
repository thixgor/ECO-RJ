/**
 * Fonte única de verdade dos CARGOS (roles) no frontend.
 *
 * São 4 cargos, em ordem crescente de acesso:
 *   Visitante → Aluno → Instrutor → Administrador
 *
 * "Aluno" é o cargo do estudante. Um Visitante vira Aluno de duas formas
 * equivalentes (ambas passam por uma serial key):
 *   1. Comprando um curso  → o checkout gera a chave e a aplica automaticamente
 *                            (se o comprador estiver logado).
 *   2. Ativando uma chave   → o usuário aplica em /ativar ou no perfil a chave
 *                            recebida por e-mail (ou entregue pelo admin).
 */

export type Cargo = 'Visitante' | 'Aluno' | 'Instrutor' | 'Administrador';

export const CARGOS: Cargo[] = ['Visitante', 'Aluno', 'Instrutor', 'Administrador'];

/** Hierarquia: quanto maior, mais acesso. */
export const CARGO_RANK: Record<Cargo, number> = {
  Visitante: 0,
  Aluno: 1,
  Instrutor: 2,
  Administrador: 3
};

/** Cargos que têm acesso ao conteúdo (aulas, exercícios, fórum, app). */
export const CARGOS_COM_ACESSO: Cargo[] = ['Aluno', 'Instrutor', 'Administrador'];

export interface RoleInfo {
  /** Nome exibido do cargo. */
  label: Cargo;
  /** Resumo curto (uma linha). */
  resumo: string;
  /** Descrição completa. */
  descricao: string;
  /** O que este cargo PODE fazer. */
  podeFazer: string[];
  /** Classe de badge (light + dark) reutilizável em toda a interface. */
  badgeClass: string;
}

export const ROLE_INFO: Record<Cargo, RoleInfo> = {
  Visitante: {
    label: 'Visitante',
    resumo: 'Acesso público, sem aulas.',
    descricao:
      'Cargo padrão de quem acaba de se cadastrar. Navega pelo catálogo de cursos e pelas páginas informativas, mas ainda não tem acesso às aulas, exercícios ou fórum.',
    podeFazer: ['Ver o catálogo de cursos', 'Ler páginas públicas', 'Comprar um curso ou ativar uma chave'],
    badgeClass: 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
  },
  Aluno: {
    label: 'Aluno',
    resumo: 'Estudante com acesso completo.',
    descricao:
      'Cargo do estudante. Obtido ao comprar um curso ou ativar uma chave de acesso. Libera todo o conteúdo de aprendizado da plataforma.',
    podeFazer: [
      'Assistir às aulas dos cursos que possui',
      'Responder exercícios e provas',
      'Participar do fórum',
      'Baixar o aplicativo',
      'Solicitar certificados'
    ],
    badgeClass: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
  },
  Instrutor: {
    label: 'Instrutor',
    resumo: 'Cria conteúdo além do acesso de Aluno.',
    descricao:
      'Tem tudo o que um Aluno tem e, além disso, pode criar e editar aulas e responder no fórum como instrutor. Atribuído pelo administrador.',
    podeFazer: ['Tudo o que um Aluno faz', 'Criar e editar aulas', 'Responder no fórum como instrutor'],
    badgeClass: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
  },
  Administrador: {
    label: 'Administrador',
    resumo: 'Acesso total ao sistema.',
    descricao: 'Acesso total, incluindo o painel administrativo, gestão de usuários, cursos e chaves.',
    podeFazer: ['Acesso total ao sistema', 'Painel administrativo', 'Gerenciar usuários, cursos e chaves'],
    badgeClass: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
  }
};

/** Retorna as informações de um cargo, com fallback seguro para Visitante. */
export function getRoleInfo(cargo?: string): RoleInfo {
  return ROLE_INFO[(cargo as Cargo)] ?? ROLE_INFO.Visitante;
}

/** Indica se o cargo tem acesso de estudante (Aluno ou superior). */
export function hasAlunoAccess(cargo?: string): boolean {
  return CARGOS_COM_ACESSO.includes(cargo as Cargo);
}
