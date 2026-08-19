import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUltimaAulaAssistida {
  lessonId: mongoose.Types.ObjectId;
  cursoId: mongoose.Types.ObjectId;
  assistidaEm: Date;
  progresso?: number; // Video progress percentage (0-100)
  savedTimestamp?: number; // Video timestamp in seconds where user stopped
}

export type TipoUsuario = 'Médico' | 'Residente' | 'Acadêmico de Medicina';

export interface IUser extends Document {
  email: string;
  password: string;
  nomeCompleto: string;
  cpf?: string; // Não é mais coletado no cadastro. Vinculado ao CPF da compra (checkout) para watermark.
  estado?: string; // UF selecionada no cadastro
  tipoUsuario?: TipoUsuario; // Médico | Residente | Acadêmico de Medicina
  // Campos de Médico
  crm?: string;
  crmLocal?: string;
  especialidade?: string;
  // Campos de Residente
  areaResidencia?: string;
  hospital?: string;
  anoResidencia?: string; // R1, R2, R3...
  semestreResidencia?: string; // 1º semestre / 2º semestre
  // Campos de Acadêmico
  instituicao?: string;
  periodo?: string; // 1º Período ... 12º Período
  dataNascimento?: Date;
  cargo: 'Visitante' | 'Aluno' | 'Instrutor' | 'Administrador';
  fotoPerfil?: string;
  bio?: string;
  cursosInscritos: mongoose.Types.ObjectId[];
  aulasAssistidas: mongoose.Types.ObjectId[];
  exerciciosRespondidos: mongoose.Types.ObjectId[];
  serialKeysUsadas: mongoose.Types.ObjectId[];
  emailConfirmado: boolean;
  ultimoLogin?: Date;
  ultimaAulaAssistida?: IUltimaAulaAssistida;
  ipsAcesso: string[];
  ativo: boolean;
  tokenRecuperacao?: string; // Token único para recuperação de senha (gerado automaticamente)
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: [6, 'Senha deve ter no mínimo 6 caracteres']
    },
    nomeCompleto: {
      type: String,
      required: [true, 'Nome completo é obrigatório'],
      trim: true
    },
    cpf: {
      // Não coletado no cadastro; preenchido a partir do CPF da compra (checkout).
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    estado: {
      type: String,
      uppercase: true,
      trim: true
    },
    tipoUsuario: {
      type: String,
      enum: ['Médico', 'Residente', 'Acadêmico de Medicina']
    },
    // Médico
    crm: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    crmLocal: {
      type: String,
      uppercase: true,
      trim: true
    },
    especialidade: {
      type: String,
      trim: true
    },
    // Residente
    areaResidencia: {
      type: String,
      trim: true
    },
    hospital: {
      type: String,
      trim: true
    },
    anoResidencia: {
      type: String,
      trim: true
    },
    semestreResidencia: {
      type: String,
      trim: true
    },
    // Acadêmico
    instituicao: {
      type: String,
      trim: true
    },
    periodo: {
      type: String,
      trim: true
    },
    dataNascimento: {
      type: Date
    },
    cargo: {
      type: String,
      enum: ['Visitante', 'Aluno', 'Instrutor', 'Administrador'],
      default: 'Visitante'
    },
    fotoPerfil: {
      type: String
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio deve ter no máximo 500 caracteres']
    },
    cursosInscritos: [{
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }],
    aulasAssistidas: [{
      type: Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    exerciciosRespondidos: [{
      type: Schema.Types.ObjectId,
      ref: 'ExerciseAnswer'
    }],
    serialKeysUsadas: [{
      type: Schema.Types.ObjectId,
      ref: 'SerialKey'
    }],
    emailConfirmado: {
      type: Boolean,
      default: false
    },
    ultimoLogin: {
      type: Date
    },
    ultimaAulaAssistida: {
      lessonId: {
        type: Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      cursoId: {
        type: Schema.Types.ObjectId,
        ref: 'Course'
      },
      assistidaEm: {
        type: Date
      },
      progresso: {
        type: Number,
        min: 0,
        max: 100
      },
      savedTimestamp: {
        type: Number,
        min: 0
      }
    },
    ipsAcesso: [{
      type: String
    }],
    ativo: {
      type: Boolean,
      default: true
    },
    tokenRecuperacao: {
      type: String,
      unique: true,
      sparse: true // Permite múltiplos documentos sem este campo durante migração
    }
  },
  {
    timestamps: true
  }
);

// Generate recovery token if not exists
UserSchema.pre('save', async function (next) {
  // Gerar token de recuperação se não existir
  if (!this.tokenRecuperacao) {
    this.tokenRecuperacao = crypto.randomBytes(24).toString('hex').toUpperCase();
  }
  next();
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};


/*
 * Índices declarados NO SCHEMA de propósito.
 *
 * `createDatabaseIndexes()` (config/database-indexes.ts) só roda dentro de
 * `app.listen`, que nunca é executado na Vercel — em produção a aplicação é
 * serverless. Estes índices, portanto, nunca chegavam ao banco de produção e as
 * consultas abaixo varriam a coleção inteira. Declarados aqui, o Mongoose os
 * cria sozinho no primeiro uso do model, em qualquer forma de hospedagem.
 */
// Filtros e estatísticas do painel administrativo
UserSchema.index({ cargo: 1 });
UserSchema.index({ tipoUsuario: 1 });
UserSchema.index({ estado: 1 });
UserSchema.index({ ativo: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ ultimoLogin: -1 });
// "Meus cursos" e a busca por alunos de um curso
UserSchema.index({ cursosInscritos: 1 });

export default mongoose.model<IUser>('User', UserSchema);
