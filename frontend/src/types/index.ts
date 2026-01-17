export interface UltimaAulaAssistida {
  lessonId: string;
  cursoId: string;
  assistidaEm: string;
  progresso?: number;
}

export interface User {
  _id: string;
  email: string;
  nomeCompleto: string;
  cpf: string;
  crm: string;
  crmLocal: string;
  dataNascimento: string;
  especialidade?: string;
  cargo: 'Visitante' | 'Aluno' | 'Instrutor' | 'Administrador';
  fotoPerfil?: string;
  bio?: string;
  cursosInscritos: string[] | Course[];
  aulasAssistidas: string[];
  exerciciosRespondidos: string[];
  serialKeysUsadas: string[] | SerialKey[];
  emailConfirmado: boolean;
  ultimoLogin?: string;
  ultimaAulaAssistida?: UltimaAulaAssistida;
  ipsAcesso: string[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  _id: string;
  titulo: string;
  descricao: string;
  instrutor: string | User;
  dataInicio: string;
  imagemCapa?: string;
  aulas: string[] | Lesson[];
  ativo: boolean;
  dataLimiteInscricao?: string;
  acessoRestrito: boolean;
  alunosAutorizados: string[] | User[];
  exibirDuracao?: boolean; // default: true - exibe tempo de conteúdo
  tipo: 'online' | 'presencial'; // Tipo do curso
  createdAt: string;
}

export interface CustomButton {
  nome: string;
  icone: string;
  url: string;
}

export interface Participant {
  nome: string;
  cargo?: string;
}

export interface Lesson {
  _id: string;
  titulo: string;
  descricao?: string; // Opcional
  tipo: 'ao_vivo' | 'gravada' | 'material';
  embedVideo?: string;
  dataHoraInicio?: string;
  duracao?: number;
  cargosPermitidos: string[];
  cursoId: string | Course;
  topicoId?: string | CourseTopic;
  subtopicoId?: string | CourseSubtopic;
  notasAula?: string;
  status: 'ativa' | 'inativa' | 'expirada';
  ordem: number;
  professor?: string;
  participantes: Participant[];
  botoesPersonalizados: CustomButton[];
  criadorId?: string;
  exerciciosAnexados: string[] | Exercise[];
  provasAnexadas: string[];
  // Integração Zoom
  zoomMeetingId?: string;
  zoomMeetingPassword?: string;
  createdAt: string;
}

export interface CourseTopic {
  _id: string;
  titulo: string;
  descricao?: string;
  cursoId: string | Course;
  ordem: number;
  ativo: boolean;
  totalAulas?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSubtopic {
  _id: string;
  titulo: string;
  descricao?: string;
  cursoId: string | Course;
  topicoId: string | CourseTopic;
  ordem: number;
  ativo: boolean;
  totalAulas?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  pergunta: string;
  imagem?: string; // URL da imagem (opcional)
  opcoes?: string[];
  respostaCorreta?: string | number;
  pontos: number;
  respostaComentada?: string;
  fonteBibliografica?: string;
}

export interface Exercise {
  _id: string;
  titulo: string;
  aulaId?: string | Lesson; // Opcional - exercício pode existir sem aula vinculada
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'dissertativo';
  questoes: Question[];
  cargosPermitidos: string[];
  tentativasPermitidas: number;
  createdAt: string;
}

export interface ExerciseAnswer {
  _id: string;
  exercicioId: string;
  usuarioId: string | User;
  respostas: any[];
  nota: number;
  tentativa: number;
  createdAt: string;
}

export interface SerialKey {
  _id: string;
  chave: string;
  cargoAtribuido: string;
  validade: string;
  descricao: string;
  usadaPor?: string | User;
  dataUso?: string;
  status: 'pendente' | 'usada' | 'expirada';
  cursoRestrito?: string | Course; // Curso restrito que a chave dará acesso
  createdAt: string;
}

export interface ForumReply {
  _id: string;
  autor: string | User;
  conteudo: string;
  imagem?: string;
  embedVideo?: string;
  createdAt: string;
}

export interface ForumTopic {
  _id: string;
  titulo: string;
  conteudo: string;
  autor: string | User;
  cursoId?: string | Course;
  imagem?: string;
  embedVideo?: string;
  respostas: ForumReply[];
  fixado: boolean;
  fechado: boolean;
  totalRespostas?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  _id: string;
  nomeCompleto: string;
  email: string;
  cargo: string;
  fotoPerfil?: string;
  token: string;
}

export interface PaginatedResponse<T> {
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
  [key: string]: T[] | any;
}

export interface Stats {
  usuarios: {
    total: number;
    ativos: number;
    distribuicao: Record<string, number>;
  };
  conteudo: {
    cursos: number;
    aulas: number;
    exercicios: number;
    exerciciosRespondidos: number;
  };
  forum: {
    topicos: number;
  };
  taxaConclusao: number;
  usuariosPorSemana: Array<{ _id: string; count: number }>;
}

// Configuração de reunião Zoom
export interface ZoomMeetingConfig {
  meetingNumber: string;
  password?: string;
  userName: string;
  userEmail: string;
  sdkKey: string;
  leaveUrl: string;
}

// Estado da sessão Zoom
export interface ZoomMeetingState {
  isJoined: boolean;
  isConnecting: boolean;
  error: string | null;
}

// Avisos/Anúncios
export interface Announcement {
  _id: string;
  titulo: string;
  conteudo: string;
  tipo: 'geral' | 'alunos' | 'curso_especifico';
  cursosAlvo: string[] | Course[];
  criadoPor: string | User;
  ativo: boolean;
  prioridade: 'baixa' | 'normal' | 'alta';
  dataExpiracao?: string;
  createdAt: string;
  updatedAt: string;
}

// Certificados
export interface Certificate {
  _id: string;
  codigoValidacao: string;
  alunoId: string | User;
  cursoId: string | Course;
  dataEmissao: string;
  cargaHoraria: number;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateValidationResult {
  valid: boolean;
  message?: string;
  data?: {
    nomeAluno: string;
    nomeCurso: string;
    cargaHoraria: number;
    dataEmissao: string;
  };
}

// Última aula assistida (para Dashboard)
export interface LastWatchedLesson {
  _id: string;
  titulo: string;
  tipo: 'ao_vivo' | 'gravada' | 'material';
  duracao?: number;
  cursoId: string;
  cursoTitulo?: string;
  cursoImagem?: string;
  progresso?: number;
  savedTimestamp?: number; // Video timestamp in seconds where user stopped
  assistidaEm: string;
}

// Notas do usuário em aulas
export interface UserNote {
  _id: string;
  userId: string;
  lessonId: string | Lesson;
  cursoId: string | Course;
  conteudo: string;
  timestamp: number; // segundos do vídeo
  createdAt: string;
  updatedAt: string;
}

// Notas agrupadas por aula (para perfil)
export interface GroupedNotesByLesson {
  lessonId: string;
  lessonTitulo: string;
  notes: NoteDisplay[];
}

// Tipo simplificado para nota exibida no perfil (sem userId, lessonId, cursoId)
export interface NoteDisplay {
  _id: string;
  conteudo: string;
  timestamp: number;
  createdAt: string;
  updatedAt: string;
}

// Notas agrupadas por curso (para perfil)
export interface GroupedNotesByCourse {
  cursoId: string;
  cursoTitulo: string;
  lessons: GroupedNotesByLesson[];
}
