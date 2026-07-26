import mongoose, { Document, Schema } from 'mongoose';

/**
 * Material / Produto à venda na loja de materiais (/materiais).
 *
 * Categoria do PRODUTO (taxonomia da loja):
 *   - 'aula'     : produto focado em aulas em vídeo
 *   - 'material' : material para download (PDFs e/ou arquivos)
 *   - 'conjunto' : pacote misto (aulas + materiais)
 *
 * A distinção PDF vs. arquivo NÃO é de produto — é de CONTEÚDO. Cada item de
 * `conteudos` tem seu próprio tipo (`aula | pdf | arquivo`), que é onde essa
 * diferença importa (anexo de PDF no e-mail, ícone, download).
 *
 * Todo material possui uma lista de `conteudos`. O acesso ao material libera
 * TODOS os seus conteúdos ao comprador. Preparado para o Vercel Blob:
 * cada conteúdo de arquivo guarda tanto uma `url` direta quanto uma `blobKey`
 * (chave no Vercel Blob) — o serviço de storage resolve a URL de download.
 */

export type MaterialTipo = 'aula' | 'material' | 'conjunto';
export type ConteudoTipo = 'aula' | 'pdf' | 'arquivo';

/** Normaliza categorias legadas de produto (pdf/arquivo) para 'material'. */
export function normalizeMaterialTipo(tipo: unknown): MaterialTipo {
  if (tipo === 'aula' || tipo === 'conjunto') return tipo;
  return 'material'; // 'pdf', 'arquivo' (legado) e qualquer outro → 'material'
}

export interface IMaterialConteudo {
  _id?: mongoose.Types.ObjectId;
  tipo: ConteudoTipo;
  titulo: string;
  descricao?: string;
  // Para tipo 'aula'
  embedVideo?: string;
  duracao?: number; // minutos
  // Para 'pdf' / 'arquivo'
  arquivoUrl?: string;   // URL direta externa (fallback/legado — sem blobKey)
  blobKey?: string;      // pathname do blob PRIVADO no Vercel Blob (download por URL assinada)
  nomeArquivo?: string;  // nome de exibição/download
  mimeType?: string;
  tamanhoBytes?: number;
}

export interface IMaterialDescontoAtivado {
  ativo: boolean;
  tipo: 'percentual' | 'fixo';
  valor: number;
}

export interface IMaterial extends Document {
  titulo: string;
  descricao: string;         // descrição completa
  descricaoCurta?: string;   // resumo para o card
  tipo: MaterialTipo;
  capa?: string;             // URL da imagem de capa
  conteudos: IMaterialConteudo[];
  // Venda
  disponivel: boolean;       // à venda na loja
  ativo: boolean;            // visível (soft-delete quando false)
  destaque: boolean;
  ordem: number;
  preco: number;             // BRL
  descontoAtivado: IMaterialDescontoAtivado;
  validadeAcessoDias: number; // 0 = acesso vitalício
  // Métricas
  avaliacaoMedia: number;    // 0-5
  avaliacaoTotal: number;    // nº de avaliações
  vendasTotais: number;
  exibirVendas: boolean;     // exibir "N alunos já garantiram" na vitrine/detalhe
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConteudoSchema = new Schema<IMaterialConteudo>(
  {
    tipo: { type: String, enum: ['aula', 'pdf', 'arquivo'], required: true },
    titulo: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    embedVideo: { type: String, trim: true },
    duracao: { type: Number, min: 0 },
    arquivoUrl: { type: String, trim: true },
    blobKey: { type: String, trim: true },
    nomeArquivo: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    tamanhoBytes: { type: Number, min: 0 }
  },
  { _id: true }
);

const MaterialSchema = new Schema<IMaterial>(
  {
    titulo: { type: String, required: [true, 'Título é obrigatório'], trim: true },
    descricao: { type: String, required: [true, 'Descrição é obrigatória'], trim: true },
    descricaoCurta: { type: String, trim: true },
    tipo: {
      type: String,
      // Aceita valores legados (pdf/arquivo) para não quebrar documentos antigos;
      // a normalização para 'material' acontece na escrita/leitura.
      enum: ['aula', 'material', 'conjunto', 'pdf', 'arquivo'],
      required: true,
      default: 'material'
    },
    capa: { type: String, trim: true },
    conteudos: { type: [ConteudoSchema], default: [] },
    disponivel: { type: Boolean, default: false },
    ativo: { type: Boolean, default: true },
    destaque: { type: Boolean, default: false },
    ordem: { type: Number, default: 0 },
    preco: { type: Number, default: 0, min: 0 },
    descontoAtivado: {
      ativo: { type: Boolean, default: false },
      tipo: { type: String, enum: ['percentual', 'fixo'], default: 'percentual' },
      valor: { type: Number, default: 0, min: 0 }
    },
    validadeAcessoDias: { type: Number, default: 0, min: 0 },
    avaliacaoMedia: { type: Number, default: 0, min: 0, max: 5 },
    avaliacaoTotal: { type: Number, default: 0, min: 0 },
    vendasTotais: { type: Number, default: 0, min: 0 },
    // Prova social opcional: o admin decide se o total de compradores aparece.
    exibirVendas: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

MaterialSchema.index({ ativo: 1, disponivel: 1, ordem: 1 });
MaterialSchema.index({ createdAt: -1 });

export default mongoose.model<IMaterial>('Material', MaterialSchema);
