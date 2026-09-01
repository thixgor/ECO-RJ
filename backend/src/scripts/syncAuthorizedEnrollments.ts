/**
 * Sincroniza autorização ⇄ matrícula.
 *
 * Antes, autorizar um aluno em um curso pelo admin não o inscrevia: ele ficava
 * em `curso.alunosAutorizados` mas fora de `user.cursosInscritos`. O acesso ao
 * conteúdo já funciona pela autorização, mas o curso não aparecia em
 * "Meus Cursos" nem no progresso.
 *
 * Este script faz a inscrição desses alunos, uma única vez, para os dados
 * antigos. Rodar com:  npx tsx src/scripts/syncAuthorizedEnrollments.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from '../models/Course';
import User from '../models/User';

dotenv.config();

const syncAuthorizedEnrollments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-rj');
    console.log('Conectado ao MongoDB');

    const cursos = await Course.find({ 'alunosAutorizados.0': { $exists: true } }).select(
      'titulo alunosAutorizados'
    );

    console.log(`Cursos com alunos autorizados: ${cursos.length}`);

    let inscricoesCriadas = 0;

    for (const curso of cursos) {
      const resultado = await User.updateMany(
        { _id: { $in: curso.alunosAutorizados }, cursosInscritos: { $ne: curso._id } },
        { $addToSet: { cursosInscritos: curso._id } }
      );

      if (resultado.modifiedCount > 0) {
        console.log(`  ${curso.titulo}: ${resultado.modifiedCount} aluno(s) inscrito(s)`);
        inscricoesCriadas += resultado.modifiedCount;
      }
    }

    console.log(`\nSincronização concluída! Inscrições criadas: ${inscricoesCriadas}`);
    process.exit(0);
  } catch (error) {
    console.error('Erro na sincronização:', error);
    process.exit(1);
  }
};

syncAuthorizedEnrollments();
