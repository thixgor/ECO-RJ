import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Role from '../models/Role';

dotenv.config();

const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-rj');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed basic roles if they don't exist
    const roleCount = await Role.countDocuments();
    if (roleCount === 0) {
      console.log('Seeding initial roles...');
      const roles = [
        { nome: 'Visitante', descricao: 'Acesso limitado', permissoes: { visualizarAulas: false, usarForum: false, acessarAdmin: false } },
        { nome: 'Aluno', descricao: 'Acesso total', permissoes: { visualizarAulas: true, usarForum: true, acessarAdmin: false } },
        { nome: 'Instrutor', descricao: 'Pode criar conteúdo', permissoes: { visualizarAulas: true, criarAulas: true, usarForum: true, acessarAdmin: false } },
        { nome: 'Administrador', descricao: 'Acesso total', permissoes: { visualizarAulas: true, criarAulas: true, usarForum: true, acessarAdmin: true } }
      ];
      await Role.insertMany(roles);
    }

    // Auto-seed admin user if it doesn't exist
    const adminEmail = (process.env.ADMIN_EMAIL || 'contato@cursodeecocardiografia.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log(`Creating initial admin user: ${adminEmail}`);

      await User.create({
        email: adminEmail,
        password: adminPassword,
        nomeCompleto: 'Administrador ECO RJ',
        cpf: '000.000.000-00',
        crm: '000000',
        crmLocal: 'RJ',
        dataNascimento: new Date('1980-01-01'),
        cargo: 'Administrador',
        emailConfirmado: true,
        ativo: true
      });
    }

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDB;
