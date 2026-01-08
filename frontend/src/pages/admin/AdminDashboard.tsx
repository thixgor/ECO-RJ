import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, Key, TrendingUp, ArrowRight } from 'lucide-react';
import { statsService } from '../../services/api';
import { Stats } from '../../types';
import Loading from '../../components/common/Loading';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await statsService.getGeneral();
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading size="lg" text="Carregando estatísticas..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Painel Administrativo</h1>
        <p className="text-[var(--color-text-secondary)]">Visão geral da plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Total de Usuários</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats?.usuarios.total || 0}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="text-green-500 font-medium">{stats?.usuarios.ativos || 0}</span> ativos nos últimos 30 dias
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Cursos</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats?.conteudo.cursos || 0}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="text-primary-500 font-medium">{stats?.conteudo.aulas || 0}</span> aulas criadas
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Exercícios</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats?.conteudo.exercicios || 0}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="text-green-500 font-medium">{stats?.conteudo.exerciciosRespondidos || 0}</span> respostas
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-sm">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats?.taxaConclusao || 0}%</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="text-orange-500 font-medium">{stats?.forum.topicos || 0}</span> tópicos no fórum
            </p>
          </div>
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-heading text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Distribuição por Cargo</h2>
          <div className="space-y-4">
            {Object.entries(stats?.usuarios.distribuicao || {}).map(([cargo, count]) => {
              const total = stats?.usuarios.total || 1;
              const percentage = Math.round((count / total) * 100);
              const colors: Record<string, string> = {
                Visitante: 'bg-gray-400',
                Aluno: 'bg-green-500',
                Instrutor: 'bg-blue-500',
                Administrador: 'bg-purple-500'
              };

              return (
                <div key={cargo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--color-text-primary)]">{cargo}</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[cargo] || 'bg-gray-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="font-heading text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Ações Rápidas</h2>
          <div className="space-y-3">
            <Link
              to="/admin/usuarios"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-[var(--color-text-primary)]">Gerenciar Usuários</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
            </Link>

            <Link
              to="/admin/cursos"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <span className="text-[var(--color-text-primary)]">Gerenciar Cursos</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
            </Link>

            <Link
              to="/admin/aulas"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-green-500" />
                <span className="text-[var(--color-text-primary)]">Gerenciar Aulas</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
            </Link>

            <Link
              to="/admin/serial-keys"
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-orange-500" />
                <span className="text-[var(--color-text-primary)]">Gerar Serial Keys</span>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
