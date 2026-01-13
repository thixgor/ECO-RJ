import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Só redireciona para login se tinha token (estava logado e expirou)
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: {
    email: string;
    password: string;
    nomeCompleto: string;
    cpf: string;
    crm: string;
    crmLocal: string;
    dataNascimento: string;
    especialidade?: string;
  }) => api.post('/auth/register', data),

  getMe: () => api.get('/auth/me'),

  updateProfile: (data: {
    nomeCompleto?: string;
    especialidade?: string;
    bio?: string;
    fotoPerfil?: string;
  }) => api.put('/auth/profile', data),

  changePassword: (senhaAtual: string, novaSenha: string) =>
    api.put('/auth/password', { senhaAtual, novaSenha }),

  resetPassword: (email: string, tokenRecuperacao: string, novaSenha: string) =>
    api.post('/auth/reset-password', { email, tokenRecuperacao, novaSenha })
};

// Users
export const userService = {
  getAll: (params?: { cargo?: string; ativo?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/users', { params }),

  getById: (id: string) => api.get(`/users/${id}`),

  updateCargo: (id: string, cargo: string) =>
    api.put(`/users/${id}/cargo`, { cargo }),

  toggleStatus: (id: string) => api.put(`/users/${id}/status`),

  delete: (id: string) => api.delete(`/users/${id}`),

  applySerialKey: (chave: string) =>
    api.post('/users/apply-key', { chave }),

  getStats: () => api.get('/users/stats')
};

// Courses
export const courseService = {
  getAll: (params?: { ativo?: string; page?: number; limit?: number }) =>
    api.get('/courses', { params }),

  getById: (id: string) => api.get(`/courses/${id}`),

  create: (data: {
    titulo: string;
    descricao: string;
    dataInicio: string;
    imagemCapa?: string;
  }) => api.post('/courses', data),

  update: (id: string, data: {
    titulo?: string;
    descricao?: string;
    dataInicio?: string;
    imagemCapa?: string;
    ativo?: boolean;
  }) => api.put(`/courses/${id}`, data),

  delete: (id: string) => api.delete(`/courses/${id}`),

  enroll: (id: string) => api.post(`/courses/${id}/enroll`),

  unenroll: (id: string) => api.delete(`/courses/${id}/enroll`),

  getProgress: (id: string) => api.get(`/courses/${id}/progress`),

  reorder: (orders: { id: string; ordem: number }[]) =>
    api.put('/courses/reorder', { orders })
};

// Course Topics
export const courseTopicService = {
  getByCourse: (courseId: string) =>
    api.get(`/course-topics/course/${courseId}`),

  getByCourseAdmin: (courseId: string) =>
    api.get(`/course-topics/course/${courseId}/admin`),

  getById: (id: string) => api.get(`/course-topics/${id}`),

  create: (data: {
    titulo: string;
    descricao?: string;
    cursoId: string;
  }) => api.post('/course-topics', data),

  update: (id: string, data: {
    titulo?: string;
    descricao?: string;
    ativo?: boolean;
  }) => api.put(`/course-topics/${id}`, data),

  delete: (id: string) => api.delete(`/course-topics/${id}`),

  reorder: (orders: { id: string; ordem: number }[]) =>
    api.put('/course-topics/reorder', { items: orders })
};

// Course Subtopics
export const courseSubtopicService = {
  getByTopic: (topicId: string) =>
    api.get(`/course-subtopics/topic/${topicId}`),

  getByCourse: (courseId: string) =>
    api.get(`/course-subtopics/course/${courseId}`),

  getByTopicAdmin: (topicId: string) =>
    api.get(`/course-subtopics/topic/${topicId}/admin`),

  getByCourseAdmin: (courseId: string) =>
    api.get(`/course-subtopics/course/${courseId}/admin`),

  getById: (id: string) => api.get(`/course-subtopics/${id}`),

  create: (data: {
    titulo: string;
    descricao?: string;
    cursoId: string;
    topicoId: string;
  }) => api.post('/course-subtopics', data),

  update: (id: string, data: {
    titulo?: string;
    descricao?: string;
    ativo?: boolean;
  }) => api.put(`/course-subtopics/${id}`, data),

  delete: (id: string) => api.delete(`/course-subtopics/${id}`),

  reorder: (orders: { id: string; ordem: number }[]) =>
    api.put('/course-subtopics/reorder', { items: orders })
};

// Lessons
export const lessonService = {
  getByCourse: (courseId: string) =>
    api.get(`/lessons/course/${courseId}`),

  getById: (id: string) => api.get(`/lessons/${id}`),

  getLiveToday: () => api.get('/lessons/live-today'),

  getUpcomingLive: () => api.get('/lessons/upcoming-live'),

  getLastWatched: () => api.get('/lessons/last-watched'),

  getAll: (params?: { cursoId?: string; tipo?: string; status?: string; topicoId?: string; subtopicoId?: string; page?: number; limit?: number }) =>
    api.get('/lessons', { params }),

  create: (data: {
    titulo: string;
    descricao: string;
    tipo: string;
    embedVideo?: string;
    dataHoraInicio?: string;
    duracao?: number;
    cargosPermitidos: string[];
    cursoId: string;
    topicoId?: string;
    subtopicoId?: string;
    notasAula?: string;
    zoomMeetingId?: string;
    zoomMeetingPassword?: string;
  }) => api.post('/lessons', data),

  update: (id: string, data: {
    titulo?: string;
    descricao?: string;
    tipo?: string;
    embedVideo?: string;
    dataHoraInicio?: string;
    duracao?: number;
    cargosPermitidos?: string[];
    topicoId?: string | null;
    subtopicoId?: string | null;
    notasAula?: string;
    status?: string;
    ordem?: number;
    zoomMeetingId?: string;
    zoomMeetingPassword?: string;
  }) => api.put(`/lessons/${id}`, data),

  delete: (id: string) => api.delete(`/lessons/${id}`),

  markAsWatched: (id: string) => api.post(`/lessons/${id}/watched`),

  updateProgress: (id: string, progresso?: number) =>
    api.post(`/lessons/${id}/update-progress`, { progresso }),

  reorder: (orders: { id: string; ordem: number; topicoId?: string | null; subtopicoId?: string | null }[]) =>
    api.put('/lessons/reorder', { orders })
};

// Exercises
export const exerciseService = {
  getByLesson: (lessonId: string) =>
    api.get(`/exercises/lesson/${lessonId}`),

  getById: (id: string) => api.get(`/exercises/${id}`),

  getAll: (params?: { aulaId?: string; tipo?: string; page?: number; limit?: number }) =>
    api.get('/exercises', { params }),

  create: (data: {
    titulo: string;
    aulaId?: string; // Agora opcional - pode criar exercício sem aula
    tipo: string;
    questoes: any[];
    cargosPermitidos: string[];
    tentativasPermitidas: number;
  }) => api.post('/exercises', data),

  update: (id: string, data: {
    titulo?: string;
    aulaId?: string; // Permite anexar/desanexar aula
    tipo?: string;
    questoes?: any[];
    cargosPermitidos?: string[];
    tentativasPermitidas?: number;
  }) => api.put(`/exercises/${id}`, data),

  delete: (id: string) => api.delete(`/exercises/${id}`),

  answer: (id: string, respostas: any[]) =>
    api.post(`/exercises/${id}/answer`, { respostas }),

  getMyAnswers: (id: string) => api.get(`/exercises/${id}/my-answers`),

  getAnswers: (id: string) => api.get(`/exercises/${id}/answers`)
};

// Serial Keys
export const serialKeyService = {
  getAll: (params?: { status?: string; cargoAtribuido?: string; page?: number; limit?: number }) =>
    api.get('/serial-keys', { params }),

  getById: (id: string) => api.get(`/serial-keys/${id}`),

  generate: (data: {
    quantidade: number;
    cargoAtribuido: string;
    validadeDias: number;
    descricao?: string;
  }) => api.post('/serial-keys/generate', data),

  delete: (id: string) => api.delete(`/serial-keys/${id}`),

  deleteAll: () => api.delete('/serial-keys/all'),

  renew: (id: string, validadeDias: number) =>
    api.put(`/serial-keys/${id}/renew`, { validadeDias }),

  export: (params?: { status?: string; cargoAtribuido?: string }) =>
    api.get('/serial-keys/export', { params, responseType: 'blob' }),

  getStats: () => api.get('/serial-keys/stats')
};

// Forum
export const forumService = {
  getTopics: (params?: { cursoId?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/forum', { params }),

  getTopicById: (id: string) => api.get(`/forum/${id}`),

  getMyTopics: () => api.get('/forum/my-topics'),

  getStatus: () => api.get('/forum/settings/status'),

  toggleLock: () => api.put('/forum/settings/lock'),

  createTopic: (data: { titulo: string; conteudo: string; cursoId?: string; imagem?: string; embedVideo?: string }) =>
    api.post('/forum', data),

  replyTopic: (id: string, data: { conteudo: string; imagem?: string; embedVideo?: string }) =>
    api.post(`/forum/${id}/reply`, data),

  updateTopic: (id: string, data: { titulo?: string; conteudo?: string; imagem?: string; embedVideo?: string }) =>
    api.put(`/forum/${id}`, data),

  deleteTopic: (id: string) => api.delete(`/forum/${id}`),

  deleteReply: (topicId: string, replyId: string) => api.delete(`/forum/${topicId}/reply/${replyId}`),

  togglePin: (id: string) => api.put(`/forum/${id}/pin`),

  toggleClose: (id: string) => api.put(`/forum/${id}/close`)
};

// Stats
export const statsService = {
  getGeneral: () => api.get('/stats'),
  getTopLessons: () => api.get('/stats/top-lessons'),
  getTopCourses: () => api.get('/stats/top-courses'),
  getRecentActivity: () => api.get('/stats/recent-activity')
};

// Site Config
export const siteConfigService = {
  get: () => api.get('/site-config'),

  update: (data: any) => api.put('/site-config', data),

  updateFeaturedCourse: (data: { enabled?: boolean; courseId?: string; customDescription?: string }) =>
    api.put('/site-config/featured-course', data),

  updateTestimonials: (data: { enabled?: boolean; items?: any[] }) =>
    api.put('/site-config/testimonials', data),

  addTestimonial: (data: { nome: string; citacao: string; imagem?: string; cargo?: string }) =>
    api.post('/site-config/testimonials', data),

  removeTestimonial: (id: string) => api.delete(`/site-config/testimonials/${id}`),

  updateDemoVideo: (data: { enabled?: boolean; embedCode?: string; title?: string }) =>
    api.put('/site-config/demo-video', data),

  updateWatermark: (data: { enabled?: boolean; opacity?: number; showForAdmins?: boolean }) =>
    api.put('/site-config/watermark', data),

  updateZoomNative: (data: { enabled?: boolean }) =>
    api.put('/site-config/zoom-native', data)
};

// Zoom
export const zoomService = {
  generateSignature: (meetingNumber: string, role?: number) =>
    api.post('/zoom/signature', { meetingNumber, role })
};

// Announcements (Avisos)
export const announcementService = {
  // Admin routes
  getAll: (params?: { tipo?: string; ativo?: string; page?: number; limit?: number }) =>
    api.get('/announcements', { params }),

  getById: (id: string) => api.get(`/announcements/${id}`),

  create: (data: {
    titulo: string;
    conteudo: string;
    tipo: 'geral' | 'alunos' | 'curso_especifico';
    cursosAlvo?: string[];
    prioridade?: 'baixa' | 'normal' | 'alta';
    dataExpiracao?: string;
  }) => api.post('/announcements', data),

  update: (id: string, data: {
    titulo?: string;
    conteudo?: string;
    tipo?: 'geral' | 'alunos' | 'curso_especifico';
    cursosAlvo?: string[];
    prioridade?: 'baixa' | 'normal' | 'alta';
    dataExpiracao?: string;
    ativo?: boolean;
  }) => api.put(`/announcements/${id}`, data),

  toggle: (id: string) => api.put(`/announcements/${id}/toggle`),

  delete: (id: string) => api.delete(`/announcements/${id}`),

  deleteAll: () => api.delete('/announcements/all'),

  // User route
  getUserAnnouncements: () => api.get('/announcements/user')
};

// Certificates (Certificados)
export const certificateService = {
  // Admin routes
  getAll: (params?: { alunoId?: string; cursoId?: string; page?: number; limit?: number }) =>
    api.get('/certificates', { params }),

  getById: (id: string) => api.get(`/certificates/${id}`),

  getStats: () => api.get('/certificates/stats'),

  getCourseHours: (courseId: string) => api.get(`/certificates/course-hours/${courseId}`),

  generate: (data: { alunoId: string; cursoId: string }) =>
    api.post('/certificates/generate', data),

  delete: (id: string) => api.delete(`/certificates/${id}`),

  deleteByUser: (userId: string) => api.delete(`/certificates/user/${userId}`),

  // User routes
  getMy: () => api.get('/certificates/my'),

  // Public route
  validate: (code: string) => api.get(`/certificates/validate/${code}`)
};

// Notes (Anotações do usuário)
export const notesService = {
  create: (data: { lessonId: string; conteudo: string; timestamp: number }) =>
    api.post('/notes', data),

  getByLesson: (lessonId: string) => api.get(`/notes/lesson/${lessonId}`),

  getMy: (params?: { cursoId?: string; lessonId?: string; page?: number; limit?: number }) =>
    api.get('/notes/my', { params }),

  update: (id: string, conteudo: string) =>
    api.put(`/notes/${id}`, { conteudo }),

  delete: (id: string) => api.delete(`/notes/${id}`)
};
