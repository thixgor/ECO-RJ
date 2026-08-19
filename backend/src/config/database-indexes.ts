import User from '../models/User';
import Course from '../models/Course';
import Lesson from '../models/Lesson';
import Exercise from '../models/Exercise';
import SerialKey from '../models/SerialKey';
import ForumTopic from '../models/ForumTopic';
import CourseTopic from '../models/CourseTopic';

/**
 * Garante que um índice único ignore documentos sem o campo (ou com valor nulo/vazio).
 *
 * Necessário porque CPF e CRM deixaram de ser obrigatórios no cadastro: usuários
 * sem esses campos colidiriam na chave `null` de um índice único comum — foi o que
 * gerava "Este CPF já está vinculado a outra conta" em todo cadastro novo.
 *
 * Usa `partialFilterExpression` em vez de `sparse` porque um índice sparse ainda
 * indexa documentos que gravaram o campo explicitamente como `null` — e nesse caso
 * a colisão de `null` volta a acontecer. O índice parcial só considera strings.
 *
 * Antes de criar o índice, valores `null`/`''` remanescentes são removidos dos
 * documentos, para que a criação não falhe por duplicidade.
 */
const ensureOptionalUniqueIndex = async (
  collection: any,
  field: string,
  indexName: string
) => {
  const desiredFilter = { [field]: { $type: 'string' } };

  try {
    // 1) Limpa valores nulos/vazios gravados explicitamente (não afeta campos ausentes)
    const cleanup = await collection.updateMany(
      { $or: [{ [field]: { $type: 'null' } }, { [field]: '' }] },
      { $unset: { [field]: '' } }
    );
    if (cleanup?.modifiedCount) {
      console.log(`🧹 ${cleanup.modifiedCount} documento(s) tiveram o campo "${field}" vazio removido`);
    }

    // 2) Verifica se o índice atual já é do formato desejado
    const indexes = await collection.indexes();
    const existing = indexes.find((idx: any) => idx.name === indexName);
    const jaCorreto =
      existing &&
      existing.unique === true &&
      JSON.stringify(existing.partialFilterExpression || null) === JSON.stringify(desiredFilter);

    if (jaCorreto) return;

    if (existing) {
      await collection.dropIndex(indexName);
    }

    await collection.createIndex(
      { [field]: 1 },
      { unique: true, name: indexName, partialFilterExpression: desiredFilter }
    );
    console.log(`♻️  Índice ${indexName} recriado como único + parcial (apenas valores preenchidos)`);
  } catch (err: any) {
    console.error(`⚠️  Não foi possível ajustar o índice ${indexName}:`, err?.message || err);
    throw err;
  }
};

/**
 * Migração crítica de índices da coleção de usuários.
 *
 * Roda a cada cold start (via connectDB) porque no Vercel o servidor é serverless
 * e `app.listen` — onde `createDatabaseIndexes` era chamado — nunca é executado em
 * produção. Sem isso, índices antigos (CPF/CRM obrigatórios) continuavam no banco
 * e quebravam todos os cadastros novos.
 *
 * O resultado fica em cache por processo: só o primeiro request de cada instância
 * paga o custo da verificação.
 */
let userIndexesPromise: Promise<void> | null = null;

export const ensureCriticalUserIndexes = async (force = false): Promise<void> => {
  if (force) userIndexesPromise = null;

  if (!userIndexesPromise) {
    userIndexesPromise = (async () => {
      await ensureOptionalUniqueIndex(User.collection, 'cpf', 'cpf_1');
      await ensureOptionalUniqueIndex(User.collection, 'crm', 'crm_1');
    })().catch((err) => {
      // Permite nova tentativa no próximo request em vez de travar em um erro transitório
      userIndexesPromise = null;
      console.error('⚠️  Falha ao migrar índices de usuários:', err?.message || err);
    });
  }

  return userIndexesPromise;
};

/**
 * Cria índices no MongoDB para melhorar performance de queries
 */
export const createDatabaseIndexes = async () => {
  try {
    console.log('🔍 Criando índices no banco de dados...');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    // CPF e CRM agora são opcionais → índices únicos precisam ignorar valores ausentes
    await ensureCriticalUserIndexes(true);
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
