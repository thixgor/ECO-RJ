import React, { useState, useEffect } from 'react';
import { Search, Trash2, Eye, ChevronLeft, ChevronRight, User, Calendar, Mail, CreditCard, MapPin, Building2, GraduationCap, Award, Stethoscope } from 'lucide-react';
import { userService } from '../../services/api';
import { User as UserType } from '../../types';
import Loading from '../../components/common/Loading';
import { ESTADOS } from '../../data/cadastroData';
import { getRoleInfo } from '../../config/roles';
import toast from 'react-hot-toast';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [pagination.page, filterCargo, filterTipo, filterEstado]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userService.getAll({
        page: pagination.page,
        limit: 20,
        cargo: filterCargo || undefined,
        tipoUsuario: filterTipo || undefined,
        estado: filterEstado || undefined,
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

  const tipoBadgeClass = (tipo?: string) => {
    switch (tipo) {
      case 'Médico':
        return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'Residente':
        return 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300';
      case 'Acadêmico de Medicina':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300';
      default:
        return 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300';
    }
  };

  // Resumo da formação exibido na tabela
  const formacaoResumo = (u: UserType): string => {
    if (u.tipoUsuario === 'Médico') {
      const crm = u.crm ? `CRM ${u.crm}${u.crmLocal ? '-' + u.crmLocal : ''}` : '';
      return [u.especialidade, crm].filter(Boolean).join(' · ') || '-';
    }
    if (u.tipoUsuario === 'Residente') {
      return [u.areaResidencia, u.hospital, u.anoResidencia].filter(Boolean).join(' · ') || '-';
    }
    if (u.tipoUsuario === 'Acadêmico de Medicina') {
      return [u.instituicao, u.periodo].filter(Boolean).join(' · ') || '-';
    }
    return u.crm ? `CRM ${u.crm}${u.crmLocal ? '-' + u.crmLocal : ''}` : '-';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">Gerenciar Usuários</h1>
        <p className="text-[var(--color-text-secondary)]">Total de {pagination.total} usuários cadastrados</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:flex-wrap gap-4">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email, CRM, hospital, instituição..."
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
            className="input w-full md:w-44"
          >
            <option value="">Todos os cargos</option>
            <option value="Visitante">Visitante</option>
            <option value="Aluno">Aluno</option>
            <option value="Instrutor">Instrutor</option>
            <option value="Administrador">Administrador</option>
          </select>
          <select
            value={filterTipo}
            onChange={(e) => {
              setFilterTipo(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="input w-full md:w-52"
          >
            <option value="">Todos os perfis</option>
            <option value="Médico">Médico</option>
            <option value="Residente">Residente</option>
            <option value="Acadêmico de Medicina">Acadêmico de Medicina</option>
          </select>
          <select
            value={filterEstado}
            onChange={(e) => {
              setFilterEstado(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="input w-full md:w-40"
          >
            <option value="">Todos os estados</option>
            {ESTADOS.map((e) => (
              <option key={e.uf} value={e.uf}>{e.uf} - {e.nome}</option>
            ))}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Perfil / Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">Formação</th>
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
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadgeClass(user.tipoUsuario)}`}>
                          {user.tipoUsuario || 'Não informado'}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {user.estado || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] max-w-xs">
                      <span className="line-clamp-2">{formacaoResumo(user)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.cargo}
                        onChange={(e) => handleChangeCargo(user._id, e.target.value)}
                        title={getRoleInfo(user.cargo).descricao}
                        className={`text-sm px-2 py-1 rounded border border-transparent ${getRoleInfo(user.cargo).badgeClass}`}
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadgeClass(selectedUser.tipoUsuario)}`}>
                      {selectedUser.tipoUsuario || 'Não informado'}
                    </span>
                    <span className="text-[var(--color-text-muted)] text-sm">{selectedUser.cargo}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--color-text-muted)] flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email
                  </p>
                  <p className="font-medium text-[var(--color-text-primary)] break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> Estado
                  </p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {ESTADOS.find((e) => e.uf === selectedUser.estado)?.nome
                      ? `${ESTADOS.find((e) => e.uf === selectedUser.estado)!.nome} (${selectedUser.estado})`
                      : selectedUser.estado || '-'}
                  </p>
                </div>

                {/* Campos específicos por tipo */}
                {selectedUser.tipoUsuario === 'Médico' && (
                  <>
                    <div>
                      <p className="text-[var(--color-text-muted)] flex items-center gap-1"><Stethoscope className="w-4 h-4" /> Especialidade</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.especialidade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-muted)] flex items-center gap-1"><Award className="w-4 h-4" /> CRM</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {selectedUser.crm ? `${selectedUser.crm}${selectedUser.crmLocal ? '-' + selectedUser.crmLocal : ''}` : '-'}
                      </p>
                    </div>
                  </>
                )}

                {selectedUser.tipoUsuario === 'Residente' && (
                  <>
                    <div>
                      <p className="text-[var(--color-text-muted)] flex items-center gap-1"><Award className="w-4 h-4" /> Área da Residência</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.areaResidencia || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-muted)] flex items-center gap-1"><Building2 className="w-4 h-4" /> Hospital</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.hospital || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-muted)] flex items-center gap-1"><Calendar className="w-4 h-4" /> Ano / Semestre</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {selectedUser.anoResidencia || '-'}
                        {selectedUser.semestreResidencia ? ` · ${selectedUser.semestreResidencia}` : ''}
                      </p>
                    </div>
                  </>
                )}

                {selectedUser.tipoUsuario === 'Acadêmico de Medicina' && (
                  <>
                    <div>
                      <p className="text-[var(--color-text-muted)] flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Instituição</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.instituicao || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-muted)] flex items-center gap-1"><Calendar className="w-4 h-4" /> Período</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{selectedUser.periodo || '-'}</p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-[var(--color-text-muted)] flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> CPF (da compra)
                  </p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {selectedUser.cpf ? formatCPF(selectedUser.cpf) : '— (definido na compra)'}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)] flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Cadastro
                  </p>
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
