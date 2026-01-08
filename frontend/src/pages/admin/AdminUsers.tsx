import React, { useState, useEffect } from 'react';
import { Search, Trash2, Eye, ChevronLeft, ChevronRight, User, Calendar, Mail, CreditCard } from 'lucide-react';
import { userService } from '../../services/api';
import { User as UserType } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [pagination.page, filterCargo]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userService.getAll({
        page: pagination.page,
        limit: 20,
        cargo: filterCargo || undefined,
        search: searchTerm || undefined
      });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers();
  };

  const handleChangeCargo = async (userId: string, newCargo: string) => {
    try {
      await userService.updateCargo(userId, newCargo);
      loadUsers();
      toast.success('Cargo atualizado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar cargo');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const response = await userService.toggleStatus(userId);
      loadUsers();
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      await userService.delete(userId);
      loadUsers();
      toast.success('Usuário deletado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao deletar usuário');
    }
  };

  const viewUser = async (userId: string) => {
    try {
      const response = await userService.getById(userId);
      setSelectedUser(response.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Gerenciar Usuários</h1>
        <p className="text-[var(--color-text-secondary)]">Total de {pagination.total} usuários cadastrados</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email, CPF ou CRM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterCargo}
            onChange={(e) => {
              setFilterCargo(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="input w-full md:w-48"
          >
            <option value="">Todos os cargos</option>
            <option value="Visitante">Visitante</option>
            <option value="Aluno">Aluno</option>
            <option value="Instrutor">Instrutor</option>
            <option value="Administrador">Administrador</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Buscar
          </button>
        </form>
      </div>

      {/* Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">CRM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Último Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          {user.fotoPerfil ? (
                            <img src={user.fotoPerfil} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <User className="w-5 h-5 text-primary-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">{user.nomeCompleto}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{user.crm}-{user.crmLocal}</td>
                    <td className="px-6 py-4">
                      <select
                        value={user.cargo}
                        onChange={(e) => handleChangeCargo(user._id, e.target.value)}
                        className={`text-sm px-2 py-1 rounded border ${user.cargo === 'Administrador'
                          ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300'
                          : user.cargo === 'Aluno'
                            ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-200/30 text-green-700 dark:text-green-300'
                            : user.cargo === 'Instrutor'
                              ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        <option value="Visitante">Visitante</option>
                        <option value="Aluno">Aluno</option>
                        <option value="Instrutor">Instrutor</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.ultimoLogin ? formatDate(user.ultimoLogin) : 'Nunca'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(user._id)}
                        className={`text-sm px-2 py-1 rounded ${user.ativo
                          ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                          }`}
                      >
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => viewUser(user._id)}
                          className="p-2 text-gray-400 hover:text-primary-500"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="p-2 text-gray-400 hover:text-red-500"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {pagination.page} de {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn btn-outline py-1 px-3"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="btn btn-outline py-1 px-3"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-content !max-w-lg">
            <div className="p-6 border-b border-[var(--glass-border)]">
              <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)]">Detalhes do Usuário</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-500/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-[var(--color-text-primary)]">{selectedUser.nomeCompleto}</h3>
                  <p className="text-[var(--color-text-muted)]">{selectedUser.cargo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--color-text-muted)] flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email
                  </p>
                  <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> CPF
                  </p>
                  <p className="font-medium text-[var(--color-text-primary)]">{formatCPF(selectedUser.cpf)}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">CRM</p>
                  <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.crm}-{selectedUser.crmLocal}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Nascimento
                  </p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {new Date(selectedUser.dataNascimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">Especialidade</p>
                  <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.especialidade || '-'}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">Cadastro</p>
                  <p className="font-medium text-[var(--color-text-primary)]">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--glass-border)]">
                <p className="text-[var(--color-text-muted)] text-sm mb-2">Cursos Inscritos: {selectedUser.cursosInscritos?.length || 0}</p>
                <p className="text-[var(--color-text-muted)] text-sm mb-2">Aulas Assistidas: {selectedUser.aulasAssistidas?.length || 0}</p>
                <p className="text-[var(--color-text-muted)] text-sm">Serial Keys Usadas: {selectedUser.serialKeysUsadas?.length || 0}</p>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--glass-border)] flex justify-end">
              <button onClick={() => setShowModal(false)} className="btn btn-primary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
