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
/**
 * Garante que um índice único seja SPARSE (permite múltiplos documentos sem o campo).
 * Necessário porque CPF e CRM deixaram de ser obrigatórios no cadastro: usuários
 * sem esses campos gerariam colisão de chave `null` em índices únicos não-sparse.
 * Se existir um índice antigo não-sparse, ele é derrubado e recriado como sparse.
 */
const ensureSparseUniqueIndex = async (
  collection: any,
  field: string,
  indexName: string
) => {
  try {
    const indexes = await collection.indexes();
    const existing = indexes.find((idx: any) => idx.name === indexName);
    if (existing && (!existing.sparse || !existing.unique)) {
      // Índice antigo não é sparse/único — recriar
      await collection.dropIndex(indexName);
      console.log(`♻️  Índice ${indexName} recriado como único + sparse`);
    }
    await collection.createIndex({ [field]: 1 }, { unique: true, sparse: true, name: indexName });
  } catch (err: any) {
    console.error(`⚠️  Não foi possível ajustar o índice ${indexName}:`, err?.message || err);
  }
};

export const createDatabaseIndexes = async () => {
  try {
    console.log('🔍 Criando índices no banco de dados...');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    // CPF e CRM agora são opcionais → índices únicos precisam ser SPARSE
    await ensureSparseUniqueIndex(User.collection, 'cpf', 'cpf_1');
    await ensureSparseUniqueIndex(User.collection, 'crm', 'crm_1');
    await User.collection.createIndex({ cargo: 1 });
    await User.collection.createIndex({ tipoUsuario: 1 });
    await User.collection.createIndex({ estado: 1 });
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
