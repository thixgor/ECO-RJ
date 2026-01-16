import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course';

dotenv.config();

const migrateCourseTipo = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-rj');
    console.log('Conectado ao MongoDB');

    // Buscar cursos sem o campo 'tipo' definido
    const cursosParaMigrar = await Course.find({
      $or: [
        { tipo: { $exists: false } },
        { tipo: null },
        { tipo: '' }
      ]
    });

    console.log(`Encontrados ${cursosParaMigrar.length} cursos para migrar`);

    if (cursosParaMigrar.length === 0) {
      console.log('Nenhum curso precisa de migração.');
      process.exit(0);
    }

    // Atualizar todos os cursos para tipo 'online'
    const resultado = await Course.updateMany(
      {
        $or: [
          { tipo: { $exists: false } },
          { tipo: null },
          { tipo: '' }
        ]
      },
      { $set: { tipo: 'online' } }
    );

    console.log(`\nMigração concluída!`);
    console.log(`Cursos atualizados: ${resultado.modifiedCount}`);
    console.log(`Todos os cursos existentes foram definidos como 'online'`);

    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
};

migrateCourseTipo();
