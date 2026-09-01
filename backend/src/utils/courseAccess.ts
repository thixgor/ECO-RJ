/**
 * Fonte única de verdade do ACESSO AO CONTEÚDO DE UM CURSO.
 *
 * O problema que este módulo resolve: o cargo global (Visitante/Aluno/...) não é
 * suficiente para decidir se alguém pode ver uma aula. Um usuário pode ter sido
 * matriculado no curso pelo admin (ou autorizado em um curso restrito) e ainda
 * assim continuar com o cargo "Visitante" — e antes disso o conteúdo aparecia
 * bloqueado mesmo com o acesso concedido.
 *
 * A regra passa a ser:
 *
 *   Quem tem VÍNCULO com o curso vale como "Aluno" DAQUELE curso,
 *   independentemente do cargo global.
 *
 * Vínculo = estar na lista de autorizados do curso (`curso.alunosAutorizados`),
 * que é o que o admin e o fluxo de compra controlam. Estar apenas inscrito
 * (`user.cursosInscritos`) NÃO conta: a auto-inscrição em curso não restrito é
 * aberta a qualquer usuário logado.
 *
 * O cargo global continua valendo para o que é global: Instrutor e Administrador
 * enxergam tudo, e um "Aluno" continua acessando qualquer curso não restrito.
 */

import { Cargo, CARGOS_COM_ACESSO, maiorCargo } from '../config/roles';
import { isCourseExpired } from '../models/Course';

type IdLike = { toString(): string } | string | null | undefined;

/** Formato mínimo de usuário que as checagens precisam. */
export interface UsuarioAcesso {
  _id?: IdLike;
  cargo?: string;
  cursosInscritos?: any[];
}

/** Formato mínimo de curso que as checagens precisam. */
export interface CursoAcesso {
  _id?: IdLike;
  acessoRestrito?: boolean;
  alunosAutorizados?: any[];
  dataTermino?: Date | string | null;
}

export type MotivoBloqueio = 'nao_autenticado' | 'curso_encerrado' | 'sem_acesso';

export interface ResultadoAcesso {
  permitido: boolean;
  motivo?: MotivoBloqueio;
  mensagem?: string;
}

/** Compara dois ids que podem vir como ObjectId, string ou documento populado. */
function mesmoId(a: any, b: any): boolean {
  const idDe = (valor: any): string | null => {
    if (!valor) return null;
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'object' && valor._id) return valor._id.toString();
    return valor.toString();
  };
  const idA = idDe(a);
  const idB = idDe(b);
  return !!idA && !!idB && idA === idB;
}

/** O usuário está na lista de autorizados do curso? */
export function isAutorizadoNoCurso(curso: CursoAcesso | null | undefined, user?: UsuarioAcesso | null): boolean {
  if (!curso || !user?._id) return false;
  return (curso.alunosAutorizados || []).some((alunoId) => mesmoId(alunoId, user._id));
}

/** O usuário está inscrito (matriculado) neste curso? */
export function isInscritoNoCurso(curso: CursoAcesso | null | undefined, user?: UsuarioAcesso | null): boolean {
  if (!curso?._id || !user) return false;
  return (user.cursosInscritos || []).some((cursoId) => mesmoId(cursoId, curso._id));
}

/**
 * O usuário tem vínculo com este curso (é aluno DESTE curso)?
 *
 * Vale a LISTA DE AUTORIZADOS do curso — e só ela. Estar apenas inscrito não
 * libera conteúdo: em curso não restrito qualquer usuário logado pode se
 * inscrever sozinho (`POST /courses/:id/enroll`), então tratar inscrição como
 * acesso daria o curso de graça. A lista de autorizados é o que o admin e o
 * fluxo de compra controlam, e removê-la revoga o acesso na hora.
 *
 * Os fluxos legítimos alimentam essa lista (ou o cargo "Aluno"):
 *   - admin adiciona o aluno ao curso → autoriza e matricula;
 *   - compra/serial key → promove a "Aluno" e autoriza em curso restrito.
 */
export function temVinculoComCurso(curso: CursoAcesso | null | undefined, user?: UsuarioAcesso | null): boolean {
  return isAutorizadoNoCurso(curso, user);
}

/**
 * Vínculo "de vitrine": o curso aparece para o usuário como dele (em
 * "Meus Cursos"). Serve para a interface, NUNCA para liberar conteúdo.
 */
export function isCursoDoUsuario(curso: CursoAcesso | null | undefined, user?: UsuarioAcesso | null): boolean {
  return isAutorizadoNoCurso(curso, user) || isInscritoNoCurso(curso, user);
}

/**
 * Cargo do usuário DENTRO deste curso. Quem tem vínculo vale como Aluno
 * (sem nunca rebaixar Instrutor/Administrador).
 */
export function cargoEfetivoNoCurso(curso: CursoAcesso | null | undefined, user?: UsuarioAcesso | null): Cargo {
  const cargo = (user?.cargo as Cargo) || 'Visitante';
  return temVinculoComCurso(curso, user) ? maiorCargo(cargo, 'Aluno') : cargo;
}

