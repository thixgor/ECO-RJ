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

export default mongoose.model<IForumTopic>('ForumTopic', ForumTopicSchema);
