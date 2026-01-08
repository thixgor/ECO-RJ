import User from '../models/User';
import Course from '../models/Course';
import Lesson from '../models/Lesson';
import Exercise from '../models/Exercise';
import SerialKey from '../models/SerialKey';
import ForumTopic from '../models/ForumTopic';
import CourseTopic from '../models/CourseTopic';

/**
 * Cria índices no MongoDB para melhorar performance de queries
 */
export const createDatabaseIndexes = async () => {
  try {
    console.log('🔍 Criando índices no banco de dados...');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ cpf: 1 });
    await User.collection.createIndex({ cargo: 1 });
    await User.collection.createIndex({ ativo: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ cursosInscritos: 1 });

    // Course indexes
    await Course.collection.createIndex({ ativo: 1 });
    await Course.collection.createIndex({ acessoRestrito: 1 });
    await Course.collection.createIndex({ dataInicio: -1 });
    await Course.collection.createIndex({ ordem: 1 });
    await Course.collection.createIndex({ alunosAutorizados: 1 });

    // Lesson indexes
    await Lesson.collection.createIndex({ cursoId: 1, ordem: 1 });
    await Lesson.collection.createIndex({ cursoId: 1, topicoId: 1, ordem: 1 });
    await Lesson.collection.createIndex({ tipo: 1 });
    await Lesson.collection.createIndex({ status: 1 });
    await Lesson.collection.createIndex({ createdAt: -1 });

    // CourseTopic indexes
    await CourseTopic.collection.createIndex({ cursoId: 1, ordem: 1 });
    await CourseTopic.collection.createIndex({ ativo: 1 });

    // Exercise indexes
    await Exercise.collection.createIndex({ aulaId: 1 });
    await Exercise.collection.createIndex({ tipo: 1 });
    await Exercise.collection.createIndex({ createdAt: -1 });

    // SerialKey indexes
    await SerialKey.collection.createIndex({ chave: 1 }, { unique: true });
    await SerialKey.collection.createIndex({ status: 1 });
    await SerialKey.collection.createIndex({ cargoAtribuido: 1 });
    await SerialKey.collection.createIndex({ usadaPor: 1 });
    await SerialKey.collection.createIndex({ validade: 1 });
    await SerialKey.collection.createIndex({ cursoRestrito: 1 });

    // ForumTopic indexes
    await ForumTopic.collection.createIndex({ cursoId: 1 });
    await ForumTopic.collection.createIndex({ autor: 1 });
    await ForumTopic.collection.createIndex({ fixado: -1, createdAt: -1 });
    await ForumTopic.collection.createIndex({ createdAt: -1 });

    console.log('✅ Índices criados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    // Não vamos lançar erro para não impedir a aplicação de iniciar
  }
};
