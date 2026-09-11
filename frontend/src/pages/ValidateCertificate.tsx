import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Award, Search, CheckCircle, XCircle, Calendar, Clock, User, BookOpen, ArrowLeft } from 'lucide-react';
import { certificateService } from '../services/api';
import { CertificateValidationResult } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// Logos ECO RJ
const LOGO_DARK = 'https://i.imgur.com/qBXnSUD.png';
const LOGO_LIGHT = 'https://i.imgur.com/B1SnAtD.png';

const ValidateCertificate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<CertificateValidationResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Validate on load if code is provided in URL
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode);
      handleValidate(urlCode);
    }
  }, []);

  const handleValidate = async (codeToValidate?: string) => {
    const validationCode = codeToValidate || code;
    if (!validationCode.trim()) return;

    setIsValidating(true);
    setHasSearched(true);
    try {
      const response = await certificateService.validate(validationCode.trim());
      setResult(response.data);
    } catch (error) {
      setResult({
        valid: false,
        message: 'Erro ao validar certificado. Tente novamente.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0 horas';
    if (hours < 1) return `${Math.round(hours * 60)} minutos`;
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img
              src={isDark ? LOGO_DARK : LOGO_LIGHT}
              alt="ECO RJ"
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
              <p className="font-heading font-bold text-[var(--color-text-primary)]">ECO RJ</p>
              <p className="text-xs text-[var(--color-text-muted)]">Centro de Treinamento em Ecocardiografia</p>
            </div>
          </Link>
          <Link to="/" className="btn btn-outline text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
            <Award className="w-10 h-10 text-primary-500" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Validar Certificado
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Insira o codigo de validacao para verificar a autenticidade do certificado
          </p>
        </div>

        {/* Search Form */}
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Código de Validação</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toLowerCase())}
                  className="input pl-10 font-mono text-sm"
                  placeholder="Digite o código SHA-256 do certificado"
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isValidating || !code.trim()}
              className="btn btn-primary w-full"
            >
              {isValidating ? 'Validando...' : 'Validar Certificado'}
            </button>
          </form>
        </div>

        {/* Result */}
        {hasSearched && result && (
          <div className={`card p-6 border-2 ${
            result.valid
              ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
              : 'border-red-500 bg-red-50 dark:bg-red-500/10'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              {result.valid ? (
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              )}
              <div>
                <h2 className={`text-2xl font-bold ${
                  result.valid
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  {result.valid ? 'Certificado Valido' : 'Certificado Invalido'}
                </h2>
                <p className={`${
                  result.valid
                    ? 'text-green-600 dark:text-green-400/80'
                    : 'text-red-600 dark:text-red-400/80'
                }`}>
                  {result.valid
                    ? 'Este certificado e autentico e foi emitido pelo ECO RJ'
                    : result.message || 'Certificado nao encontrado ou invalido'
                  }
                </p>
              </div>
            </div>

            {result.valid && result.data && (
              <div className="mt-6 space-y-4 border-t border-green-200 dark:border-green-500/30 pt-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400/80">Nome do Aluno</p>
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      {result.data.nomeAluno}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400/80">Curso</p>
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      {result.data.nomeCurso}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400/80">Carga Horaria</p>
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      {formatHours(result.data.cargaHoraria)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400/80">Data de Emissao</p>
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      {formatDate(result.data.dataEmissao)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
          <p>O código de validação pode ser encontrado no certificado impresso ou no PDF.</p>
          <p className="mt-1">O código é um hash SHA-256 de 64 caracteres hexadecimais.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-[var(--color-text-muted)]">
          <p>© {new Date().getFullYear()} ECO RJ - Centro de Treinamento em Ecocardiografia</p>
          <p className="mt-1">CNPJ: 21.847.609/0001-70</p>
        </div>
      </footer>
    </div>
  );
};

export default ValidateCertificate;
