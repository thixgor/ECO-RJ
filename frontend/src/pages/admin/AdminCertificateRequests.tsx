import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle, Clock, Trash2, BookOpen, User as UserIcon, AlertTriangle } from 'lucide-react';
import { certificateRequestService, courseService } from '../../services/api';
import { Course } from '../../types';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

interface CertificateRequest {
  _id: string;
  alunoId: {
    _id: string;
    nomeCompleto: string;
    email: string;
    fotoPerfil?: string;
  };
  cursoId: {
    _id: string;
    titulo: string;
  };
  dataSolicitacao: string;
  status: 'pendente' | 'aprovado' | 'recusado';
  dataResposta?: string;
  respondidoPor?: {
    _id: string;
    nomeCompleto: string;
  };
  motivoRecusa?: string;
  certificadoId?: string;
}

const AdminCertificateRequests: React.FC = () => {
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourseId, setFilterCourseId] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CertificateRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadData();
  }, [filterStatus, filterCourseId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requestsResponse, statsResponse, coursesResponse] = await Promise.all([
        certificateRequestService.getAll({
          status: filterStatus || undefined,
          cursoId: filterCourseId || undefined
        }),
        certificateRequestService.getStats(),
        courseService.getAll()
      ]);
      setRequests(requestsResponse.data.requests);
      setStats(statsResponse.data);
      setCourses(coursesResponse.data.courses || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar solicitacoes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await certificateRequestService.approve(id);
      toast.success('Solicitacao aprovada e certificado gerado!');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao aprovar solicitacao');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (request: CertificateRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest._id);
    try {
      await certificateRequestService.reject(selectedRequest._id, rejectReason);
      toast.success('Solicitacao recusada');
      setShowRejectModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao recusar solicitacao');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitacao?')) return;

    try {
      await certificateRequestService.delete(id);
      toast.success('Solicitacao excluida');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao excluir');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case 'aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </span>
        );
      case 'recusado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Recusado
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)]">
            Solicitacoes de Certificado
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Gerencie as solicitacoes de certificado dos alunos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Pendentes</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pendentes}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Aprovadas</p>
                <p className="text-xl font-bold text-green-600">{stats.aprovados}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Recusadas</p>
                <p className="text-xl font-bold text-red-600">{stats.recusados}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Total</p>
                <p className="text-xl font-bold text-primary-600">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Filtrar por Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-full"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovadas</option>
              <option value="recusado">Recusadas</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Filtrar por Curso
            </label>
            <select
              value={filterCourseId}
              onChange={(e) => setFilterCourseId(e.target.value)}
              className="input w-full"
            >
              <option value="">Todos os cursos</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="card overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-[var(--color-text-muted)]">
              Nenhuma solicitacao encontrada
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Aluno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Data Solicitacao
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {requests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {request.alunoId.fotoPerfil ? (
                          <img
                            src={request.alunoId.fotoPerfil}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-primary-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {request.alunoId.nomeCompleto}
                          </p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {request.alunoId.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary-500" />
                        <span className="text-[var(--color-text-primary)]">
                          {request.cursoId.titulo}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                      {formatDate(request.dataSolicitacao)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                      {request.motivoRecusa && (
                        <p className="text-xs text-red-500 mt-1">
                          {request.motivoRecusa}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {request.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => handleApprove(request._id)}
                              disabled={processingId === request._id}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
                              title="Aprovar"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              disabled={processingId === request._id}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Recusar"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(request._id)}
                          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Recusar Solicitacao
              </h3>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-4">
              Voce esta prestes a recusar a solicitacao de certificado de{' '}
              <strong>{selectedRequest.alunoId.nomeCompleto}</strong> para o curso{' '}
              <strong>{selectedRequest.cursoId.titulo}</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Motivo da recusa (opcional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Informe o motivo da recusa..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === selectedRequest._id}
                className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                {processingId === selectedRequest._id ? 'Recusando...' : 'Recusar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificateRequests;
