import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Star, Loader2, ArrowLeft, Video, FileText, File, Package,
  CheckCircle2, ShieldCheck, Clock, Lock, MessageSquare, Gift
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, GlassButton, GlassTextarea } from '../components/ui';
import MaterialContentViewer from '../components/materials/MaterialContentViewer';
import { renderBold } from '../utils/richText';
import { materialService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { MaterialDetalhe, MaterialReview, MaterialTipo } from '../types';
import { brl, formatPreco, isGratuito } from '../utils/price';

const tipoIcon: Record<MaterialTipo, React.ReactNode> = {
  aula: <Video className="w-4 h-4" />,
  material: <FileText className="w-4 h-4" />,
  conjunto: <Package className="w-4 h-4" />
};
const tipoLabel: Record<MaterialTipo, string> = { aula: 'Aulas', material: 'Material', conjunto: 'Conjunto' };
// Fallback seguro para categorias legadas
const tipoIconFor = (t: MaterialTipo) => tipoIcon[t] || <File className="w-4 h-4" />;
const tipoLabelFor = (t: MaterialTipo) => tipoLabel[t] || 'Material';

const StarPicker: React.FC<{ value: number; onChange?: (n: number) => void; size?: number; readOnly?: boolean }> = ({
  value, onChange, size = 20, readOnly
}) => {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(i)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(i)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star
            style={{ width: size, height: size }}
            className={i <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
          />
        </button>
      ))}
    </span>
  );
};

const MaterialDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [material, setMaterial] = useState<MaterialDetalhe | null>(null);
  const [temAcesso, setTemAcesso] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<MaterialReview[]>([]);
  const [resumo, setResumo] = useState<{ media: number; total: number }>({ media: 0, total: 0 });

  // Formulário de avaliação
  const [minhaNota, setMinhaNota] = useState(0);
  const [meuComentario, setMeuComentario] = useState('');
  const [enviandoReview, setEnviandoReview] = useState(false);

  const loadReviews = async (materialId: string) => {
    try {
      const res = await materialService.getReviews(materialId);
      setReviews(res.data.reviews || []);
      setResumo(res.data.resumo || { media: 0, total: 0 });
    } catch { /* noop */ }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await materialService.getById(id);
        setMaterial(res.data.material);
        setTemAcesso(res.data.temAcesso);
        await loadReviews(id);
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.error('Material não encontrado');
          navigate('/materiais');
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEnviarReview = async () => {
    if (!id) return;
    if (minhaNota < 1) return toast.error('Selecione uma nota de 1 a 5 estrelas');
    setEnviandoReview(true);
    try {
      await materialService.review(id, { nota: minhaNota, comentario: meuComentario.trim() || undefined });
      toast.success('Avaliação registrada. Obrigado!');
      setMeuComentario('');
      setMinhaNota(0);
      await loadReviews(id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível registrar sua avaliação');
    } finally {
      setEnviandoReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }
  if (!material) return null;

  const gratuito = isGratuito(material.preco);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/materiais" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-primary-500 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar aos materiais
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="overflow-hidden">
            <div className="h-56 bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center">
              {material.capa ? (
                <img src={material.capa} alt={material.titulo} className="w-full h-full object-cover select-none" onContextMenu={(e) => e.preventDefault()} />
              ) : (
                <div className="text-white/80 scale-[3]">{tipoIconFor(material.tipo)}</div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  {tipoIconFor(material.tipo)} {tipoLabelFor(material.tipo)}
                </span>
                <StarPicker value={Math.round(resumo.media)} readOnly size={16} />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {resumo.media > 0 ? `${resumo.media.toFixed(1)} · ${resumo.total} avaliações` : 'Sem avaliações'}
                </span>
              </div>
              <h1 className="text-2xl font-heading font-bold mb-3 text-[var(--color-text-primary)]">{material.titulo}</h1>
              <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{renderBold(material.descricao)}</p>
            </div>
          </GlassCard>

          {/* Conteúdo — liberado se possui acesso */}
          <GlassCard className="p-6">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              {temAcesso ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />}
              {temAcesso ? 'Seu material' : `Conteúdo (${material.totalConteudos} ${material.totalConteudos === 1 ? 'item' : 'itens'})`}
            </h2>

            {temAcesso ? (
              <MaterialContentViewer
                conteudos={material.conteudos}
                identity={{ nome: user?.nomeCompleto, cpf: user?.cpf, email: user?.email }}
              />
            ) : (
              <div className="space-y-2">
                {material.conteudos.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                    <span className="text-primary-500">
                      {c.tipo === 'aula' ? <Video className="w-4 h-4" /> : c.tipo === 'pdf' ? <FileText className="w-4 h-4" /> : <File className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{c.titulo}</p>
                      {c.descricao && <p className="text-xs text-[var(--color-text-muted)] truncate">{renderBold(c.descricao)}</p>}
                    </div>
                    {typeof c.duracao === 'number' && c.duracao > 0 && (
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {c.duracao} min
                      </span>
                    )}
                    <Lock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  </div>
                ))}
                <p className="text-xs text-[var(--color-text-muted)] pt-2">
                  🔒 O conteúdo é liberado após a compra.
                </p>
              </div>
            )}
          </GlassCard>

          {/* Avaliações */}
          <GlassCard className="p-6">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" /> Avaliações
            </h2>

            {temAcesso && (
              <div className="mb-6 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <p className="text-sm font-medium mb-2 text-[var(--color-text-primary)]">Deixe sua avaliação</p>
                <StarPicker value={minhaNota} onChange={setMinhaNota} />
                <GlassTextarea
                  className="mt-3"
                  rows={3}
                  placeholder="Conte o que achou deste material (opcional)"
                  value={meuComentario}
                  onChange={(e) => setMeuComentario(e.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <GlassButton variant="primary" onClick={handleEnviarReview} isLoading={enviandoReview} disabled={enviandoReview}>
                    Enviar avaliação
                  </GlassButton>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Este material ainda não possui avaliações.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r._id} className="pb-4 border-b border-[var(--glass-border)] last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-[var(--color-text-primary)]">{r.autorNome}</span>
                      <StarPicker value={r.nota} readOnly size={14} />
                    </div>
                    {r.comentario && <p className="text-sm text-[var(--color-text-secondary)]">{r.comentario}</p>}
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Coluna lateral — compra */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 lg:sticky lg:top-6">
            {temAcesso ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-1">Você já tem este material</h3>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">Acesse o conteúdo ao lado a qualquer momento.</p>
                {!isAuthenticated && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Dica: crie uma conta com o mesmo e-mail da compra para salvar em "Meus Materiais".
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  {material.temDesconto && material.precoOriginal && (
                    <span className="block text-sm text-[var(--color-text-muted)] line-through">{brl(material.precoOriginal)}</span>
                  )}
                  <span className={`text-3xl font-bold ${gratuito ? 'text-emerald-500' : 'text-primary-500'}`}>
                    {formatPreco(material.preco)}
                  </span>
                  {material.validadeAcessoDias > 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Acesso por {material.validadeAcessoDias} dias</p>
                  ) : (
                    <p className="text-xs text-emerald-500 mt-1 font-medium">Acesso vitalício</p>
                  )}
                </div>

                <Link to={`/materiais/comprar/${material._id}`}>
                  <GlassButton
                    variant="primary"
                    fullWidth
                    size="lg"
                    leftIcon={gratuito ? <Gift className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                  >
                    {gratuito ? 'Obter grátis' : 'Comprar agora'}
                  </GlassButton>
                </Link>

                {/* Prova social — exibida somente se o admin habilitou no material */}
                {!!material.vendasTotais && material.vendasTotais > 0 && (
                  <p className="mt-3 text-xs text-center text-[var(--color-text-muted)]">
                    🔥 {material.vendasTotais} {material.vendasTotais === 1 ? 'aluno já garantiu' : 'alunos já garantiram'} este material
                  </p>
                )}

                <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-secondary)]">
                  {gratuito ? (
                    <li className="flex items-center gap-2"><Gift className="w-4 h-4 text-emerald-500" /> Material gratuito — nenhum pagamento necessário</li>
                  ) : (
                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Pagamento seguro via Mercado Pago</li>
                  )}
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {gratuito ? 'Acesso imediato' : 'Acesso imediato após aprovação'}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {gratuito ? 'Disponível com ou sem conta' : 'Compre com ou sem conta'}</li>
                </ul>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default MaterialDetail;
