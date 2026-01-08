import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CreditCard, MapPin, Calendar, Stethoscope, Eye, EyeOff } from 'lucide-react';
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
      await register({
        email: formData.email,
        password: formData.password,
        nomeCompleto: formData.nomeCompleto,
        cpf: formData.cpf,
        crm: formData.crm,
        crmLocal: formData.crmLocal,
        dataNascimento: formData.dataNascimento,
        especialidade: formData.especialidade || undefined
      });
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao criar conta';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
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
    </div>
  );
};

export default Register;