/**
 * Avalia se o usuário pode acessar o conteúdo do curso (aulas, materiais,
 * exercícios e provas). É o que alimenta o `temAcessoConteudo` da API.
 */
export function avaliarAcessoAoCurso(
  curso: CursoAcesso | null | undefined,
  user?: UsuarioAcesso | null
): ResultadoAcesso {
  const cargo = (user?.cargo as Cargo) || 'Visitante';

  // Administrador e Instrutor gerenciam o conteúdo: acesso irrestrito.
  if (cargo === 'Administrador' || cargo === 'Instrutor') return { permitido: true };

  if (!user?._id) {
    return {
      permitido: false,
      motivo: 'nao_autenticado',
      mensagem: 'Entre na sua conta para acessar o conteúdo deste curso.'
    };
  }

  if (isCourseExpired(curso)) {
    return {
      permitido: false,
      motivo: 'curso_encerrado',
      mensagem: 'Este curso foi encerrado e o acesso ao conteúdo não está mais disponível.'
    };
  }

  if (curso?.acessoRestrito && !temVinculoComCurso(curso, user)) {
    return {
      permitido: false,
      motivo: 'sem_acesso',
      mensagem: 'Você não tem autorização para acessar o conteúdo deste curso.'
    };
  }

  if (CARGOS_COM_ACESSO.includes(cargoEfetivoNoCurso(curso, user))) {
    return { permitido: true };
  }

  return {
    permitido: false,
    motivo: 'sem_acesso',
    mensagem:
      'Você ainda não tem acesso a este conteúdo. Compre o curso ou ative sua chave de acesso no perfil.'
  };
}

/** Atalho booleano de `avaliarAcessoAoCurso`. */
export function temAcessoAoCurso(curso: CursoAcesso | null | undefined, user?: UsuarioAcesso | null): boolean {
  return avaliarAcessoAoCurso(curso, user).permitido;
}

/**
 * Checa o `cargosPermitidos` de uma aula/exercício/prova contra o cargo
 * efetivo no curso. Lista vazia = sem restrição extra por cargo.
 */
export function cargoPermitido(cargosPermitidos: string[] | undefined, cargoEfetivo: Cargo): boolean {
  if (cargoEfetivo === 'Administrador') return true;
  if (!cargosPermitidos || cargosPermitidos.length === 0) return true;
  return cargosPermitidos.includes(cargoEfetivo);
}

/**
 * Decide o acesso a um ITEM de um curso (aula, material, exercício, prova),
 * combinando o acesso ao curso com o `cargosPermitidos` do próprio item.
 *
 * Regra: o `cargosPermitidos` só restringe — exceto quando o item foi
 * explicitamente aberto ao cargo do usuário (ex.: uma aula de amostra marcada
 * para "Visitante"), caso em que ele dispensa o vínculo, desde que o curso não
 * seja restrito nem esteja encerrado.
 */
export function avaliarAcessoAoItem(
  curso: CursoAcesso | null | undefined,
  user: UsuarioAcesso | null | undefined,
  cargosPermitidos?: string[]
): ResultadoAcesso {
  const cargo = (user?.cargo as Cargo) || 'Visitante';
  if (cargo === 'Administrador' || cargo === 'Instrutor') return { permitido: true };

  const cargoEfetivo = cargoEfetivoNoCurso(curso, user);

  if (!cargoPermitido(cargosPermitidos, cargoEfetivo)) {
    return {
      permitido: false,
      motivo: 'sem_acesso',
      mensagem: `Este conteúdo está disponível apenas para: ${(cargosPermitidos || []).join(', ')}.`
    };
  }

  const acessoCurso = avaliarAcessoAoCurso(curso, user);
  if (acessoCurso.permitido) return { permitido: true };

  // Item aberto ao cargo do usuário em curso aberto: liberação intencional.
  if (
    acessoCurso.motivo === 'sem_acesso' &&
    !curso?.acessoRestrito &&
    (cargosPermitidos || []).includes(cargoEfetivo)
  ) {
    return { permitido: true };
  }

  return acessoCurso;
}

/**
 * Cargos que devem entrar em uma consulta ao banco por `cargosPermitidos`.
 * Quem tem qualquer vínculo de curso precisa enxergar também o que é de "Aluno",
 * mesmo que o cargo global ainda seja "Visitante" — o filtro por curso, feito
 * depois, é quem decide item a item.
 */
export function cargosParaConsulta(user?: UsuarioAcesso | null): string[] {
  const cargo = (user?.cargo as Cargo) || 'Visitante';
  const cargos = new Set<string>([cargo]);
  // Pré-filtro apenas: quem tem curso vinculado precisa que o conteúdo de
  // "Aluno" entre na consulta. Quem realmente pode ver cada item é decidido
  // depois, curso a curso, por `avaliarAcessoAoItem`.
  if ((user?.cursosInscritos || []).length > 0) cargos.add('Aluno');
  return Array.from(cargos);
}
