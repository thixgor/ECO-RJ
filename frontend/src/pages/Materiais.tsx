import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Package, Video, Search, Star, ShoppingBag, CheckCircle2, Loader2, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { materialService } from '../services/api';
import type { MaterialListItem, MaterialTipo } from '../types';
import { GlassButton, GlassInput, GlassModal } from '../components/ui';
import { renderBold } from '../utils/richText';

const brl = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const tipoMeta: Record<MaterialTipo, { label: string; icon: React.ReactNode }> = {
  aula: { label: 'Aulas', icon: <Video className="w-4 h-4" /> },
  material: { label: 'Material', icon: <FileText className="w-4 h-4" /> },
  conjunto: { label: 'Conjunto', icon: <Package className="w-4 h-4" /> }
};
// Fallback seguro para categorias legadas (pdf/arquivo) que possam vir do backend
const metaFor = (t: MaterialTipo) => tipoMeta[t] || tipoMeta.material;

const Stars: React.FC<{ value: number; total?: number; size?: number }> = ({ value, total, size = 14 }) => (
  <span className="inline-flex items-center gap-1">
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}
        />
      ))}
    </span>
    {total !== undefined && (
      <span className="text-xs text-[var(--color-text-muted)]">
        {value > 0 ? value.toFixed(1) : '—'}{total > 0 ? ` (${total})` : ''}
      </span>
    )}
  </span>
);

const Materiais: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | MaterialTipo>('todos');
  const [showRecover, setShowRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await materialService.list();
        setMaterials(res.data.materials || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchTipo = tipoFiltro === 'todos' || m.tipo === tipoFiltro;
      const s = search.toLowerCase();
      const matchSearch = m.titulo.toLowerCase().includes(s) || (m.descricaoCurta || '').toLowerCase().includes(s);
      return matchTipo && matchSearch;
    });
  }, [materials, search, tipoFiltro]);

  const tipos: Array<'todos' | MaterialTipo> = ['todos', 'aula', 'material', 'conjunto'];

  const handleRecover = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoverEmail)) {
      return toast.error('Informe um e-mail válido');
    }
    setRecovering(true);
    try {
      const res = await materialService.recover(recoverEmail.trim());
      toast.success(res.data.message || 'Se houver compras, os acessos foram reenviados.');
      setShowRecover(false);
      setRecoverEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao recuperar acesso');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary-500" />
            Materiais
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Aulas, materiais em PDF, arquivos e conjuntos para acelerar seus estudos em ecocardiografia.
          </p>
        </div>
        <button
          onClick={() => setShowRecover(true)}
          className="inline-flex items-center gap-2 text-sm text-primary-500 hover:underline self-start sm:self-auto"
        >
          <HelpCircle className="w-4 h-4" />
          Já comprei e não recebi o e-mail
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar materiais..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-[var(--color-text-primary)] w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tipoFiltro === t
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-[var(--glass-bg)] text-[var(--color-text-secondary)] border-[var(--glass-border)] hover:border-primary-400'
              }`}
            >
              {t === 'todos' ? 'Todos' : (t === 'material' ? 'Materiais' : metaFor(t).label)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-[var(--color-text-primary)] mb-2">
            {search || tipoFiltro !== 'todos' ? 'Nenhum material encontrado' : 'Nenhum material disponível'}
          </h3>
          <p className="text-[var(--color-text-muted)]">
            {search || tipoFiltro !== 'todos' ? 'Tente ajustar os filtros' : 'Em breve teremos novos materiais disponíveis'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((m) => (
            <Link
              key={m._id}
              to={`/materiais/${m._id}`}
              className="card overflow-hidden hover:-translate-y-1 transition-all duration-300 relative flex flex-col"
            >
              {m.adquirido && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ADQUIRIDO
                </div>
              )}
              {m.destaque && !m.adquirido && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  DESTAQUE
                </div>
              )}

              <div className="h-44 bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center">
                {m.capa ? (
                  <img
                    src={m.capa}
                    alt={m.titulo}
                    className="w-full h-full object-cover pointer-events-none select-none"
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                ) : (
                  <div className="text-white/80">{metaFor(m.tipo).icon}</div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
                    {metaFor(m.tipo).icon}
                    {metaFor(m.tipo).label}
                  </span>
                  {m.totalConteudos > 1 && (
                    <span className="text-xs text-[var(--color-text-muted)]">{m.totalConteudos} itens</span>
                  )}
                </div>
                <h3 className="font-heading text-lg font-semibold mb-1 line-clamp-2 text-[var(--color-text-primary)]">
                  {m.titulo}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm mb-3 line-clamp-2 flex-1">
                  {renderBold(m.descricaoCurta)}
                </p>

                <div className="mb-3">
                  <Stars value={m.avaliacaoMedia} total={m.avaliacaoTotal} />
                </div>

                {/* Preço persuasivo */}
                <div className="mt-auto">
                  {m.temDesconto && m.precoOriginal && m.precoOriginal > m.preco && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[var(--color-text-muted)] line-through">
                        {brl(m.precoOriginal)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        -{Math.round((1 - m.preco / m.precoOriginal) * 100)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-end justify-between">
                    <div className="leading-tight">
                      <span className="text-[11px] text-[var(--color-text-muted)] block">
                        {m.adquirido ? 'Você já tem acesso' : 'Por apenas'}
                      </span>
                      <span className="text-2xl font-extrabold text-primary-500">{brl(m.preco)}</span>
                      {m.temDesconto && m.precoOriginal && m.precoOriginal > m.preco && (
                        <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Economize {brl(m.precoOriginal - m.preco)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-primary-500 whitespace-nowrap">
                      {m.adquirido ? 'Acessar →' : 'Quero este →'}
                    </span>
                  </div>
                  {m.vendasTotais > 0 && !m.adquirido && (
                    <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                      🔥 {m.vendasTotais} {m.vendasTotais === 1 ? 'aluno já garantiu' : 'alunos já garantiram'}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal de recuperação de acesso */}
      <GlassModal isOpen={showRecover} onClose={() => setShowRecover(false)} title="Recuperar meus acessos" size="md">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Comprou um material e não recebeu o e-mail? Informe o e-mail usado na compra e
          reenviaremos os links de acesso e os códigos de todos os seus pedidos aprovados.
        </p>
        <GlassInput
          label="E-mail da compra"
          type="email"
          value={recoverEmail}
          onChange={(e) => setRecoverEmail(e.target.value)}
          placeholder="voce@email.com"
        />
        <div className="mt-4 flex justify-end gap-2">
          <GlassButton variant="secondary" onClick={() => setShowRecover(false)}>Cancelar</GlassButton>
          <GlassButton variant="primary" onClick={handleRecover} isLoading={recovering} disabled={recovering}>
            Reenviar acessos
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Materiais;
