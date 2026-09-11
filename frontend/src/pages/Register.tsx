import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, MapPin, Stethoscope, Eye, EyeOff, AlertTriangle, Download, Key, GraduationCap, Building2, Award, Calendar, BadgeCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SearchableSelect from '../components/ui/SearchableSelect';
import {
  ESTADOS,
  ESPECIALIDADES_MEDICAS,
  AREAS_RESIDENCIA,
  ANOS_RESIDENCIA,
  SEMESTRES_RESIDENCIA,
  PERIODOS_ACADEMICOS,
  getFaculdadesByUF,
  getHospitaisByUF,
  OUTRO,
  UF_LIST
} from '../data/cadastroData';
import toast from 'react-hot-toast';
import { materialService } from '../services/api';

// Logos ECO RJ
const LOGO_DARK = 'https://i.imgur.com/qBXnSUD.png';
const LOGO_LIGHT = 'https://i.imgur.com/B1SnAtD.png';

type TipoUsuario = 'Médico' | 'Residente' | 'Acadêmico de Medicina';

interface RecoveryTokenData {
  id: string;
  email: string;
  tokenRecuperacao: string;
}

const withOutro = (list: string[]) => [...list, OUTRO];

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nomeCompleto: '',
    estado: '',
    // Médico
    crm: '',
    crmLocal: '',
    especialidade: '',
    // Residente
    areaResidencia: '',
    hospital: '',
    anoResidencia: '',
    semestreResidencia: '',
    // Acadêmico
    instituicao: '',
    periodo: ''
  });
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario | ''>('');
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
  const location = useLocation();

  const hospitais = useMemo(
    () => (formData.estado ? withOutro(getHospitaisByUF(formData.estado)) : []),
    [formData.estado]
  );
  const faculdades = useMemo(
    () => (formData.estado ? withOutro(getFaculdadesByUF(formData.estado)) : []),
    [formData.estado]
  );

  const setField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'crm') {
      setField('crm', value.replace(/\D/g, ''));
    } else if (name === 'estado') {
      // Ao trocar de estado, limpa hospital/instituição (dependem da UF)
      setFormData((prev) => ({ ...prev, estado: value, hospital: '', instituicao: '' }));
      if (errors.estado) setErrors((prev) => ({ ...prev, estado: '' }));
    } else {
      setField(name, value);
    }
  };

  const handleSelectTipo = (tipo: TipoUsuario) => {
    setTipoUsuario(tipo);
    // Limpa campos específicos de outros tipos ao trocar
    setFormData((prev) => ({
      ...prev,
      crm: '',
      crmLocal: '',
      especialidade: '',
      areaResidencia: '',
      hospital: '',
      anoResidencia: '',
      semestreResidencia: '',
      instituicao: '',
      periodo: ''
    }));
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.estado || !UF_LIST.includes(formData.estado)) {
      newErrors.estado = 'Selecione seu estado';
    }

    if (!tipoUsuario) {
      newErrors.tipoUsuario = 'Selecione o tipo de perfil';
    }

    if (!formData.nomeCompleto.trim()) {
      newErrors.nomeCompleto = 'Nome completo é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não conferem';
    }

    // Campos específicos por tipo
    if (tipoUsuario === 'Médico') {
      if (!formData.especialidade.trim()) newErrors.especialidade = 'Selecione a especialidade';
      if (!formData.crm.trim()) newErrors.crm = 'CRM é obrigatório';
      else if (formData.crm.replace(/\D/g, '').length < 4) newErrors.crm = 'CRM inválido';
    } else if (tipoUsuario === 'Residente') {
      if (!formData.areaResidencia.trim()) newErrors.areaResidencia = 'Selecione a área da residência';
      if (!formData.hospital.trim()) newErrors.hospital = 'Selecione o hospital';
      if (!formData.anoResidencia.trim()) newErrors.anoResidencia = 'Selecione o ano da residência';
    } else if (tipoUsuario === 'Acadêmico de Medicina') {
      if (!formData.instituicao.trim()) newErrors.instituicao = 'Selecione a instituição';
      if (!formData.periodo.trim()) newErrors.periodo = 'Selecione o período';
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
      const payload: any = {
        email: formData.email,
        password: formData.password,
        nomeCompleto: formData.nomeCompleto,
        estado: formData.estado,
        tipoUsuario
      };

      if (tipoUsuario === 'Médico') {
        payload.especialidade = formData.especialidade;
        payload.crm = formData.crm;
        payload.crmLocal = formData.crmLocal || formData.estado;
      } else if (tipoUsuario === 'Residente') {
        payload.areaResidencia = formData.areaResidencia;
        payload.hospital = formData.hospital;
        payload.anoResidencia = formData.anoResidencia;
        payload.semestreResidencia = formData.semestreResidencia || undefined;
      } else if (tipoUsuario === 'Acadêmico de Medicina') {
        payload.instituicao = formData.instituicao;
        payload.periodo = formData.periodo;
      }

      const result = await register(payload);

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

  const handleCloseModal = async () => {
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }
    setShowTokenModal(false);

    // Vincula um material comprado como convidado (se houver token pendente)
    const pendingMaterial = sessionStorage.getItem('pendingMaterialToken');
    if (pendingMaterial) {
      sessionStorage.removeItem('pendingMaterialToken');
      try {
        await materialService.claim(pendingMaterial);
        toast.success('Material vinculado à sua conta!');
      } catch { /* segue o fluxo normal mesmo se falhar */ }
      navigate('/perfil?tab=materiais');
      return;
    }

    const pendingKey = sessionStorage.getItem('pendingSerialKey');
    if (pendingKey) {
      sessionStorage.removeItem('pendingSerialKey');
      navigate(`/ativar?codigo=${pendingKey}`);
    } else {
      // Volta para a página que exigiu o cadastro (ex.: checkout), como no login
      navigate((location.state as any)?.from?.pathname || '/dashboard');
    }
  };

  const tipoOptions: { tipo: TipoUsuario; icon: React.ReactNode; desc: string }[] = [
    { tipo: 'Médico', icon: <Stethoscope className="w-6 h-6" />, desc: 'CRM e especialidade' },
    { tipo: 'Residente', icon: <BadgeCheck className="w-6 h-6" />, desc: 'Área, hospital e ano' },
    { tipo: 'Acadêmico de Medicina', icon: <GraduationCap className="w-6 h-6" />, desc: 'Instituição e período' }
  ];

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
            {/* 1) ESTADO (antes de tudo) */}
            <div>
              <label htmlFor="estado" className="label">Estado *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.estado ? 'input-error' : ''}`}
                >
                  <option value="">Selecione seu estado</option>
                  {ESTADOS.map((e) => (
                    <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>
                  ))}
                </select>
              </div>
              {errors.estado && <p className="error-message">{errors.estado}</p>}
            </div>

            {/* 2) TIPO DE PERFIL */}
            <div>
              <label className="label">Você é: *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {tipoOptions.map(({ tipo, icon, desc }) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleSelectTipo(tipo)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      tipoUsuario === tipo
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                        : 'border-[var(--glass-border)] hover:border-primary-300 text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <div className="flex justify-center mb-2">{icon}</div>
                    <div className="font-medium text-sm text-[var(--color-text-primary)]">{tipo}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
              {errors.tipoUsuario && <p className="error-message">{errors.tipoUsuario}</p>}
            </div>

            {/* 3) CAMPOS ESPECÍFICOS */}
            {tipoUsuario === 'Médico' && (
              <div className="space-y-6 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] animate-fade-in">
                <div>
                  <label className="label flex items-center gap-1"><Award className="w-4 h-4" /> Especialidade *</label>
                  <SearchableSelect
                    options={withOutro(ESPECIALIDADES_MEDICAS)}
                    value={formData.especialidade}
                    onChange={(v) => setField('especialidade', v)}
                    placeholder="Selecione a especialidade"
                    otherLabel={OUTRO}
                    otherPlaceholder="Digite sua especialidade"
                    error={!!errors.especialidade}
                  />
                  {errors.especialidade && <p className="error-message">{errors.especialidade}</p>}
                </div>
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
                    <label htmlFor="crmLocal" className="label">UF do CRM *</label>
                    <select
                      id="crmLocal"
                      name="crmLocal"
                      value={formData.crmLocal || formData.estado}
                      onChange={handleChange}
                      className="input"
                    >
                      {UF_LIST.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {tipoUsuario === 'Residente' && (
              <div className="space-y-6 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] animate-fade-in">
                <div>
                  <label className="label flex items-center gap-1"><Award className="w-4 h-4" /> Área da Residência *</label>
                  <SearchableSelect
                    options={withOutro(AREAS_RESIDENCIA)}
                    value={formData.areaResidencia}
                    onChange={(v) => setField('areaResidencia', v)}
                    placeholder="Selecione a área"
                    otherLabel={OUTRO}
                    otherPlaceholder="Digite a área da residência"
                    error={!!errors.areaResidencia}
                  />
                  {errors.areaResidencia && <p className="error-message">{errors.areaResidencia}</p>}
                </div>
                <div>
                  <label className="label flex items-center gap-1"><Building2 className="w-4 h-4" /> Hospital *</label>
                  <SearchableSelect
                    options={hospitais}
                    value={formData.hospital}
                    onChange={(v) => setField('hospital', v)}
                    placeholder={formData.estado ? 'Selecione o hospital' : 'Selecione o estado primeiro'}
                    otherLabel={OUTRO}
                    otherPlaceholder="Digite o nome do hospital"
                    disabled={!formData.estado}
                    error={!!errors.hospital}
                  />
                  {errors.hospital && <p className="error-message">{errors.hospital}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="anoResidencia" className="label">Ano da Residência *</label>
                    <select
                      id="anoResidencia"
                      name="anoResidencia"
                      value={formData.anoResidencia}
                      onChange={handleChange}
                      className={`input ${errors.anoResidencia ? 'input-error' : ''}`}
                    >
                      <option value="">Selecione</option>
                      {ANOS_RESIDENCIA.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    {errors.anoResidencia && <p className="error-message">{errors.anoResidencia}</p>}
                  </div>
                  <div>
                    <label htmlFor="semestreResidencia" className="label">Semestre atual</label>
                    <select
                      id="semestreResidencia"
                      name="semestreResidencia"
                      value={formData.semestreResidencia}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="">Selecione</option>
                      {SEMESTRES_RESIDENCIA.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {tipoUsuario === 'Acadêmico de Medicina' && (
              <div className="space-y-6 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--glass-border)] animate-fade-in">
                <div>
                  <label className="label flex items-center gap-1"><Building2 className="w-4 h-4" /> Instituição de Ensino *</label>
                  <SearchableSelect
                    options={faculdades}
                    value={formData.instituicao}
                    onChange={(v) => setField('instituicao', v)}
                    placeholder={formData.estado ? 'Selecione a instituição' : 'Selecione o estado primeiro'}
                    otherLabel={OUTRO}
                    otherPlaceholder="Digite o nome da instituição"
                    disabled={!formData.estado}
                    error={!!errors.instituicao}
                  />
                  {errors.instituicao && <p className="error-message">{errors.instituicao}</p>}
                </div>
                <div>
                  <label htmlFor="periodo" className="label flex items-center gap-1"><Calendar className="w-4 h-4" /> Período *</label>
                  <select
                    id="periodo"
                    name="periodo"
                    value={formData.periodo}
                    onChange={handleChange}
                    className={`input ${errors.periodo ? 'input-error' : ''}`}
                  >
                    <option value="">Selecione o período</option>
                    {PERIODOS_ACADEMICOS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {errors.periodo && <p className="error-message">{errors.periodo}</p>}
                </div>
              </div>
            )}

            {/* 4) DADOS DA CONTA */}
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl animate-slide-up overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-6 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Token de Recuperação</h2>
                  <p className="text-white/80 text-xs sm:text-sm">Guarde este token em local seguro</p>
                </div>
              </div>
            </div>

            {/* Content - scrollable */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
              {/* Warning */}
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-400 mb-1 text-sm sm:text-base">⚠️ ATENÇÃO:</p>
                    <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm leading-relaxed">
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
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">ID da Conta:</span>
                  <code className="text-xs sm:text-sm font-mono bg-gray-200 dark:bg-white/10 px-2 py-1 rounded truncate">
                    {recoveryData.id}
                  </code>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">E-mail:</span>
                  <span className="text-xs sm:text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {recoveryData.email}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-white/10 pt-2 sm:pt-3">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 block mb-2">Token de Recuperação:</span>
                  <code className="block w-full text-center text-base sm:text-lg font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 sm:px-3 py-2 sm:py-3 rounded-lg break-all font-bold tracking-wider">
                    {recoveryData.tokenRecuperacao}
                  </code>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadToken}
                className="btn btn-primary w-full py-2.5 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Baixar Token (.txt)
              </button>

              {/* Close Button */}
              {!confirmClose ? (
                <button
                  onClick={handleCloseModal}
                  className="btn btn-outline w-full py-2.5 sm:py-3 text-sm sm:text-base"
                >
                  Já salvei meu token, continuar
                </button>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 sm:p-4">
                  <p className="text-amber-700 dark:text-amber-400 text-xs sm:text-sm mb-3 text-center font-medium">
                    Tem certeza? Este token <strong>NUNCA</strong> mais será exibido!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClose(false)}
                      className="btn btn-outline flex-1 text-sm"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="btn btn-primary flex-1 text-sm"
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
