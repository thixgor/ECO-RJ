import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Download, Trash2, Check, BookOpen, Search, AlertTriangle } from 'lucide-react';
import { serialKeyService, courseService } from '../../services/api';
import { SerialKey, User, Course } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminSerialKeys: React.FC = () => {
  const [keys, setKeys] = useState<SerialKey[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [generateForm, setGenerateForm] = useState({
    quantidade: 10,
    cargoAtribuido: 'Aluno',
    validadeDias: 90,
    descricao: '',
    cursoRestrito: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [restrictedCourses, setRestrictedCourses] = useState<Course[]>([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [keysResponse, statsResponse, coursesResponse] = await Promise.all([
        serialKeyService.getAll({ status: filterStatus || undefined }),
        serialKeyService.getStats(),
        courseService.getAll()
      ]);
      setKeys(keysResponse.data.keys);
      setStats(statsResponse.data);
      // Filtrar apenas cursos com acesso restrito
      const allCourses = coursesResponse.data.courses || [];
      setRestrictedCourses(allCourses.filter((c: Course) => c.acessoRestrito));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const dataToSend = {
        ...generateForm,
        cursoRestrito: generateForm.cursoRestrito || undefined
      };
      const response = await serialKeyService.generate(dataToSend);
      toast.success(`${response.data.keys.length} chaves geradas com sucesso!`);
      setShowGenerateModal(false);
      setGenerateForm({ quantidade: 10, cargoAtribuido: 'Aluno', validadeDias: 90, descricao: '', cursoRestrito: '' });
      setCourseSearch('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao gerar chaves');
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtrar cursos para busca
  const filteredCourses = restrictedCourses.filter(c =>
    c.titulo.toLowerCase().includes(courseSearch.toLowerCase())
  );

  // Obter nome do curso selecionado
  const selectedCourseName = restrictedCourses.find(c => c._id === generateForm.cursoRestrito)?.titulo;

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('Chave copiada!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta chave?')) return;

    try {
      await serialKeyService.delete(id);
      toast.success('Chave deletada');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar');
    }
  };

  const handleExport = async () => {
    try {
      const response = await serialKeyService.export({ status: filterStatus || undefined });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serial-keys-${Date.now()}.csv`;
      a.click();
      toast.success('Arquivo exportado!');
    } catch (error) {
      toast.error('Erro ao exportar');
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await serialKeyService.deleteAll();
      toast.success(response.data.message);
      setShowDeleteAllModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar chaves');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendente: 'bg-yellow-100 text-yellow-700',
      usada: 'bg-green-100 text-green-700',
      expirada: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      usada: 'Usada',
      expirada: 'Expirada'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status].replace('bg-', 'dark:bg-opacity-20 bg-')}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Serial Keys</h1>
          <p className="text-[var(--color-text-secondary)]">Gerencie as chaves de ativação</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="btn btn-outline">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="btn bg-red-500 hover:bg-red-600 text-white"
            disabled={keys.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Limpar Todas
          </button>
          <button onClick={() => setShowGenerateModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Gerar Chaves
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.total}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendentes}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Pendentes</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.usadas}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Usadas</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expiradas}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Expiradas</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card p-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input w-full md:w-48"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendentes</option>
          <option value="usada">Usadas</option>
          <option value="expirada">Expiradas</option>
        </select>
      </div>

      {/* Keys Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Chave</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Curso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Validade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Usada Por</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {keys.map((key) => {
                  const usadaPor = key.usadaPor as User | undefined;
                  const cursoRestrito = key.cursoRestrito as Course | undefined;
                  return (
                    <tr key={key._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <code className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded font-mono text-sm text-[var(--color-text-primary)]">
                          {key.chave}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${key.cargoAtribuido === 'Administrador'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                          : key.cargoAtribuido === 'Aluno'
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                            : key.cargoAtribuido === 'Instrutor'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                          }`}>
                          {key.cargoAtribuido}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {cursoRestrito ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-xs font-medium">
                            <BookOpen className="w-3 h-3" />
                            {cursoRestrito.titulo}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                        {formatDate(key.validade)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(key.status)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {usadaPor ? (
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">{usadaPor.nomeCompleto}</p>
                            <p className="text-[var(--color-text-muted)] text-xs">{key.dataUso ? formatDate(key.dataUso) : ''}</p>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopy(key.chave)}
                            className="p-2 text-gray-400 hover:text-primary-500"
                            title="Copiar chave"
                          >
                            {copiedKey === key.chave ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(key._id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                            title="Deletar"
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

            {keys.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma chave encontrada</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-md">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">Gerar Novas Chaves</h2>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div>
                <label className="label">Quantidade de Chaves</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={generateForm.quantidade}
                  onChange={(e) => setGenerateForm({ ...generateForm, quantidade: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Cargo Atribuído</label>
                <select
                  value={generateForm.cargoAtribuido}
                  onChange={(e) => setGenerateForm({ ...generateForm, cargoAtribuido: e.target.value })}
                  className="input"
                >
                  <option value="Aluno">Aluno</option>
                  <option value="Instrutor">Instrutor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div>
                <label className="label">Validade (em dias)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={generateForm.validadeDias}
                  onChange={(e) => setGenerateForm({ ...generateForm, validadeDias: parseInt(e.target.value) })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Descrição (opcional)</label>
                <input
                  type="text"
                  value={generateForm.descricao}
                  onChange={(e) => setGenerateForm({ ...generateForm, descricao: e.target.value })}
                  className="input"
                  placeholder="Ex: Turma Janeiro 2025"
                />
              </div>

              {/* Seleção de Curso Restrito */}
              <div>
                <label className="label">Liberar Acesso a Curso Restrito (opcional)</label>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">
                  Ao usar esta chave, o usuário também receberá acesso ao curso selecionado
                </p>

                {generateForm.cursoRestrito ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/30">
                    <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="flex-1 font-medium text-[var(--color-text-primary)]">{selectedCourseName}</span>
                    <button
                      type="button"
                      onClick={() => setGenerateForm({ ...generateForm, cursoRestrito: '' })}
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
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="input pl-10"
                        placeholder="Buscar curso restrito..."
                      />
                    </div>

                    {courseSearch && filteredCourses.length > 0 && (
                      <div className="border border-[var(--glass-border)] rounded-lg max-h-40 overflow-y-auto bg-[var(--color-bg-primary)]">
                        {filteredCourses.map((course) => (
                          <button
                            key={course._id}
                            type="button"
                            onClick={() => {
                              setGenerateForm({ ...generateForm, cursoRestrito: course._id });
                              setCourseSearch('');
                            }}
                            className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                          >
                            <BookOpen className="w-4 h-4 text-primary-500" />
                            <span className="text-[var(--color-text-primary)]">{course.titulo}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {courseSearch && filteredCourses.length === 0 && (
                      <p className="text-sm text-[var(--color-text-muted)] text-center py-2">
                        Nenhum curso restrito encontrado
                      </p>
                    )}

                    {restrictedCourses.length === 0 && !courseSearch && (
                      <p className="text-sm text-[var(--color-text-muted)] text-center py-2">
                        Nenhum curso com acesso restrito cadastrado
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isGenerating} className="btn btn-primary flex-1">
                  {isGenerating ? 'Gerando...' : 'Gerar Chaves'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
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
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Limpar Todas as Chaves
              </h2>
              <p className="text-[var(--color-text-muted)] mb-2">
                Tem certeza que deseja deletar <strong className="text-red-500">{stats?.total || 0}</strong> serial keys?
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                Esta ação é irreversível. As chaves também serão removidas do histórico dos usuários que as utilizaram.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
                >
                  {isDeleting ? 'Deletando...' : 'Sim, Deletar Todas'}
                </button>
                <button
                  onClick={() => setShowDeleteAllModal(false)}
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

export default AdminSerialKeys;
