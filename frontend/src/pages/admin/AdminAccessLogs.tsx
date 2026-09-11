import React, { useState, useEffect } from 'react';
import { Activity, User, BookOpen, Monitor, Clock, Filter, Download, RefreshCw, Pause, Play, Trash2, AlertTriangle } from 'lucide-react';
import Loading from '../../components/common/Loading';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface AccessLog {
  _id: string;
  usuarioId: {
    _id: string;
    nomeCompleto: string;
    email: string;
    cargo: string;
  };
  tipo: 'curso' | 'aula' | 'exercicio' | 'prova' | 'login';
  cursoId?: {
    _id: string;
    titulo: string;
  };
  aulaId?: {
    _id: string;
    titulo: string;
  };
  exercicioId?: {
    _id: string;
    titulo: string;
  };
  provaId?: {
    _id: string;
    titulo: string;
  };
  ip: string;
  userAgent?: string;
  createdAt: string;
}

interface AccessStats {
  totalLogs: number;
  logsPorTipo: { _id: string; count: number }[];
  logsPorDia: { _id: string; count: number }[];
  aulasMAisAcessadas: { _id: string; titulo: string; count: number }[];
  usuariosMaisAtivos: { _id: string; nomeCompleto: string; email: string; count: number }[];
}

const AdminAccessLogs: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<AccessStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    tipo: '',
    dataInicio: '',
    dataFim: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [logsEnabled, setLogsEnabled] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearMode, setClearMode] = useState<'all' | 'old'>('all');
  const [clearDays, setClearDays] = useState(30);

  useEffect(() => {
    loadData();
    loadStatus();
  }, [page, filters]);

  const loadStatus = async () => {
    try {
      const res = await api.get('/access-logs/status');
      setLogsEnabled(res.data.enabled);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      const params: any = { page, limit: 50 };
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.dataInicio) params.dataInicio = filters.dataInicio;
      if (filters.dataFim) params.dataFim = filters.dataFim;

      const [logsRes, statsRes] = await Promise.all([
        api.get('/access-logs', { params }),
        api.get('/access-logs/stats', { params: { dataInicio: filters.dataInicio, dataFim: filters.dataFim } })
      ]);

      setLogs(logsRes.data.logs);
      setTotalPages(logsRes.data.pagination.pages);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLogs = async () => {
    try {
      const res = await api.post('/access-logs/toggle');
      setLogsEnabled(res.data.enabled);
      toast.success(res.data.message);
    } catch (error) {
      console.error('Erro ao alternar logs:', error);
      toast.error('Erro ao alternar logs');
    }
  };

  const clearLogs = async () => {
    try {
      let res;
      if (clearMode === 'all') {
        res = await api.delete('/access-logs/clear');
      } else {
        res = await api.delete(`/access-logs/clear-old?days=${clearDays}`);
      }
      toast.success(`${res.data.deletedCount} logs removidos`);
      setShowClearModal(false);
      loadData();
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
      toast.error('Erro ao limpar logs');
    }
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      login: 'bg-blue-100 text-blue-700',
      curso: 'bg-purple-100 text-purple-700',
      aula: 'bg-green-100 text-green-700',
      exercicio: 'bg-orange-100 text-orange-700',
      prova: 'bg-red-100 text-red-700'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-700';
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'login': return <User className="w-4 h-4" />;
      case 'curso': return <BookOpen className="w-4 h-4" />;
      case 'aula': return <Monitor className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Email', 'Tipo', 'Recurso', 'IP'];
    const rows = logs.map(log => [
      formatDate(log.createdAt),
      log.usuarioId?.nomeCompleto || 'N/A',
      log.usuarioId?.email || 'N/A',
      log.tipo,
      log.aulaId?.titulo || log.cursoId?.titulo || log.exercicioId?.titulo || log.provaId?.titulo || '-',
      log.ip
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading && logs.length === 0) {
    return <Loading size="lg" text="Carregando logs de acesso..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Logs de Acesso</h1>
          <p className="text-[var(--color-text-secondary)]">Monitoramento de atividades da plataforma</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleLogs}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              logsEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            {logsEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {logsEnabled ? 'Pausar' : 'Retomar'}
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Limpar
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={exportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={loadData}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Status dos logs */}
      {!logsEnabled && (
        <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-700 dark:text-amber-400 text-sm">
            <strong>Logs pausados.</strong> Nenhum novo acesso será registrado até você retomar.
          </p>
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Tipo</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                className="input"
              >
                <option value="">Todos</option>
                <option value="login">Login</option>
                <option value="curso">Curso</option>
                <option value="aula">Aula</option>
                <option value="exercicio">Exercício</option>
                <option value="prova">Prova</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Data Início</label>
              <input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Data Fim</label>
              <input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ tipo: '', dataInicio: '', dataFim: '' });
                  setPage(1);
                }}
                className="btn-secondary w-full"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Total de Acessos</p>
                <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats.totalLogs.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {stats.logsPorTipo.slice(0, 3).map((item) => (
            <div key={item._id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTipoColor(item._id).replace('bg-', 'dark:bg-opacity-20 bg-')}`}>
                  {getTipoIcon(item._id)}
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-muted)] capitalize">{item._id}</p>
                  <p className="text-xl font-bold text-[var(--color-text-primary)]">{item.count.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gráficos e Tops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usuários mais ativos */}
        {stats && stats.usuariosMaisAtivos.length > 0 && (
          <div className="card p-6">
            <h3 className="font-heading text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Usuários Mais Ativos</h3>
            <div className="space-y-3">
              {stats.usuariosMaisAtivos.map((user, index) => (
                <div key={user._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">{user.nomeCompleto}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">{user.count} acessos</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aulas mais acessadas */}
        {stats && stats.aulasMAisAcessadas.length > 0 && (
          <div className="card p-6">
            <h3 className="font-heading text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Aulas Mais Acessadas</h3>
            <div className="space-y-3">
              {stats.aulasMAisAcessadas.map((aula, index) => (
                <div key={aula._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="font-medium truncate max-w-xs text-[var(--color-text-primary)]">{aula.titulo}</p>
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-muted)]">{aula.count} acessos</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Logs */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--glass-border)]">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDate(log.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {log.usuarioId?.nomeCompleto || 'Usuário removido'}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">{log.usuarioId?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoColor(log.tipo).replace('bg-', 'dark:bg-opacity-20 bg-')}`}>
                      {getTipoIcon(log.tipo)}
                      {log.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-muted)]">
                    {log.aulaId?.titulo || log.cursoId?.titulo || log.exercicioId?.titulo || log.provaId?.titulo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-muted)] font-mono">
                    {log.ip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--glass-border)] flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação para limpar logs */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Limpar Logs</h3>
            </div>

            <p className="text-[var(--color-text-secondary)] mb-4">
              Escolha como deseja limpar os logs:
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="clearMode"
                  checked={clearMode === 'all'}
                  onChange={() => setClearMode('all')}
                  className="w-4 h-4 text-red-500"
                />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Limpar todos os logs</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Remove permanentemente todos os registros</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="clearMode"
                  checked={clearMode === 'old'}
                  onChange={() => setClearMode('old')}
                  className="w-4 h-4 text-amber-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-text-primary)]">Limpar logs antigos</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Remove logs com mais de:</p>
                  {clearMode === 'old' && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={clearDays}
                        onChange={(e) => setClearDays(Number(e.target.value))}
                        min={1}
                        max={365}
                        className="input w-20 text-sm"
                      />
                      <span className="text-sm text-[var(--color-text-muted)]">dias</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={clearLogs}
                className="btn bg-red-500 text-white hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccessLogs;
