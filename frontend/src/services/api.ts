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

// Rotas onde um 401 significa "credencial errada agora", e não "sessão expirou".
// Sem esta exceção, errar a senha enquanto havia um token antigo no navegador
// limpava a sessão e recarregava a página — o usuário nunca chegava a ver a
// mensagem "E-mail ou senha incorretos" e ainda era deslogado da conta atual.
const ROTAS_DE_CREDENCIAL = ['/auth/login', '/auth/register', '/auth/reset-password'];

const ehRotaDeCredencial = (url?: string) =>
  !!url && ROTAS_DE_CREDENCIAL.some((rota) => url.includes(rota));

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Só redireciona para login se a sessão salva expirou durante a navegação
    if (
      error.response?.status === 401 &&
      localStorage.getItem('token') &&
      !ehRotaDeCredencial(error.config?.url)
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
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
    estado: string;
    tipoUsuario: 'Médico' | 'Residente' | 'Acadêmico de Medicina';
    crm?: string;
    crmLocal?: string;
    especialidade?: string;
    areaResidencia?: string;
    hospital?: string;
    anoResidencia?: string;
    semestreResidencia?: string;
    instituicao?: string;
    periodo?: string;
    dataNascimento?: string;
  }) => api.post('/auth/register', data),

  getMe: () => api.get('/auth/me'),

  updateProfile: (data: {
    nomeCompleto?: string;
    especialidade?: string;
    bio?: string;
    fotoPerfil?: string;
    areaResidencia?: string;
    hospital?: string;
    anoResidencia?: string;
    semestreResidencia?: string;
    instituicao?: string;
    periodo?: string;
  }) => api.put('/auth/profile', data),

  changePassword: (senhaAtual: string, novaSenha: string) =>
    api.put('/auth/password', { senhaAtual, novaSenha }),

  resetPassword: (email: string, tokenRecuperacao: string, novaSenha: string) =>
    api.post('/auth/reset-password', { email, tokenRecuperacao, novaSenha })
};

