import mongoose, { Document, Schema } from 'mongoose';

export interface IReply {
  _id?: mongoose.Types.ObjectId;
  autor: mongoose.Types.ObjectId;
  conteudo: string;
  imagem?: string;
  embedVideo?: string;
  createdAt: Date;
}

export interface IForumTopic extends Document {
  titulo: string;
  conteudo: string;
  autor: mongoose.Types.ObjectId;
  cursoId?: mongoose.Types.ObjectId;
  imagem?: string;
  embedVideo?: string;
  respostas: IReply[];
  fixado: boolean;
  fechado: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema({
  autor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conteudo: {
    type: String,
    required: true
  },
  imagem: {
    type: String
  },
  embedVideo: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ForumTopicSchema = new Schema<IForumTopic>(
  {
    titulo: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true
    },
    conteudo: {
      type: String,
      required: [true, 'Conteúdo é obrigatório']
    },
    autor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Autor é obrigatório']
    },
    cursoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    imagem: {
      type: String
    },
    embedVideo: {
      type: String
    },
    respostas: [ReplySchema],
    fixado: {
      type: Boolean,
      default: false
    },
    fechado: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for searching
ForumTopicSchema.index({ titulo: 'text', conteudo: 'text' });


/*
 * Índices declarados NO SCHEMA de propósito.
 *
 * `createDatabaseIndexes()` (config/database-indexes.ts) só roda dentro de
 * `app.listen`, que nunca é executado na Vercel — em produção a aplicação é
 * serverless. Estes índices, portanto, nunca chegavam ao banco de produção e as
 * consultas abaixo varriam a coleção inteira. Declarados aqui, o Mongoose os
 * cria sozinho no primeiro uso do model, em qualquer forma de hospedagem.
 */
ForumTopicSchema.index({ cursoId: 1, createdAt: -1 });
ForumTopicSchema.index({ autor: 1, createdAt: -1 });
ForumTopicSchema.index({ fixado: -1, createdAt: -1 });

export default mongoose.model<IForumTopic>('ForumTopic', ForumTopicSchema);
