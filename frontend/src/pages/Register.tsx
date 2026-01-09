import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CreditCard, MapPin, Calendar, Stethoscope, Eye, EyeOff, AlertTriangle, Download, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

// Logos ECO RJ
const LOGO_DARK = 'https://i.imgur.com/qBXnSUD.png';
const LOGO_LIGHT = 'https://i.imgur.com/B1SnAtD.png';

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface RecoveryTokenData {
  id: string;
  email: string;
  tokenRecuperacao: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nomeCompleto: '',
    cpf: '',
    crm: '',
    crmLocal: 'RJ',
    dataNascimento: '',
    especialidade: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal de token de recuperação
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<RecoveryTokenData | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const { register } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, cpf: formatCPF(value) }));
    } else if (name === 'crm') {
      // Permitir apenas números no CRM
      const numbers = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, crm: numbers }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome completo é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = 'CPF deve ter 11 dígitos';
    }

    if (!formData.crm.trim()) {
      newErrors.crm = 'CRM é obrigatório';
    }

    if (!formData.dataNascimento) {
      newErrors.dataNascimento = 'Data de nascimento é obrigatória';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não conferem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        nomeCompleto: formData.nomeCompleto,
        cpf: formData.cpf,
        crm: formData.crm,
        crmLocal: formData.crmLocal,
        dataNascimento: formData.dataNascimento,
        especialidade: formData.especialidade || undefined
      });

      // Exibir modal com token de recuperação
      setRecoveryData({
        id: result.id,
        email: result.email,
        tokenRecuperacao: result.tokenRecuperacao
      });
      setShowTokenModal(true);
      toast.success('Conta criada com sucesso!');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao criar conta';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadToken = () => {
    if (!recoveryData) return;

    const content = `===========================================
ECO RJ - TOKEN DE RECUPERAÇÃO DE CONTA
===========================================

⚠️ GUARDE ESTE ARQUIVO EM LOCAL SEGURO!
Este token é a ÚNICA forma de recuperar sua conta
caso você perca sua senha.

-------------------------------------------
ID da Conta: ${recoveryData.id}
E-mail: ${recoveryData.email}
Token de Recuperação: ${recoveryData.tokenRecuperacao}
-------------------------------------------

Data de criação: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

===========================================
NÃO COMPARTILHE ESTE TOKEN COM NINGUÉM!
===========================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ECO-RJ-Token-Recuperacao-${recoveryData.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Token baixado com sucesso!');
  };

  const handleCloseModal = () => {
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }
    setShowTokenModal(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen py-12 px-4 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={isDark ? LOGO_DARK : LOGO_LIGHT}
              alt="ECO RJ"
              className="h-16 w-auto drop-shadow-lg select-none pointer-events-none"
              loading="lazy"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Crie sua conta
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Preencha seus dados para começar
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome Completo */}
            <div>
              <label htmlFor="nomeCompleto" className="label">Nome Completo *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="nomeCompleto"
                  name="nomeCompleto"
                  type="text"
                  value={formData.nomeCompleto}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.nomeCompleto ? 'input-error' : ''}`}
                  placeholder="Seu nome completo"
                />
              </div>
              {errors.nomeCompleto && <p className="error-message">{errors.nomeCompleto}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">E-mail *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && <p className="error-message">{errors.email}</p>}
            </div>

            {/* CPF */}
            <div>
              <label htmlFor="cpf" className="label">CPF *</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  value={formData.cpf}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.cpf ? 'input-error' : ''}`}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              {errors.cpf && <p className="error-message">{errors.cpf}</p>}
            </div>

            {/* CRM */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="crm" className="label">
                  Número do CRM *
                  <span className="text-xs text-gray-500 font-normal ml-1">(apenas números)</span>
                </label>
                <input
                  id="crm"
                  name="crm"
                  type="text"
                  inputMode="numeric"
                  value={formData.crm}
                  onChange={handleChange}
                  className={`input ${errors.crm ? 'input-error' : ''}`}
                  placeholder="123456"
                />
                {errors.crm && <p className="error-message">{errors.crm}</p>}
              </div>
              <div>
                <label htmlFor="crmLocal" className="label">
                  Estado (UF) *
                  <span className="text-xs text-gray-500 font-normal ml-1">(onde o CRM foi emitido)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="crmLocal"
                    name="crmLocal"
                    value={formData.crmLocal}
                    onChange={handleChange}
                    className="input pl-10"
                  >
                    {UF_OPTIONS.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label htmlFor="dataNascimento" className="label">Data de Nascimento *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="dataNascimento"
                  name="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.dataNascimento ? 'input-error' : ''}`}
                />
              </div>
              {errors.dataNascimento && <p className="error-message">{errors.dataNascimento}</p>}
            </div>

            {/* Especialidade */}
            <div>
              <label htmlFor="especialidade" className="label">Especialidade (opcional)</label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="especialidade"
                  name="especialidade"
                  type="text"
                  value={formData.especialidade}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Ex: Cardiologia"
                />
              </div>
            </div>

            {/* Senhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="label">Senha *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="error-message">{errors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="label">Confirmar Senha *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Repita a senha"
                  />
                </div>
                {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms */}
            <p className="text-sm text-gray-500">
              Ao criar uma conta, você concorda com nossos{' '}
              <Link to="/termos" className="link">Termos de Serviço</Link> e{' '}
              <Link to="/privacidade" className="link">Política de Privacidade</Link>.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3 text-lg"
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Já tem uma conta?{' '}
              <Link to="/login" className="link font-medium">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Token de Recuperação */}
      {showTokenModal && recoveryData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Token de Recuperação</h2>
                  <p className="text-white/80 text-sm">Guarde este token em local seguro</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-400 mb-1">⚠️ ATENÇÃO:</p>
                    <p className="text-red-600 dark:text-red-400 text-sm leading-relaxed">
                      Este token é a <strong>ÚNICA</strong> forma de recuperar sua conta caso você perca sua senha.
                      <br /><br />
                      <strong>Após fechar este modal, ele nunca mais será exibido novamente.</strong>
                      <br /><br />
                      Recomendamos fortemente que você <strong>baixe e guarde o arquivo .TXT</strong> em um local seguro.
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">ID da Conta:</span>
                  <code className="text-sm font-mono bg-gray-200 dark:bg-white/10 px-2 py-1 rounded">
                    {recoveryData.id}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">E-mail:</span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {recoveryData.email}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-white/10 pt-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Token de Recuperação:</span>
                  <code className="block w-full text-center text-lg font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-3 rounded-lg break-all font-bold tracking-wider">
                    {recoveryData.tokenRecuperacao}
                  </code>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadToken}
                className="btn btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar Token (.txt)
              </button>

              {/* Close Button */}
              {!confirmClose ? (
                <button
                  onClick={handleCloseModal}
                  className="btn btn-outline w-full py-3"
                >
                  Já salvei meu token, continuar
                </button>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                  <p className="text-amber-700 dark:text-amber-400 text-sm mb-3 text-center font-medium">
                    Tem certeza? Este token <strong>NUNCA</strong> mais será exibido!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClose(false)}
                      className="btn btn-outline flex-1"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="btn btn-primary flex-1"
                    >
                      Confirmar e Continuar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

