import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser extends Document {
  email: string;
  password: string;
  nomeCompleto: string;
  cpf: string;
  crm: string;
  crmLocal: string;
  dataNascimento: Date;
  especialidade?: string;
  cargo: 'Visitante' | 'Aluno' | 'Instrutor' | 'Administrador';
  fotoPerfil?: string;
  bio?: string;
  cursosInscritos: mongoose.Types.ObjectId[];
  aulasAssistidas: mongoose.Types.ObjectId[];
  exerciciosRespondidos: mongoose.Types.ObjectId[];
  serialKeysUsadas: mongoose.Types.ObjectId[];
  emailConfirmado: boolean;
  ultimoLogin?: Date;
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
      type: String,
      required: [true, 'CPF é obrigatório'],
      unique: true,
      trim: true
    },
    crm: {
      type: String,
      required: [true, 'CRM é obrigatório'],
      unique: true,
      trim: true
    },
    crmLocal: {
      type: String,
      required: [true, 'Local do CRM (UF) é obrigatório'],
      uppercase: true,
      trim: true
    },
    dataNascimento: {
      type: Date,
      required: [true, 'Data de nascimento é obrigatória']
    },
    especialidade: {
      type: String,
      trim: true
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

export default mongoose.model<IUser>('User', UserSchema);
