import mongoose, { Document, Schema } from 'mongoose';

export type AnnouncementType = 'geral' | 'alunos' | 'curso_especifico';

export interface IAnnouncement extends Document {
  titulo: string;
  conteudo: string;
  tipo: AnnouncementType;
  cursosAlvo: mongoose.Types.ObjectId[]; // Usado apenas quando tipo = 'curso_especifico'
  criadoPor: mongoose.Types.ObjectId;
  ativo: boolean; // Para ocultar/exibir avisos
  prioridade: 'baixa' | 'normal' | 'alta';
  dataExpiracao?: Date; // Opcional: aviso expira automaticamente
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    titulo: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true,
      maxlength: [200, 'Título deve ter no máximo 200 caracteres']
    },
    conteudo: {
      type: String,
      required: [true, 'Conteúdo é obrigatório'],
      trim: true
    },
    tipo: {
      type: String,
      enum: ['geral', 'alunos', 'curso_especifico'],
      required: [true, 'Tipo de aviso é obrigatório'],
      default: 'geral'
    },
    cursosAlvo: [{
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }],
    criadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Criador é obrigatório']
    },
    ativo: {
      type: Boolean,
      default: true
    },
    prioridade: {
      type: String,
      enum: ['baixa', 'normal', 'alta'],
      default: 'normal'
    },
    dataExpiracao: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Índices para otimização de busca
AnnouncementSchema.index({ tipo: 1, ativo: 1 });
AnnouncementSchema.index({ cursosAlvo: 1 });
AnnouncementSchema.index({ createdAt: -1 });

// Método para verificar se o aviso está expirado
AnnouncementSchema.methods.isExpired = function(): boolean {
  if (!this.dataExpiracao) return false;
  return new Date() > this.dataExpiracao;
};

// Pre-find middleware para filtrar avisos expirados automaticamente (opcional)
AnnouncementSchema.pre('find', function() {
  // Não aplica filtro automático - deixa o controller decidir
});

export default mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
