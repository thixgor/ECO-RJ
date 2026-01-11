import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Role from '../models/Role';

dotenv.config();

// Gerar token de recuperação de senha (único e permanente)
const generateRecoveryToken = (): string => {
  return crypto.randomBytes(24).toString('hex').toUpperCase();
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-rj');
    console.log('Conectado ao MongoDB');

    // Criar cargos padrão
    const roles = [
      {
        nome: 'Visitante',
        descricao: 'Acesso limitado - apenas informações públicas',
        permissoes: {
          visualizarAulas: false,
          criarAulas: false,
          editarAulas: false,
          deletarAulas: false,
          responderExercicios: false,
          criarExercicios: false,
          usarForum: false,
          moderarForum: false,
          acessarAdmin: false
        }
      },
      {
        nome: 'Aluno',
        descricao: 'Acesso total a aulas, exercícios e fórum',
        permissoes: {
          visualizarAulas: true,
          criarAulas: false,
          editarAulas: false,
          deletarAulas: false,
          responderExercicios: true,
          criarExercicios: false,
          usarForum: true,
          moderarForum: false,
          acessarAdmin: false
        }
      },
      {
        nome: 'Instrutor',
        descricao: 'Pode criar aulas e responder no fórum',
        permissoes: {
          visualizarAulas: true,
          criarAulas: true,
          editarAulas: true,
          deletarAulas: false,
          responderExercicios: true,
          criarExercicios: true,
          usarForum: true,
          moderarForum: false,
          acessarAdmin: false
        }
      },
      {
        nome: 'Administrador',
        descricao: 'Acesso total ao sistema',
        permissoes: {
          visualizarAulas: true,
          criarAulas: true,
          editarAulas: true,
          deletarAulas: true,
          responderExercicios: true,
          criarExercicios: true,
          usarForum: true,
          moderarForum: true,
          acessarAdmin: true
        }
      }
    ];

    for (const role of roles) {
      const existing = await Role.findOne({ nome: role.nome });
      if (!existing) {
        await Role.create(role);
        console.log(`Cargo "${role.nome}" criado`);
      } else {
        console.log(`Cargo "${role.nome}" já existe`);
      }
    }

    // Criar usuário administrador
    const adminEmail = process.env.ADMIN_EMAIL || 'contato@cursodeecocardiografia.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const tokenRecuperacao = generateRecoveryToken();
      await User.create({
        email: adminEmail,
        password: adminPassword,
        nomeCompleto: 'Administrador ECO RJ',
        cpf: '00000000000',
        crm: '000000RJ',
        crmLocal: 'RJ',
        dataNascimento: new Date('1980-01-01'),
        especialidade: 'Cardiologia',
        cargo: 'Administrador',
        emailConfirmado: true,
        ativo: true,
        tokenRecuperacao
      });
      console.log(`\nUsuário administrador criado:`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Senha: ${adminPassword}`);
      console.log(`Token de Recuperação: ${tokenRecuperacao}`);
    } else {
      console.log(`\nUsuário administrador já existe: ${adminEmail}`);
    }

    console.log('\nSeed concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exit(1);
  }
};

seedDatabase();
