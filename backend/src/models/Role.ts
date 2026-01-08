import mongoose, { Document, Schema } from 'mongoose';

export interface IPermissions {
  visualizarAulas: boolean;
  criarAulas: boolean;
  editarAulas: boolean;
  deletarAulas: boolean;
  responderExercicios: boolean;
  criarExercicios: boolean;
  usarForum: boolean;
  moderarForum: boolean;
  acessarAdmin: boolean;
}

export interface IRole extends Document {
  nome: string;
  descricao: string;
  permissoes: IPermissions;
  createdAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    nome: {
      type: String,
      required: [true, 'Nome do cargo é obrigatório'],
      unique: true,
      trim: true
    },
    descricao: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true
    },
    permissoes: {
      visualizarAulas: { type: Boolean, default: false },
      criarAulas: { type: Boolean, default: false },
      editarAulas: { type: Boolean, default: false },
      deletarAulas: { type: Boolean, default: false },
      responderExercicios: { type: Boolean, default: false },
      criarExercicios: { type: Boolean, default: false },
      usarForum: { type: Boolean, default: false },
      moderarForum: { type: Boolean, default: false },
      acessarAdmin: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IRole>('Role', RoleSchema);
