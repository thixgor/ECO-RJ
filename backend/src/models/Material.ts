import mongoose, { Document, Schema } from 'mongoose';

/**
 * Material / Produto à venda na loja de materiais (/materiais).
 *
 * Um material pode ser:
 *   - 'aula'     : uma ou mais aulas em vídeo (embed) entregues ao comprador
 *   - 'pdf'      : material em PDF (download)
 *   - 'arquivo'  : arquivo genérico para download (zip, imagem, etc.)
 *   - 'conjunto' : um pacote com vários conteúdos misturados (aulas + PDFs + arquivos)
 *
 * Todo material possui uma lista de `conteudos`. O acesso ao material libera
 * TODOS os seus conteúdos ao comprador. Preparado para o Vercel Blob:
 * cada conteúdo de arquivo guarda tanto uma `url` direta quanto uma `blobKey`
 * (chave no Vercel Blob) — o serviço de storage resolve a URL de download.
 */

export type MaterialTipo = 'aula' | 'pdf' | 'arquivo' | 'conjunto';
export type ConteudoTipo = 'aula' | 'pdf' | 'arquivo';

export interface IMaterialConteudo {
  _id?: mongoose.Types.ObjectId;
  tipo: ConteudoTipo;
  titulo: string;
  descricao?: string;
  // Para tipo 'aula'
  embedVideo?: string;
  duracao?: number; // minutos
  // Para 'pdf' / 'arquivo'
  arquivoUrl?: string;   // URL direta (usada enquanto o Vercel Blob não está aplicado)
  blobKey?: string;      // chave no Vercel Blob (futuro)
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
      enum: ['aula', 'pdf', 'arquivo', 'conjunto'],
      required: true,
      default: 'pdf'
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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

MaterialSchema.index({ ativo: 1, disponivel: 1, ordem: 1 });
MaterialSchema.index({ createdAt: -1 });

export default mongoose.model<IMaterial>('Material', MaterialSchema);
