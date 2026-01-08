import React, { useState } from 'react';
import { User, Mail, CreditCard, Calendar, Stethoscope, Key, Lock, Edit, Check, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService, userService } from '../services/api';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'serial' | 'password'>('info');

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nomeCompleto: user?.nomeCompleto || '',
    especialidade: user?.especialidade || '',
    bio: user?.bio || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Serial key state
  const [serialKey, setSerialKey] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await authService.updateProfile(editData);
      await refreshUser();
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplySerialKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialKey.trim()) {
      toast.error('Digite uma serial key');
      return;
    }

    setIsApplying(true);
    try {
      const response = await userService.applySerialKey(serialKey);
      await refreshUser();
      setSerialKey('');
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aplicar serial key');
    } finally {
      setIsApplying(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      toast.error('As senhas não conferem');
      return;
    }

    if (passwordData.novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(passwordData.senhaAtual, passwordData.novaSenha);
      setPasswordData({ senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      toast.success('Senha alterada com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
            {user?.fotoPerfil ? (
              <img src={user.fotoPerfil} alt="" className="w-24 h-24 rounded-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <User className="w-12 h-12 text-primary-500" />
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">
              {user?.nomeCompleto}
            </h1>
            <p className="text-[var(--color-text-secondary)]">{user?.email}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${user?.cargo === 'Administrador'
                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                : user?.cargo === 'Aluno'
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                  : user?.cargo === 'Instrutor'
                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}>
              {user?.cargo}
            </span>
          </div>
          {!isEditing && (
            <button
              onClick={() => {
                setEditData({
                  nomeCompleto: user?.nomeCompleto || '',
                  especialidade: user?.especialidade || '',
                  bio: user?.bio || ''
                });
                setIsEditing(true);
              }}
              className="btn btn-outline"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
          )}
        </div>
      </div>

      {/* Visitor Alert */}
      {user?.cargo === 'Visitante' && (
        <div className="bg-yellow-50 dark:bg-amber-500/10 border border-yellow-200 dark:border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-amber-400">Acesso Limitado</h3>
            <p className="text-yellow-700 dark:text-amber-300/80 text-sm mt-1">
              Você está como Visitante. Aplique uma serial key abaixo para ter acesso completo às aulas e exercícios.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'info'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              Informações
            </button>
            <button
              onClick={() => setActiveTab('serial')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'serial'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              Serial Key
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'password'
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
            >
              Alterar Senha
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {isEditing ? (
                <>
                  <div>
                    <label className="label">Nome Completo</label>
                    <input
                      type="text"
                      value={editData.nomeCompleto}
                      onChange={(e) => setEditData({ ...editData, nomeCompleto: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Especialidade</label>
                    <input
                      type="text"
                      value={editData.especialidade}
                      onChange={(e) => setEditData({ ...editData, especialidade: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Bio</label>
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      className="input min-h-[100px]"
                      maxLength={500}
                    />
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{editData.bio.length}/500 caracteres</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="btn btn-primary"
                    >
                      <Check className="w-4 h-4" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-outline"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">E-mail</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">CPF</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{formatCPF(user?.cpf || '')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">CRM</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{user?.crm}-{user?.crmLocal}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Data de Nascimento</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {user?.dataNascimento
                          ? new Date(user.dataNascimento).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Especialidade</p>
                      <p className="font-medium text-[var(--color-text-primary)]">{user?.especialidade || 'Não informada'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">Membro desde</p>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {user?.bio && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-[var(--color-text-muted)]">Bio</p>
                      <p className="font-medium mt-1 text-[var(--color-text-primary)]">{user.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Serial Key Tab */}
          {activeTab === 'serial' && (
            <div className="space-y-6">
              <div className="bg-primary-50 dark:bg-primary-500/10 p-4 rounded-lg">
                <h3 className="font-medium text-primary-800 dark:text-primary-300 mb-2">Como funciona?</h3>
                <p className="text-primary-700 dark:text-primary-300/80 text-sm">
                  Insira sua serial key para atualizar seu cargo e ter acesso completo às aulas e exercícios.
                  Cada chave pode ser utilizada apenas uma vez.
                </p>
              </div>

              <form onSubmit={handleApplySerialKey} className="space-y-4">
                <div>
                  <label className="label">Serial Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={serialKey}
                      onChange={(e) => setSerialKey(e.target.value.toUpperCase())}
                      className="input pl-10 font-mono"
                      placeholder="ECO-2025-XXXX"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isApplying}
                  className="btn btn-primary"
                >
                  {isApplying ? 'Validando...' : 'Validar Chave'}
                </button>
              </form>

              {/* History */}
              {user?.serialKeysUsadas && user.serialKeysUsadas.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Histórico de Chaves</h3>
                  <div className="space-y-2">
                    {(user.serialKeysUsadas as any[]).map((key, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg flex justify-between items-center">
                        <span className="font-mono text-sm text-[var(--color-text-primary)]">{key.chave}</span>
                        <span className="text-sm text-[var(--color-text-muted)]">
                          {key.dataUso ? new Date(key.dataUso).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="label">Senha Atual</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.senhaAtual}
                    onChange={(e) => setPasswordData({ ...passwordData, senhaAtual: e.target.value })}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.novaSenha}
                    onChange={(e) => setPasswordData({ ...passwordData, novaSenha: e.target.value })}
                    className="input pl-10"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.confirmarSenha}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmarSenha: e.target.value })}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn btn-primary"
              >
                {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
