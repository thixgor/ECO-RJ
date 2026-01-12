import React, { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Search, AlertTriangle, BookOpen, User as UserIcon, Clock } from 'lucide-react';
import { certificateService, courseService, userService } from '../../services/api';
import { Certificate, User, Course } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [filterCourseId, setFilterCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Dados para o formulário de geração
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseHours, setCourseHours] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal de exclusão de todos os certificados do usuário
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [userToDeleteAll, setUserToDeleteAll] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterCourseId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [certsResponse, statsResponse, coursesResponse] = await Promise.all([
        certificateService.getAll({ cursoId: filterCourseId || undefined }),
        certificateService.getStats(),
        courseService.getAll()
      ]);
      setCertificates(certsResponse.data.certificates);
      setStats(statsResponse.data);
      setCourses(coursesResponse.data.courses || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar certificados');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar usuários quando digitar no campo de busca
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setUsers([]);
        return;
      }
      try {
        const response = await userService.getAll({ search: userSearch, limit: 10 });
        setUsers(response.data.users || []);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearch]);

  // Buscar horas do curso quando selecionar
  useEffect(() => {
    const fetchCourseHours = async () => {
      if (!selectedCourse) {
        setCourseHours(0);
        return;
      }
      try {
        const response = await certificateService.getCourseHours(selectedCourse._id);
        setCourseHours(response.data.cargaHoraria);
      } catch (error) {
        console.error('Erro ao buscar horas:', error);
        setCourseHours(0);
      }
    };
    fetchCourseHours();
  }, [selectedCourse]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedCourse) {
      toast.error('Selecione um aluno e um curso');
      return;
    }

    setIsGenerating(true);
    try {
      await certificateService.generate({
        alunoId: selectedUser._id,
        cursoId: selectedCourse._id
      });
      toast.success('Certificado gerado com sucesso!');
      setShowGenerateModal(false);
      resetGenerateForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar certificado');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetGenerateForm = () => {
    setSelectedUser(null);
    setSelectedCourse(null);
    setUserSearch('');
    setUsers([]);
    setCourseHours(0);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este certificado?')) return;

    try {
      await certificateService.delete(id);
      toast.success('Certificado excluído');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir');
    }
  };

  const handleDeleteAllForUser = async () => {
    if (!userToDeleteAll) return;

    setIsDeleting(true);
    try {
      const response = await certificateService.deleteByUser(userToDeleteAll._id);
      toast.success(response.data.message);
      setShowDeleteAllModal(false);
      setUserToDeleteAll(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir certificados');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteAllModal = (user: User) => {
    setUserToDeleteAll(user);
    setShowDeleteAllModal(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${hours}h`;
  };

  // Filtrar certificados por busca
  const filteredCertificates = certificates.filter((cert) => {
    if (!searchTerm) return true;
    const aluno = cert.alunoId as User;
    const curso = cert.cursoId as Course;
    const search = searchTerm.toLowerCase();
    return (
      aluno?.nomeCompleto?.toLowerCase().includes(search) ||
      aluno?.email?.toLowerCase().includes(search) ||
      curso?.titulo?.toLowerCase().includes(search) ||
      cert.codigoValidacao.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Certificados</h1>
          <p className="text-[var(--color-text-secondary)]">Gerencie os certificados emitidos</p>
        </div>
        <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Gerar Certificado
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.total}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Total de Certificados</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.recentCount}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Últimos 30 dias</p>
          </div>
          <div className="card p-4 text-center md:col-span-1 col-span-2">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.byCourse?.length || 0}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">Cursos com Certificados</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
            placeholder="Buscar por aluno, curso ou código..."
          />
        </div>
        <select
          value={filterCourseId}
          onChange={(e) => setFilterCourseId(e.target.value)}
          className="input w-full md:w-64"
        >
          <option value="">Todos os cursos</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.titulo}
            </option>
          ))}
        </select>
      </div>

      {/* Certificates Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <Loading />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-[var(--glass-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Aluno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Carga Horária
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Data de Emissão
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {filteredCertificates.map((cert) => {
                  const aluno = cert.alunoId as User;
                  const curso = cert.cursoId as Course;
                  return (
                    <tr key={cert._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <code className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded font-mono text-sm text-[var(--color-text-primary)]">
                          {cert.codigoValidacao}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">{aluno?.nomeCompleto}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{aluno?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 text-xs font-medium">
                          <BookOpen className="w-3 h-3" />
                          {curso?.titulo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-[var(--color-text-primary)]">
                          <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                          {formatHours(cert.cargaHoraria)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                        {formatDate(cert.dataEmissao)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDeleteAllModal(aluno)}
                            className="p-2 text-gray-400 hover:text-orange-500"
                            title="Excluir todos do aluno"
                          >
                            <UserIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cert._id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                            title="Excluir certificado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredCertificates.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum certificado encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-lg">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">
                Gerar Novo Certificado
              </h2>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              {/* Seleção de Aluno */}
              <div>
                <label className="label">Selecionar Aluno</label>
                {selectedUser ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/30">
                    <UserIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.nomeCompleto}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{selectedUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="input pl-10"
                        placeholder="Buscar aluno por nome ou email..."
                      />
                    </div>

                    {users.length > 0 && (
                      <div className="border border-[var(--glass-border)] rounded-lg max-h-40 overflow-y-auto bg-[var(--color-bg-primary)]">
                        {users.map((user) => (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserSearch('');
                              setUsers([]);
                            }}
                            className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                          >
                            <UserIcon className="w-4 h-4 text-primary-500" />
                            <div>
                              <p className="text-[var(--color-text-primary)]">{user.nomeCompleto}</p>
                              <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {userSearch.length >= 2 && users.length === 0 && (
                      <p className="text-sm text-[var(--color-text-muted)] text-center py-2">
                        Nenhum usuário encontrado
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Seleção de Curso */}
              <div>
                <label className="label">Selecionar Curso</label>
                {selectedCourse ? (
                  <div className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-500/10 rounded-lg border border-primary-200 dark:border-primary-500/30">
                    <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <div className="flex-1">
                      <p className="font-medium text-[var(--color-text-primary)]">{selectedCourse.titulo}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(null)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(e) => {
                      const course = courses.find((c) => c._id === e.target.value);
                      setSelectedCourse(course || null);
                    }}
                    className="input"
                  >
                    <option value="">Selecione um curso...</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.titulo}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Carga Horária Calculada */}
              {selectedCourse && (
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Carga Horária Calculada:</span>
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {formatHours(courseHours)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Baseado na soma da duração de todas as aulas do curso
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isGenerating || !selectedUser || !selectedCourse}
                  className="btn btn-primary flex-1"
                >
                  {isGenerating ? 'Gerando...' : 'Gerar Certificado'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    resetGenerateForm();
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Modal */}
      {showDeleteAllModal && userToDeleteAll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Excluir Todos os Certificados
              </h2>
              <p className="text-[var(--color-text-muted)] mb-2">
                Tem certeza que deseja excluir <strong className="text-red-500">todos</strong> os certificados de:
              </p>
              <p className="font-semibold text-[var(--color-text-primary)] mb-4">
                {userToDeleteAll.nomeCompleto}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                Esta ação é irreversível. Todos os certificados deste aluno serão permanentemente excluídos.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAllForUser}
                  disabled={isDeleting}
                  className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir Todos'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteAllModal(false);
                    setUserToDeleteAll(null);
                  }}
                  className="btn btn-outline flex-1"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificates;
