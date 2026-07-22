/**
 * Fonte única de verdade dos CARGOS (roles) do sistema.
 *
 * O sistema tem 4 cargos, em ordem crescente de acesso:
 *   Visitante  → Aluno → Instrutor → Administrador
 *
 * "Aluno" é o cargo do estudante que paga/ativa um curso. Um Visitante vira
 * Aluno de duas formas equivalentes (ambas passam por uma serial key):
 *   1. Comprando um curso   → o checkout gera uma serial key de Aluno e, se o
 *      comprador estiver logado, ela é aplicada automaticamente.
 *   2. Ativando uma chave    → o usuário aplica manualmente em /ativar ou no
 *      perfil uma serial key recebida (por e-mail após a compra ou do admin).
 */

export type Cargo = 'Visitante' | 'Aluno' | 'Instrutor' | 'Administrador';

export const CARGOS: Cargo[] = ['Visitante', 'Aluno', 'Instrutor', 'Administrador'];

/**
 * Hierarquia dos cargos. Quanto maior o número, mais acesso.
 * Usada para NUNCA rebaixar um usuário ao aplicar uma serial key
 * (uma chave de "Aluno" não pode rebaixar um Instrutor ou Administrador).
 */
export const CARGO_RANK: Record<Cargo, number> = {
  Visitante: 0,
  Aluno: 1,
  Instrutor: 2,
  Administrador: 3
};

/** Descrição objetiva de cada cargo, reaproveitada no seed e nas respostas da API. */
export const CARGO_DESCRICAO: Record<Cargo, string> = {
  Visitante:
    'Acesso público. Navega pelo catálogo de cursos e páginas informativas, mas não assiste às aulas, não faz exercícios e não usa o fórum.',
  Aluno:
    'Cargo do estudante. Assiste às aulas dos cursos que possui, responde exercícios e provas, participa do fórum, baixa o aplicativo e solicita certificados.',
  Instrutor:
    'Tem o acesso de Aluno e, além disso, pode criar e editar aulas e responder no fórum como instrutor. Requer aprovação do administrador.',
  Administrador: 'Acesso total ao sistema, incluindo o painel administrativo.'
};

/** Cargos que têm acesso ao conteúdo de aulas/exercícios/fórum. */
export const CARGOS_COM_ACESSO: Cargo[] = ['Aluno', 'Instrutor', 'Administrador'];

/** Verifica se um cargo é válido. */
export function isCargoValido(cargo: string): cargo is Cargo {
  return (CARGOS as string[]).includes(cargo);
}

/**
 * Retorna o cargo de MAIOR hierarquia entre o atual e o novo.
 * Serve para promover sem rebaixar ao aplicar uma serial key.
 */
export function maiorCargo(atual: Cargo, novo: Cargo): Cargo {
  return (CARGO_RANK[novo] ?? 0) > (CARGO_RANK[atual] ?? 0) ? novo : atual;
}
