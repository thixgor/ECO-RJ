import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from '../models/User';

dotenv.config();

// Gerar token de recuperação de senha
const generateRecoveryToken = (): string => {
  return crypto.randomBytes(24).toString('hex').toUpperCase();
};

const fixAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-rj');
    console.log('Conectado ao MongoDB');

    const adminEmail = 'contato@cursodeecocardiografia.com';
    const admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      console.log('Usuário administrador não encontrado!');
      process.exit(1);
    }

    // Verificar se já tem tokenRecuperacao
    if (!admin.tokenRecuperacao) {
      const tokenRecuperacao = generateRecoveryToken();
      admin.tokenRecuperacao = tokenRecuperacao;
      await admin.save();
      console.log(`\nToken de recuperação adicionado ao usuário admin:`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Token de Recuperação: ${tokenRecuperacao}`);
      console.log(`\nSalve este token em um lugar seguro!`);
    } else {
      console.log(`\nUsuário admin já possui token de recuperação.`);
      console.log(`Email: ${adminEmail}`);
    }

    console.log('\nCorreção concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao corrigir usuário admin:', error);
    process.exit(1);
  }
};

fixAdminUser();
