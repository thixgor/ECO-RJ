import mongoose, { Document, Schema } from 'mongoose';

// Interface para botões personalizados
export interface ICustomButton {
  nome: string;
  icone: string;
  url: string;
}

// Interface para participantes
export interface IParticipant {
  nome: string;
  cargo?: string;
}

export interface ILesson extends Document {
  titulo: string;
  descricao?: string; // Opcional
  tipo: 'ao_vivo' | 'gravada' | 'material';
  embedVideo?: string;
  dataHoraInicio?: Date;
  duracao?: number;
  cargosPermitidos: string[];
  cursoId: mongoose.Types.ObjectId;
  topicoId?: mongoose.Types.ObjectId; // Tópico dentro do curso (opcional)
  subtopicoId?: mongoose.Types.ObjectId; // Subtópico dentro do tópico (opcional)
  notasAula?: string;
  status: 'ativa' | 'inativa' | 'expirada';
  ordem: number;
  // Novos campos
  professor?: string;
  participantes: IParticipant[];
  botoesPersonalizados: ICustomButton[];
  criadorId: mongoose.Types.ObjectId;
  // Exercícios e provas anexados
  exerciciosAnexados: mongoose.Types.ObjectId[];
  provasAnexadas: mongoose.Types.ObjectId[];
  // Integração opcional com Zoom
  zoomMeetingId?: string;
  zoomMeetingPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomButtonSchema = new Schema({
  nome: {
    type: String,
    required: true
  },
  icone: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  }
}, { _id: false });

const ParticipantSchema = new Schema({
  nome: {
    type: String,
    required: true
  },
  cargo: {
    type: String
  }
}, { _id: false });

const LessonSchema = new Schema<ILesson>(
  {
    titulo: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true
    },
    descricao: {
      type: String,
      trim: true
      // Não é mais obrigatória
    },
    tipo: {
      type: String,
      enum: ['ao_vivo', 'gravada', 'material'],
      required: [true, 'Tipo é obrigatório']
    },
    embedVideo: {
      type: String
      // Não é mais obrigatório
    },
    dataHoraInicio: {
      type: Date
    },
    duracao: {
      type: Number
      // Não é mais obrigatório - será calculado automaticamente se houver embed
    },
    cargosPermitidos: [{
      type: String,
      enum: ['Visitante', 'Aluno', 'Instrutor', 'Administrador']
    }],
    cursoId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Curso é obrigatório']
    },
    topicoId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseTopic'
      // Opcional - aulas podem estar fora de tópicos
    },
    subtopicoId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseSubtopic'
      // Opcional - aulas podem estar diretamente no tópico ou em subtópicos
    },
    notasAula: {
      type: String
    },
    status: {
      type: String,
      enum: ['ativa', 'inativa', 'expirada'],
      default: 'ativa'
    },
    ordem: {
      type: Number,
      default: 0
    },
    professor: {
      type: String
    },
    participantes: [ParticipantSchema],
    botoesPersonalizados: [CustomButtonSchema],
    criadorId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    exerciciosAnexados: [{
      type: Schema.Types.ObjectId,
      ref: 'Exercise'
    }],
    provasAnexadas: [{
      type: Schema.Types.ObjectId,
      ref: 'Exam'
    }],
    zoomMeetingId: {
      type: String,
      trim: true
      // Opcional - ID da reunião Zoom (9-11 dígitos)
    },
    zoomMeetingPassword: {
      type: String,
      trim: true
      // Opcional - senha da reunião Zoom
    }
  },
  {
    timestamps: true
  }
);

// Auto-update status for live lessons
LessonSchema.pre('save', function (next) {
  if (this.tipo === 'ao_vivo' && this.dataHoraInicio && this.duracao) {
    const now = new Date();
    const lessonEnd = new Date(this.dataHoraInicio.getTime() + this.duracao * 60000);
    if (now > lessonEnd) {
      this.status = 'expirada';
    }
  }
  next();
});

export default mongoose.model<ILesson>('Lesson', LessonSchema);
