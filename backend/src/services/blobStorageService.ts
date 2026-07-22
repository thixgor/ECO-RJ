import { IMaterialConteudo } from '../models/Material';

/**
 * Serviço de storage de arquivos dos materiais.
 *
 * PREPARADO PARA O VERCEL BLOB (ainda NÃO aplicado).
 * -------------------------------------------------------------------------
 * Hoje os arquivos são referenciados por uma URL direta (`arquivoUrl`) que o
 * admin informa ao cadastrar o material. Quando o Vercel Blob for aplicado,
 * basta:
 *   1. Definir a env `BLOB_READ_WRITE_TOKEN` (token do Vercel Blob).
 *   2. Instalar o pacote `@vercel/blob`.
 *   3. Implementar `uploadFile` (put) e `getSignedUrl` (URL assinada/temporária)
 *      usando `blobKey`.
 *
 * Toda a aplicação já consome estas funções, então a migração para o Blob
 * fica isolada aqui — nenhuma outra parte do código precisa mudar.
 */

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Resolve a URL de download de um conteúdo de arquivo.
 *
 * - Se houver `blobKey` e o Blob estiver configurado, retornaria uma URL
 *   assinada/temporária (a implementar quando o Blob for aplicado).
 * - Caso contrário, usa a `arquivoUrl` direta cadastrada pelo admin.
 *
 * Retorna null quando não há arquivo disponível.
 */
export async function getSignedUrl(conteudo: IMaterialConteudo): Promise<string | null> {
  // TODO (Vercel Blob): quando aplicado, gerar URL assinada a partir de blobKey.
  // Ex.:
  //   if (conteudo.blobKey && isBlobConfigured()) {
  //     const { getDownloadUrl } = await import('@vercel/blob');
  //     return getDownloadUrl(conteudo.blobKey);
  //   }
  if (conteudo.arquivoUrl && conteudo.arquivoUrl.trim()) {
    return conteudo.arquivoUrl.trim();
  }
  if (conteudo.blobKey && conteudo.blobKey.trim()) {
    // Sem Blob aplicado ainda: a blobKey pode já ser uma URL pública.
    return conteudo.blobKey.trim();
  }
  return null;
}

/**
 * Upload de um arquivo para o storage (a implementar com o Vercel Blob).
 * Enquanto o Blob não está aplicado, lança um erro orientando o admin a
 * cadastrar os materiais via URL direta.
 */
export async function uploadFile(
  _fileName: string,
  _data: Buffer | Uint8Array,
  _contentType?: string
): Promise<{ url: string; blobKey: string }> {
  // TODO (Vercel Blob):
  //   const { put } = await import('@vercel/blob');
  //   const blob = await put(_fileName, _data, { access: 'public', contentType: _contentType });
  //   return { url: blob.url, blobKey: blob.pathname };
  throw new Error(
    'Upload de arquivos ainda não configurado (Vercel Blob pendente). ' +
    'Cadastre o material informando a URL direta do arquivo.'
  );
}
