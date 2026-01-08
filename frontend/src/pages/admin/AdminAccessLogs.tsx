import React, { useState, useEffect } from 'react';
import { Activity, User, BookOpen, Monitor, Clock, Filter, Download, RefreshCw } from 'lucide-react';
import Loading from '../../components/common/Loading';
import api from '../../services/api';

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

  useEffect(() => {
    loadData();
  }, [page, filters]);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Logs de Acesso</h1>
          <p className="text-[var(--color-text-secondary)]">Monitoramento de atividades da plataforma</p>
        </div>
        <div className="flex gap-2">
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
    </div>
  );
};

export default AdminAccessLogs;