// Users
export const userService = {
  getAll: (params?: { cargo?: string; tipoUsuario?: string; estado?: string; ativo?: string; search?: string; page?: number; limit?: number }) =>
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
  getAll: (params?: { ativo?: string; tipo?: string; page?: number; limit?: number }) =>
    api.get('/courses', { params }),

  getById: (id: string) => api.get(`/courses/${id}`),

  create: (data: {
    titulo: string;
    descricao: string;
    dataInicio: string;
    dataTermino?: string;
    imagemCapa?: string;
    tipo?: 'online' | 'presencial';
  }) => api.post('/courses', data),

  update: (id: string, data: {
    titulo?: string;
    descricao?: string;
    dataInicio?: string;
    dataTermino?: string;
    imagemCapa?: string;
    ativo?: boolean;
    tipo?: 'online' | 'presencial';
    exibirDuracao?: boolean;
  }) => api.put(`/courses/${id}`, data),

  delete: (id: string) => api.delete(`/courses/${id}`),

  enroll: (id: string) => api.post(`/courses/${id}/enroll`),

  unenroll: (id: string) => api.delete(`/courses/${id}/enroll`),

  getProgress: (id: string) => api.get(`/courses/${id}/progress`),

  reorder: (orders: { id: string; ordem: number }[]) =>
    api.put('/courses/reorder', { orders }),

  // Processa cursos com data de término atingida (envia e-mail de encerramento).
  // Ideal para ser chamado por um agendador (Vercel Cron) uma vez por dia.
  processCompletions: () => api.post('/courses/process-completions')
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

  updateProgress: (id: string, progresso?: number, timestamp?: number) =>
    api.post(`/lessons/${id}/update-progress`, { progresso, timestamp }),

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

  /** Correção imediata de uma questão (modo estudo). */
  check: (id: string, questaoIndex: number, resposta: any) =>
    api.post(`/exercises/${id}/check`, { questaoIndex, resposta }),

  /** Tentativas e melhor nota do usuário em cada exercício. */
  getMyProgress: () => api.get('/exercises/my-progress'),

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
    api.put('/site-config/zoom-native', data),

  updateAppDownload: (data: {
    windows?: { enabled?: boolean; url?: string; comingSoon?: boolean };
    ios?: { enabled?: boolean; url?: string; comingSoon?: boolean };
    android?: { enabled?: boolean; url?: string; comingSoon?: boolean };
  }) => api.put('/site-config/app-download', data)
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

// Certificate Requests (Solicitacoes de Certificado)
export const certificateRequestService = {
  // Admin routes
  getAll: (params?: { status?: string; cursoId?: string; page?: number; limit?: number }) =>
    api.get('/certificate-requests', { params }),

  getStats: () => api.get('/certificate-requests/stats'),

  approve: (id: string) => api.put(`/certificate-requests/${id}/approve`),

  reject: (id: string, motivoRecusa?: string) =>
    api.put(`/certificate-requests/${id}/reject`, { motivoRecusa }),

  delete: (id: string) => api.delete(`/certificate-requests/${id}`),

  // User routes
  getMy: () => api.get('/certificate-requests/my'),

  create: (cursoId: string) => api.post('/certificate-requests', { cursoId }),

  canRequest: (courseId: string) => api.get(`/certificate-requests/can-request/${courseId}`),

  issueImmediate: (courseId: string) => api.post(`/certificate-requests/immediate/${courseId}`)
};

// Payments (Sistema de Pagamentos - Mercado Pago)
export const paymentService = {
  // Público
  getConfig: () => api.get('/payments/config'),

  quote: (data: { cursoId: string; cupom?: string; email?: string }) =>
    api.post('/payments/quote', data),

  checkout: (data: {
    cursoId: string;
    cupom?: string;
    comprador: { nome: string; email: string; telefone: string; cpf: string };
    aceiteTermos: { aceito: boolean };
  }) => api.post('/payments/checkout', data),

  // Checkout Transparente: envia os dados tokenizados pelo Payment Brick
  process: (numeroPedido: string, payment: any) =>
    api.post(`/payments/order/${numeroPedido}/process`, { payment }),

  getOrderStatus: (numeroPedido: string) =>
    api.get(`/payments/order/${numeroPedido}`),

  syncOrder: (numeroPedido: string) =>
    api.post(`/payments/order/${numeroPedido}/sync`),

  // Usuário logado
  getMyOrders: () => api.get('/payments/my-orders'),

  // Admin
  admin: {
    getOrders: (params?: { status?: string; search?: string; cursoId?: string; page?: number; limit?: number }) =>
      api.get('/payments/admin/orders', { params }),

    getOrderById: (id: string) => api.get(`/payments/admin/orders/${id}`),

    getStats: () => api.get('/payments/admin/stats'),

    // Visão unificada (cursos + materiais) — receita total e pedidos combinados
    getUnifiedStats: () => api.get('/payments/admin/stats-unified'),

    getUnifiedOrders: (params?: { status?: string; search?: string; origem?: 'curso' | 'material'; page?: number; limit?: number }) =>
      api.get('/payments/admin/orders-unified', { params }),

    refulfill: (id: string) => api.post(`/payments/admin/orders/${id}/refulfill`),

    // Diagnóstico: consulta o Mercado Pago para ESTE pedido específico e mostra
    // todos os pagamentos encontrados (útil quando "Sincronizar pendentes" não pega um caso).
    syncOrderMp: (id: string) => api.post(`/payments/admin/orders/${id}/sync-mp`),

    getConfig: () => api.get('/payments/admin/config'),

    updateConfig: (data: any) => api.put('/payments/admin/config', data),

    resetTerms: () => api.post('/payments/admin/config/reset-terms'),

    // Reconsulta no Mercado Pago todos os pedidos pendentes e libera os que já
    // foram pagos (mesma rotina que o cron externo executa automaticamente).
    reconcile: (data?: { dias?: number; limite?: number }) =>
      api.post('/payments/admin/reconcile', data || {}),

    getCoursesPricing: () => api.get('/payments/admin/courses-pricing'),

    updateCoursePricing: (id: string, data: {
      disponivel?: boolean;
      preco?: number;
      validadeAcessoDias?: number;
      descontoAtivado?: { ativo?: boolean; tipo?: 'percentual' | 'fixo'; valor?: number };
    }) => api.put(`/payments/admin/course/${id}/pricing`, data)
  }
};

// Coupons (Cupons de desconto - Admin)
export const couponService = {
  getAll: () => api.get('/coupons'),
  create: (data: any) => api.post('/coupons', data),
  update: (id: string, data: any) => api.put(`/coupons/${id}`, data),
  delete: (id: string) => api.delete(`/coupons/${id}`)
};

// Price Lots (Lotes de desconto - Admin)
export const priceLotService = {
  getByCourse: (courseId: string) => api.get(`/price-lots/course/${courseId}`),
  create: (data: any) => api.post('/price-lots', data),
  update: (id: string, data: any) => api.put(`/price-lots/${id}`, data),
  delete: (id: string) => api.delete(`/price-lots/${id}`)
};

// Materials (Loja de Materiais - Mercado Pago)
export const materialService = {
  // Público
  list: () => api.get('/materials'),
  getById: (id: string) => api.get(`/materials/${id}`),

  quote: (data: { materialId: string; cupom?: string; email?: string }) =>
    api.post('/materials/quote', data),

  checkout: (data: {
    materialId: string;
    cupom?: string;
    comprador: { nome: string; email: string; telefone: string; cpf: string };
    aceiteTermos: { aceito: boolean };
  }) => api.post('/materials/checkout', data),

  process: (numeroPedido: string, payment: any) =>
    api.post(`/materials/order/${numeroPedido}/process`, { payment }),

  getOrderStatus: (numeroPedido: string) =>
    api.get(`/materials/order/${numeroPedido}`),

  syncOrder: (numeroPedido: string) =>
    api.post(`/materials/order/${numeroPedido}/sync`),

  recover: (email: string) => api.post('/materials/recover', { email }),

  // Termos de download (direitos autorais) — exibidos antes de baixar
  getDownloadTerms: () => api.get('/materials/download-terms'),

  // Acesso por token (convidado)
  getAccess: (token: string) => api.get(`/materials/access/${token}`),
  downloadUrl: (token: string, index: number) => `/api/materials/access/${token}/download/${index}`,

  // Usuário logado
  getMy: () => api.get('/materials/my'),
  getContent: (id: string) => api.get(`/materials/${id}/content`),
  claim: (codigo: string) => api.post('/materials/claim', { codigo }),

  // Avaliações
  getReviews: (id: string) => api.get(`/materials/${id}/reviews`),
  review: (id: string, data: { nota: number; comentario?: string }) =>
    api.post(`/materials/${id}/reviews`, data),
  deleteMyReview: (id: string) => api.delete(`/materials/${id}/reviews`),

  // Admin
  admin: {
    list: () => api.get('/materials/admin/all'),
    getById: (id: string) => api.get(`/materials/admin/${id}`),
    create: (data: any) => api.post('/materials/admin', data),
    update: (id: string, data: any) => api.put(`/materials/admin/${id}`, data),
    delete: (id: string) => api.delete(`/materials/admin/${id}`),
    getOrders: (params?: { status?: string; search?: string; materialId?: string; page?: number; limit?: number }) =>
      api.get('/materials/admin/orders', { params }),
    getOrderById: (id: string) => api.get(`/materials/admin/orders/${id}`),
    getStats: () => api.get('/materials/admin/stats'),
    refulfill: (id: string) => api.post(`/materials/admin/orders/${id}/refulfill`),
    syncOrderMp: (id: string) => api.post(`/materials/admin/orders/${id}/sync-mp`),
    deleteReview: (reviewId: string) => api.delete(`/materials/admin/reviews/${reviewId}`),

    // Acessos (quem pode ver o material)
    grant: (
      id: string,
      data: string | { emails?: string[] | string; email?: string; userIds?: string[]; validadeDias?: number; enviarEmail?: boolean; origem?: 'cortesia' | 'admin' }
    ) => api.post(`/materials/admin/${id}/grant`, typeof data === 'string' ? { email: data } : data),

    listEntitlements: (
      id: string,
      params?: { search?: string; status?: 'valido' | 'revogado' | 'expirado'; origem?: string; page?: number; limit?: number }
    ) => api.get(`/materials/admin/${id}/entitlements`, { params }),

    updateEntitlement: (
      id: string,
      data: { revogado?: boolean; ativo?: boolean; podeAvaliar?: boolean; validade?: string | null; validadeDias?: number }
    ) => api.put(`/materials/admin/entitlements/${id}`, data),

    deleteEntitlement: (id: string, force = false) =>
      api.delete(`/materials/admin/entitlements/${id}`, { params: force ? { force: 'true' } : undefined })
  }
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
