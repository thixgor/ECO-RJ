import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const showAdminToken = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-rj');
    console.log('Conectado ao MongoDB\n');

    const adminEmail = 'contato@cursodeecocardiografia.com';
    const admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      console.log('Usuário administrador não encontrado!');
      process.exit(1);
    }

    console.log('=== CREDENCIAIS DO ADMINISTRADOR ===');
    console.log(`Email: ${admin.email}`);
    console.log(`Nome: ${admin.nomeCompleto}`);
    console.log(`Cargo: ${admin.cargo}`);
    console.log(`Token de Recuperação: ${admin.tokenRecuperacao || 'NÃO CONFIGURADO'}`);
    console.log(`Ativo: ${admin.ativo ? 'Sim' : 'Não'}`);
    console.log(`Último Login: ${admin.ultimoLogin || 'Nunca'}`);
    console.log('=====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
};

showAdminToken();
