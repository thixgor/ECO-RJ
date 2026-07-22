import mongoose, { Document, Schema } from 'mongoose';

/**
 * Templates de e-mail personalizáveis pelo administrador.
 *
 * - Templates de "sistema" (boas_vindas, compra_curso, termino_curso) são
 *   disparados automaticamente e não podem ser deletados, apenas editados.
 * - Templates "manual" podem ser usados no painel de envio em massa.
 *
 * O corpo é HTML com variáveis no formato {{variavel}}. As variáveis
 * disponíveis para cada template ficam listadas em `variaveis`.
 */
export interface IEmailTemplate extends Document {
  key: string; // Identificador único (ex: 'boas_vindas')
  nome: string; // Nome amigável exibido no painel
  descricao: string;
  assunto: string; // Suporta variáveis {{...}}
  corpoHtml: string; // Corpo em HTML, suporta variáveis {{...}}
  categoria: 'sistema' | 'manual';
  variaveis: string[]; // Variáveis suportadas (ex: ['nome', 'curso'])
  sistema: boolean; // true = não pode ser deletado
  ativo: boolean; // Para templates de sistema, controla se o disparo automático ocorre
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    nome: {
      type: String,
      required: [true, 'Nome do template é obrigatório'],
      trim: true,
      maxlength: [120, 'Nome deve ter no máximo 120 caracteres']
    },
    descricao: {
      type: String,
      default: '',
      trim: true,
      maxlength: [400, 'Descrição deve ter no máximo 400 caracteres']
    },
    assunto: {
      type: String,
      required: [true, 'Assunto é obrigatório'],
      trim: true,
      maxlength: [200, 'Assunto deve ter no máximo 200 caracteres']
    },
    corpoHtml: {
      type: String,
      required: [true, 'Corpo do e-mail é obrigatório']
    },
    categoria: {
      type: String,
      enum: ['sistema', 'manual'],
      default: 'manual'
    },
    variaveis: [{
      type: String,
      trim: true
    }],
    sistema: {
      type: Boolean,
      default: false
    },
    ativo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

EmailTemplateSchema.index({ categoria: 1 });

export default mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
